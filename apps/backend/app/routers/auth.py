import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import AuthPayload, get_auth_payload
from app.database import get_db
from app.models.organization import Organization
from app.models.role import Role, UserRole
from app.models.trial_decision import OrganizationTrialDecision
from app.models.user import OrganizationUser, PhoneTrialClaim, User
from app.permissions import OrgContext, get_org_context
from app.subscriptions import trial_expiry
from app.schemas.auth import (
    MeResponse,
    PhoneVerificationRequest,
    SignUpRequest,
    UpdateUserRequest,
    UserOut,
)
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts
from app.supabase_client import supabase_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

SIGNUP_MESSAGE = {"message": "Account created. You can sign in now."}

_USER_ID_FOREIGN_KEYS = text(
    """
    SELECT child_ns.nspname AS schema_name, child.relname AS table_name,
           child_column.attname AS column_name
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS parent ON parent.oid = constraint_row.confrelid
    JOIN pg_namespace AS parent_ns ON parent_ns.oid = parent.relnamespace
    JOIN pg_class AS child ON child.oid = constraint_row.conrelid
    JOIN pg_namespace AS child_ns ON child_ns.oid = child.relnamespace
    JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY
         AS child_key(attribute_number, key_position) ON true
    JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY
         AS parent_key(attribute_number, key_position)
         ON parent_key.key_position = child_key.key_position
    JOIN pg_attribute AS child_column
         ON child_column.attrelid = child.oid
        AND child_column.attnum = child_key.attribute_number
    JOIN pg_attribute AS parent_column
         ON parent_column.attrelid = parent.oid
        AND parent_column.attnum = parent_key.attribute_number
    WHERE constraint_row.contype = 'f'
      AND parent_ns.nspname = 'public'
      AND child_ns.nspname = 'public'
      AND parent.relname = 'users'
      AND parent_column.attname = 'id'
    ORDER BY child_ns.nspname, child.relname, child_column.attname
    """
)


def _utc_now_naive() -> datetime:
    # Our columns are "timestamp without time zone", so store UTC without tzinfo.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _find_supabase_user_by_email(email: str):
    page = 1
    while True:
        users = supabase_admin.auth.admin.list_users(page=page, per_page=1000)
        for user in users:
            if (user.email or "").lower() == email:
                return user
        if len(users) < 1000:
            return None
        page += 1


def _create_confirmed_supabase_user(email: str, password: str, full_name: str, phone_number: str):
    return supabase_admin.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": full_name,
                "phone_number": phone_number,
            },
        }
    )


async def _relink_user_id(db: AsyncSession, user: User, new_user_id: uuid.UUID) -> None:
    references = (await db.execute(_USER_ID_FOREIGN_KEYS)).all()
    preparer = db.get_bind().dialect.identifier_preparer

    old_user_id = user.id
    email = user.email
    user.email = f"relink-{old_user_id.hex}@invalid.businessiq.local"
    await db.flush()

    replacement = User(
        id=new_user_id,
        full_name=user.full_name,
        phone_number=user.phone_number,
        pending_phone_number=user.pending_phone_number,
        phone_verified_at=user.phone_verified_at,
        email=email,
        created_at=user.created_at,
    )
    db.add(replacement)
    await db.flush()

    for schema_name, table_name, column_name in references:
        table = f"{preparer.quote_schema(schema_name)}.{preparer.quote(table_name)}"
        column = preparer.quote(column_name)
        await db.execute(
            text(f"UPDATE {table} SET {column} = :new_id WHERE {column} = :old_id"),
            {"new_id": new_user_id, "old_id": old_user_id},
        )

    await db.delete(user)
    await db.flush()


