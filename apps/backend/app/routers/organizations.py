import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.organization import Organization
from app.models.audit import OrganizationAuditEvent
from app.models.role import Role, UserRole
from app.models.trial_decision import OrganizationTrialDecision
from app.models.user import OrganizationMembershipEvent, OrganizationUser, User
from app.money import currency_exponent
from app.schemas.auth import OrganizationOut
from app.schemas.organizations import OrganizationCreate, OrganizationMembershipOut, OrganizationSettingsUpdate
from app.permissions import OrgContext, require_permission
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts
from app.subscriptions import trial_expiry

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])
logger = logging.getLogger(__name__)


@router.get("/settings", response_model=OrganizationOut)
async def get_organization_settings(
    ctx: OrgContext = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db),
):
    organization = await db.get(Organization, ctx.organization_id)
    if organization is None:
        raise HTTPException(status_code=404, detail="Business not found")
    return organization


@router.patch("/settings", response_model=OrganizationOut)
async def update_organization_settings(
    payload: OrganizationSettingsUpdate,
    ctx: OrgContext = Depends(require_permission("settings.manage")),
    db: AsyncSession = Depends(get_db),
):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one business setting to update")

    organization = await db.scalar(
        select(Organization)
        .where(Organization.id == ctx.organization_id)
        .with_for_update()
    )
    if organization is None:
        raise HTTPException(status_code=404, detail="Business not found")

    changed_fields = sorted(changes)
    if "address" in changes:
        address = changes.pop("address")
        organization.address = {"formatted": address} if address else None
    for field, value in changes.items():
        setattr(organization, field, str(value) if field == "email" and value is not None else value)

    db.add(OrganizationAuditEvent(
        organization_id=organization.id,
        actor_user_id=ctx.user.id,
        action="organization.settings.updated",
        target_type="organization",
        target_id=organization.id,
        details={"changed_fields": changed_fields},
    ))

    await db.commit()
    await db.refresh(organization)
    return organization


@router.get("", response_model=list[OrganizationMembershipOut])
async def list_organizations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List only organizations the authenticated user belongs to."""
    rows = (
        await db.execute(
            select(
                Organization,
                OrganizationUser.id,
                OrganizationUser.user_id,
                OrganizationUser.is_owner,
                Role.name,
            )
            .join(
                OrganizationUser,
                OrganizationUser.organization_id == Organization.id,
            )
            .outerjoin(
                UserRole,
                (UserRole.organization_id == Organization.id)
                & (UserRole.user_id == user.id),
            )
            .outerjoin(Role, Role.id == UserRole.role_id)
            .where(OrganizationUser.user_id == user.id, OrganizationUser.revoked_at.is_(None))
            .order_by(Organization.name, Organization.id)
        )
    ).all()
    return [
        {
            "organization": organization,
            "membership_id": membership_id,
            "user_id": user_id,
            "is_owner": is_owner,
            "role": role_name,
        }
        for organization, membership_id, user_id, is_owner, role_name in rows
    ]


@router.post("", response_model=OrganizationMembershipOut, status_code=201)
async def create_organization(
    payload: OrganizationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a tenant, owner membership, trial decision and default ledger atomically."""
    if not user.phone_verified:
        raise HTTPException(status_code=403, detail="Verify your phone before creating a business")

    owner_role = await db.scalar(select(Role).where(Role.name == "owner"))
    if owner_role is None:
        logger.error("Role 'owner' is missing: run python -m scripts.seed_roles")
        raise HTTPException(status_code=503, detail="Business creation is temporarily unavailable")

    started_at = datetime.now(timezone.utc).replace(tzinfo=None)
    organization = Organization(
        name=payload.name,
        legal_name=payload.legal_name,
        business_type=payload.business_type,
        industry=payload.industry,
        business_size=payload.business_size,
        country=payload.country,
        currency=payload.currency,
        currency_exponent=currency_exponent(payload.currency),
        timezone=payload.timezone,
        address={"formatted": payload.address} if payload.address else None,
        phone=payload.phone,
        email=str(payload.email) if payload.email else None,
        tax_identifier=payload.tax_identifier,
        fiscal_year_start=payload.fiscal_year_start,
        subscription_status="trialing",
        trial_started_at=started_at,
        trial_ends_at=trial_expiry(started_at),
    )
    membership = OrganizationUser(
        organization=organization,
        user_id=user.id,
        is_owner=True,
    )
    try:
        db.add_all([organization, membership])
        await db.flush()
        db.add(UserRole(user_id=user.id, organization_id=organization.id, role_id=owner_role.id))
        db.add(OrganizationMembershipEvent(
            organization_id=organization.id,
            membership_id=membership.id,
            actor_user_id=user.id,
            event_type="created",
            new_role_id=owner_role.id,
        ))
        db.add(OrganizationAuditEvent(
            organization_id=organization.id,
            actor_user_id=user.id,
            action="organization.created",
            target_type="organization",
            target_id=organization.id,
            details={"source": "additional_business_setup"},
        ))
        db.add(
            OrganizationTrialDecision(
                organization_id=organization.id,
                decided_by_user_id=user.id,
                decision="eligible",
                decision_reason="verified_phone_owner",
                abuse_signals=[],
                decided_at=started_at,
                trial_started_at=started_at,
                trial_ends_at=organization.trial_ends_at,
            )
        )
        await db.flush()
        # Keep the organization, membership, role, decision and seeded chart in
        # one transaction. The signup flow retains the service's default commit.
        await seed_default_chart_of_accounts(db, organization.id, commit=False)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.exception("Business creation failed for authenticated user %s", user.id)
        raise HTTPException(status_code=500, detail="Could not create the business. Please try again.") from exc

    return {
        "organization": organization,
        "membership_id": membership.id,
        "user_id": user.id,
        "is_owner": True,
        "role": owner_role.name,
    }
