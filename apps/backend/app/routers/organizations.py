from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.organization import Organization
from app.models.role import Role, UserRole
from app.models.user import OrganizationUser, User
from app.schemas.organizations import OrganizationMembershipOut

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationMembershipOut])
async def list_organizations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List only organizations the authenticated user belongs to."""
    rows = (
        await db.execute(
            select(Organization, OrganizationUser.is_owner, Role.name)
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
            "is_owner": is_owner,
            "role": role_name,
        }
        for organization, is_owner, role_name in rows
    ]