@router.post("/signup", status_code=201)
async def signup(payload: SignUpRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()

    # 1. Check OUR prerequisites first, so a failure here leaves no login behind.
    owner_role = await db.scalar(select(Role).where(Role.name == "owner"))
    if owner_role is None:
        logger.error("Role 'owner' is missing: run  python -m scripts.seed_roles")
        raise HTTPException(status_code=503, detail="Sign-up is temporarily unavailable")
    existing_user = await db.scalar(
        select(User).where(func.lower(User.email) == email).with_for_update()
    )
    if existing_user is not None:
        try:
            existing_auth_user = await run_in_threadpool(_find_supabase_user_by_email, email)
        except Exception as exc:
            logger.warning("Could not check Supabase Auth during account recovery: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="Sign-up is temporarily unavailable")

        if existing_auth_user is not None:
            if existing_auth_user.email_confirmed_at is not None:
                return SIGNUP_MESSAGE
            raise HTTPException(
                status_code=409,
                detail="An account already exists for this email. Sign in or reset its password.",
            )

        try:
            result = await run_in_threadpool(
                _create_confirmed_supabase_user,
                email,
                payload.password,
                payload.full_name.strip(),
                payload.phone_number,
            )
        except Exception as exc:
            logger.warning("Supabase user creation failed: %s", type(exc).__name__)
            raise HTTPException(
                status_code=400, detail="Could not create the account. Check your details and try again."
            )
        if result.user is None:
            raise HTTPException(status_code=400, detail="Could not create the account.")
        return SIGNUP_MESSAGE

    # 2. Create a confirmed login so email delivery is not required during testing.
    try:
        result = await run_in_threadpool(
            _create_confirmed_supabase_user,
            email,
            payload.password,
            payload.full_name.strip(),
            payload.phone_number,
        )
    except Exception as exc:
        logger.warning("Supabase user creation failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=400, detail="Could not create the account. Check your details and try again."
        )

    supa_user = result.user
    if supa_user is None:
        raise HTTPException(status_code=400, detail="Could not create the account.")
    supabase_user_id = uuid.UUID(supa_user.id)

    # 3. Create everything on our side in ONE transaction.
    try:
        org = Organization(
            name=payload.business_name.strip(),
            industry=payload.industry,
            business_size=payload.business_size,
            country=payload.country,
            currency=payload.currency,
            timezone=payload.timezone,
            subscription_status="pending_verification",
            trial_ends_at=None,
        )
        user = User(
            id=supabase_user_id,  # same ID as the Supabase login
            full_name=payload.full_name.strip(),
            pending_phone_number=payload.phone_number,
            email=email,
        )
        db.add_all([org, user])
        await db.flush()

        db.add(OrganizationUser(organization_id=org.id, user_id=user.id, is_owner=True))
        db.add(UserRole(user_id=user.id, organization_id=org.id, role_id=owner_role.id))
        await db.flush()

        # This function calls commit(), which saves everything above in one go.
        await seed_default_chart_of_accounts(db, org.id)
    except Exception:
        await db.rollback()
        logger.exception("Sign-up database step failed; removing the Supabase login")
        try:
            await run_in_threadpool(supabase_admin.auth.admin.delete_user, str(supabase_user_id))
        except Exception:
            logger.exception("Could not remove orphan Supabase user %s", supabase_user_id)
        raise HTTPException(status_code=500, detail="Could not complete sign-up. Please try again.")

    return SIGNUP_MESSAGE


@router.post("/complete-signup")
async def complete_signup(
    payload: AuthPayload = Depends(get_auth_payload),
    db: AsyncSession = Depends(get_db),
):
    try:
        auth_response = await run_in_threadpool(
            supabase_admin.auth.admin.get_user_by_id,
            str(payload.user_id),
        )
    except Exception as exc:
        logger.warning("Could not verify Supabase Auth during account setup: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Account setup is temporarily unavailable")

    auth_user = auth_response.user
    if auth_user is None or not auth_user.email:
        raise HTTPException(status_code=403, detail="Account setup is not complete")
    if payload.email and payload.email.lower() != auth_user.email.lower():
        raise HTTPException(status_code=403, detail="Account setup is not complete")

    user = await db.scalar(select(User).where(User.id == payload.user_id))
    if user is not None:
        if user.email.lower() != auth_user.email.lower():
            raise HTTPException(status_code=403, detail="Account setup is not complete")
        return {
            "ready": user.phone_verified,
            "phone_number": user.phone_number or user.pending_phone_number,
        }

    existing_user = await db.scalar(
        select(User)
        .where(func.lower(User.email) == auth_user.email.lower())
        .with_for_update()
    )
    if existing_user is None:
        raise HTTPException(status_code=403, detail="Account setup is not complete")
    if existing_user.id == payload.user_id:
        return {
            "ready": existing_user.phone_verified,
            "phone_number": existing_user.phone_number or existing_user.pending_phone_number,
        }
    if existing_user.email.lower() != auth_user.email.lower():
        raise HTTPException(status_code=403, detail="Account setup is not complete")

    try:
        await _relink_user_id(db, existing_user, payload.user_id)
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Could not link the confirmed Supabase account to its BusinessIQ records")
        raise HTTPException(status_code=500, detail="Could not complete account setup. Please try again.")

    linked_user = await db.get(User, payload.user_id)
    if linked_user is None:
        raise HTTPException(status_code=500, detail="Could not complete account setup. Please try again.")
    return {
        "ready": linked_user.phone_verified,
        "phone_number": linked_user.phone_number or linked_user.pending_phone_number,
    }


@router.post("/phone-verification/complete")
async def complete_phone_verification(
    payload: PhoneVerificationRequest,
    auth_payload: AuthPayload = Depends(get_auth_payload),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(
        select(User).where(User.id == auth_payload.user_id).with_for_update()
    )
    if user is None:
        raise HTTPException(status_code=403, detail="Complete account setup before verifying your phone")

    try:
        auth_response = await run_in_threadpool(
            supabase_admin.auth.admin.get_user_by_id,
            str(auth_payload.user_id),
        )
    except Exception as exc:
        logger.warning("Could not verify Supabase phone status: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Phone verification is temporarily unavailable")

    auth_user = auth_response.user
    if (
        auth_user is None
        or auth_user.email_confirmed_at is None
        or (auth_user.email or "").lower() != user.email.lower()
        or auth_user.phone_confirmed_at is None
        or auth_user.phone != payload.phone_number
    ):
        raise HTTPException(status_code=403, detail="Verify this phone number before continuing")

    phone_claim = await db.scalar(
        select(PhoneTrialClaim)
        .where(PhoneTrialClaim.phone_number == payload.phone_number)
        .with_for_update()
    )
    user_claim = await db.scalar(
        select(PhoneTrialClaim)
        .where(PhoneTrialClaim.user_id == user.id)
        .with_for_update()
    )
    if phone_claim is not None and phone_claim.user_id != user.id:
        raise HTTPException(status_code=409, detail="This phone number has already been used to claim a trial")
    if user_claim is not None and user_claim.phone_number != payload.phone_number:
        raise HTTPException(status_code=409, detail="This account has already claimed a trial with another phone number")

    user.phone_number = payload.phone_number
    user.pending_phone_number = None
    user.phone_verified_at = user.phone_verified_at or _utc_now_naive()
    if phone_claim is None:
        db.add(PhoneTrialClaim(phone_number=payload.phone_number, user_id=user.id))

    member_organization_ids = (
        await db.execute(
            select(OrganizationUser.organization_id)
            .where(OrganizationUser.user_id == user.id)
            .order_by(OrganizationUser.organization_id)
        )
    ).scalars().all()
    if not member_organization_ids:
        raise HTTPException(status_code=403, detail="Account setup is not complete")

    owner_organization_ids = (
        await db.execute(
            select(OrganizationUser.organization_id)
            .where(
                OrganizationUser.user_id == user.id,
                OrganizationUser.is_owner.is_(True),
            )
            .order_by(OrganizationUser.organization_id)
        )
    ).scalars().all()

    organizations = (
        await db.execute(
            select(Organization)
            .where(Organization.id.in_(owner_organization_ids))
            .order_by(Organization.id)
            .with_for_update()
        )
    ).scalars().all()
    now = _utc_now_naive()
    for organization in organizations:
        if organization.subscription_status in {"pending_verification", "trialing"} and organization.trial_ends_at is None:
            organization.subscription_status = "trialing"
            organization.trial_started_at = now
            organization.trial_ends_at = trial_expiry(now)
            db.add(
                OrganizationTrialDecision(
                    organization_id=organization.id,
                    decided_by_user_id=user.id,
                    decision="eligible",
                    decision_reason="verified_phone_owner",
                    abuse_signals=[],
                    decided_at=now,
                    trial_started_at=now,
                    trial_ends_at=organization.trial_ends_at,
                )
            )

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        logger.info("Phone verification rejected because the phone is already assigned")
        raise HTTPException(status_code=409, detail="This phone number is already associated with another account") from exc

    return {"ready": True}


@router.get("/me", response_model=MeResponse)
async def me(ctx: OrgContext = Depends(get_org_context), db: AsyncSession = Depends(get_db)):
    """Who am I, and which business am I acting in?"""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"user": ctx.user, "organization": org, "is_owner": ctx.is_owner}


@router.get("/profile", response_model=UserOut)
async def get_profile(user: User = Depends(get_current_user)):
    """Return identity data without requiring a selected business context."""
    return user


@router.patch("/profile", response_model=UserOut)
async def update_profile(
    payload: UpdateUserRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if "full_name" in payload.model_fields_set and payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/me", response_model=MeResponse)
async def update_me(
    payload: UpdateUserRequest,
    ctx: OrgContext = Depends(get_org_context),
    db: AsyncSession = Depends(get_db),
):
    if "full_name" in payload.model_fields_set and payload.full_name is not None:
        ctx.user.full_name = payload.full_name.strip()
    await db.commit()
    await db.refresh(ctx.user)
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"user": ctx.user, "organization": org, "is_owner": ctx.is_owner}
