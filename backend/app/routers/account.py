from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import AuthPayload, get_auth_payload, get_current_user
from app.database import get_db
from app.models.organization import Organization
from app.models.role import Role, UserRole
from app.models.user import OrganizationUser, User
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts

router = APIRouter(tags=["account"])


class BusinessIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    business_type: Literal["retail", "restaurant", "services", "wholesale", "other"] = "retail"
    country: str | None = Field(default=None, min_length=2, max_length=2)
    currency: str = Field(default="usd", min_length=3, max_length=3)
    timezone: str = "UTC"

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError, OSError):
            raise ValueError("Unknown timezone")
        return v

    @field_validator("currency")
    @classmethod
    def _currency(cls, v: str) -> str:
        if not v.isalpha():
            raise ValueError("currency must be 3 letters")
        return v.lower()

    @field_validator("country")
    @classmethod
    def _country(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.isalpha():
            raise ValueError("country must be a 2-letter code")
        return v.upper()


class OnboardingIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str | None = Field(default=None, max_length=32)
    business: BusinessIn


class OnboardingOut(BaseModel):
    user_id: uuid.UUID
    organization_id: uuid.UUID


@router.post("/onboarding", response_model=OnboardingOut, status_code=201)
async def onboarding(
    body: OnboardingIn,
    payload: AuthPayload = Depends(get_auth_payload),  # token only: no users row exists yet
    db: AsyncSession = Depends(get_db),
):
    """Finish sign-up: create our user row, their business, ownership and the chart of accounts."""
    if not payload.email:
        raise HTTPException(status_code=400, detail="Your account has no email address")
    email = payload.email.lower()

    if await db.get(User, payload.user_id) is not None:
        raise HTTPException(status_code=409, detail="Account setup was already completed")
    if await db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="This email is already registered")

    owner_role = await db.scalar(select(Role).where(Role.name == "owner"))
    if owner_role is None:
        raise HTTPException(status_code=500, detail="Roles are not set up on the server")

    user = User(
        id=payload.user_id,  # same ID as the Supabase Auth user
        full_name=body.full_name.strip(),
        phone_number=body.phone_number,
        email=email,
    )
    org = Organization(**body.business.model_dump())
    db.add_all([user, org])
    await db.flush()

    db.add(OrganizationUser(organization_id=org.id, user_id=user.id, is_owner=True))
    db.add(UserRole(user_id=user.id, organization_id=org.id, role_id=owner_role.id))
    await db.flush()

    # This service function calls commit(), which saves everything above in ONE transaction.
    await seed_default_chart_of_accounts(db, org.id)

    return OnboardingOut(user_id=user.id, organization_id=org.id)


@router.get("/me")
async def me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Who am I, and which businesses do I belong to?"""
    rows = (
        await db.execute(
            select(Organization, OrganizationUser.is_owner)
            .join(OrganizationUser, OrganizationUser.organization_id == Organization.id)
            .where(OrganizationUser.user_id == user.id)
        )
    ).all()
    return {
        "user": {"id": str(user.id), "email": user.email, "full_name": user.full_name},
        "organizations": [
            {"id": str(o.id), "name": o.name, "currency": o.currency, "is_owner": is_owner}
            for o, is_owner in rows
        ],
    }