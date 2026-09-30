import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.supabase_client import supabase_public
from app.auth import get_current_user
from app.dependencies.org import get_current_organization_id
from app.models.organization import Organization
from app.models.user import User, OrganizationUser
from app.services.accounting.chart_of_accounts_service import seed_default_chart_of_accounts
from app.schemas.auth import SignUpRequest, MeResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/signup", status_code=201)
async def signup(payload: SignUpRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = supabase_public.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
        })
    except Exception as e:
        raise HTTPException(400, str(e))

    if not result.user:
        raise HTTPException(400, "Sign up failed")

    supabase_user_id = uuid.UUID(result.user.id)

    org = Organization(
        name=payload.business_name,
        industry=payload.industry,
        business_size=payload.business_size,
        currency=payload.currency,
        timezone=payload.timezone,
        subscription_status="trialing",
        trial_ends_at=datetime.utcnow() + timedelta(days=3),
    )
    db.add(org)
    await db.flush()

    user = User(
        id=supabase_user_id,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        email=payload.email,
    )
    db.add(user)

    db.add(OrganizationUser(organization_id=org.id, user_id=supabase_user_id, is_owner=True))
    await db.flush()

    await seed_default_chart_of_accounts(db, org.id)
    await db.commit()

    return {"message": "Check your email to confirm your account."}


@router.get("/me", response_model=MeResponse)
async def me(
    user: dict = Depends(get_current_user),
    org_id: uuid.UUID = Depends(get_current_organization_id),
    db: AsyncSession = Depends(get_db),
):
    db_user = await db.get(User, uuid.UUID(user["user_id"]))
    org = await db.get(Organization, org_id)
    if not db_user or not org:
        raise HTTPException(404, "User or organization not found")
    return {"user": db_user, "organization": org}