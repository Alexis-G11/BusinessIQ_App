import uuid
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user
from app.models.user import OrganizationUser


async def get_current_organization_id(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    result = await db.execute(
        select(OrganizationUser.organization_id).where(
            OrganizationUser.user_id == user["user_id"]
        )
    )
    org_id = result.scalars().first()
    if not org_id:
        raise HTTPException(404, "User does not belong to any organization")
    return org_id