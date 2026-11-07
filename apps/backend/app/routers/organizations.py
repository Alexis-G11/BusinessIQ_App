import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.organization import Organization
from app.models.role import Role, UserRole
from app.models.trial_decision import OrganizationTrialDecision
from app.models.user import OrganizationUser, User
from app.schemas.organizations import OrganizationCreate, OrganizationMembershipOut
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts
from app.subscriptions import trial_expiry

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])
logger = logging.getLogger(__name__)


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
            .where(OrganizationUser.user_id == user.id)
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
