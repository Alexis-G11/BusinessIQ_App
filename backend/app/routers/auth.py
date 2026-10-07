import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.organization import Organization
from app.models.role import Role, UserRole
from app.models.user import OrganizationUser, User
from app.permissions import OrgContext, get_org_context
from app.schemas.auth import MeResponse, SignUpRequest
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts
from app.supabase_client import supabase_admin, supabase_public

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

TRIAL_DAYS = 3
SIGNUP_MESSAGE = {"message": "Check your email to confirm your account."}


def _utc_now_naive() -> datetime:
    # Our columns are "timestamp without time zone", so store UTC without tzinfo.
    return datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/signup", status_code=201)
async def signup(payload: SignUpRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower()

    # 1. Check OUR prerequisites first, so a failure here leaves no login behind.
    owner_role = await db.scalar(select(Role).where(Role.name == "owner"))
    if owner_role is None:
        logger.error("Role 'owner' is missing: run  python -m scripts.seed_roles")
        raise HTTPException(status_code=503, detail="Sign-up is temporarily unavailable")
    if await db.scalar(select(User.id).where(User.email == email)) is not None:
        return SIGNUP_MESSAGE  # same answer as success: never reveal which emails exist

    # 2. Create the login in Supabase (this also sends the confirmation email).
    try:
        result = await run_in_threadpool(
            supabase_public.auth.sign_up, {"email": email, "password": payload.password}
        )
    except Exception as exc:
        logger.warning("Supabase sign_up failed: %s", exc)
        raise HTTPException(
            status_code=400, detail="Could not create the account. Check your details and try again."
        )

    supa_user = result.user
    if supa_user is None:
        raise HTTPException(status_code=400, detail="Could not create the account.")
    if not supa_user.identities:
        # Supabase's way of saying "this email is already registered". Nothing to create.
        return SIGNUP_MESSAGE
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
            subscription_status="trialing",
            trial_ends_at=_utc_now_naive() + timedelta(days=TRIAL_DAYS),
        )
        user = User(
            id=supabase_user_id,  # same ID as the Supabase login
            full_name=payload.full_name.strip(),
            phone_number=payload.phone_number,
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


@router.get("/me", response_model=MeResponse)
async def me(ctx: OrgContext = Depends(get_org_context), db: AsyncSession = Depends(get_db)):
    """Who am I, and which business am I acting in?"""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"user": ctx.user, "organization": org}