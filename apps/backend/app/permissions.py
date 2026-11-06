import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.role import Permission, RolePermission, UserRole
from app.models.user import OrganizationUser, User


@dataclass(frozen=True)
class OrgContext:
    """Everything a route needs to know: who is calling, for which business, and what they may do."""
    user: User
    organization_id: uuid.UUID
    is_owner: bool
    permissions: frozenset[str]

    def can(self, code: str) -> bool:
        # Owners can do everything in their own business.
        return self.is_owner or code in self.permissions


async def get_org_context(
    x_organization_id: str | None = Header(default=None),  # read from the "X-Organization-Id" header
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrgContext:
    """Dependency: work out which business this request is for and what the user may do in it."""
    # 1. Every business this user belongs to.
    result = await db.execute(
        select(OrganizationUser).where(OrganizationUser.user_id == user.id)
    )
    memberships = result.scalars().all()

    # 2. Pick the business.
    if x_organization_id:
        try:
            wanted = uuid.UUID(x_organization_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="X-Organization-Id is not a valid ID")
        membership = next((m for m in memberships if m.organization_id == wanted), None)
        if membership is None:
            # Same message whether the business exists or not: don't reveal which IDs are real.
            raise HTTPException(status_code=403, detail="You do not belong to this business")
    elif len(memberships) == 1:
        membership = memberships[0]
    elif not memberships:
        raise HTTPException(status_code=403, detail="You do not belong to any business")
    else:
        raise HTTPException(status_code=400, detail="X-Organization-Id header is required")

    # 3. The permission codes this user holds in THAT business (through their role there).
    result = await db.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(
            UserRole.user_id == user.id,
            UserRole.organization_id == membership.organization_id,
        )
    )
    codes = frozenset(result.scalars().all())

    return OrgContext(
        user=user,
        organization_id=membership.organization_id,
        is_owner=membership.is_owner,
        permissions=codes,
    )


def require_permission(code: str):
    """Build a dependency that rejects the request unless the user holds this permission."""

    async def checker(
        ctx: OrgContext = Depends(get_org_context),
    ) -> OrgContext:
        if not ctx.can(code):
            raise HTTPException(status_code=403, detail="You do not have permission to do this")
        return ctx

    return checker