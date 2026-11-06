import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.customer import Customer
from app.permissions import OrgContext, require_permission

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


class _CustomerFields(BaseModel):
    """Shared input rules. Blank strings from forms become None (empty)."""

    @field_validator("phone", "email", "address", "notes", mode="before", check_fields=False)
    @classmethod
    def _blank_to_none(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @field_validator("name", mode="before", check_fields=False)
    @classmethod
    def _strip_name(cls, v):
        return v.strip() if isinstance(v, str) else v


class CustomerCreate(_CustomerFields):
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=1000)


class CustomerUpdate(_CustomerFields):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=1000)


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    created_at: datetime


async def _get_customer(db: AsyncSession, org_id: uuid.UUID, customer_id: uuid.UUID) -> Customer:
    customer = await db.scalar(
        select(Customer).where(Customer.id == customer_id, Customer.organization_id == org_id)
    )
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


async def _check_phone_free(db: AsyncSession, org_id: uuid.UUID, phone: str | None, exclude_id=None) -> None:
    if not phone:
        return
    stmt = select(Customer.id).where(Customer.organization_id == org_id, Customer.phone == phone)
    if exclude_id is not None:
        stmt = stmt.where(Customer.id != exclude_id)
    if await db.scalar(stmt) is not None:
        raise HTTPException(status_code=409, detail="A customer with this phone number already exists")


@router.get("", response_model=list[CustomerOut])
async def list_customers(
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("customers.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Customer).where(Customer.organization_id == ctx.organization_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Customer.name.ilike(like), Customer.phone.ilike(like), Customer.email.ilike(like))
        )
    stmt = stmt.order_by(Customer.name).limit(limit).offset(offset)
    return (await db.execute(stmt)).scalars().all()


@router.post("", response_model=CustomerOut, status_code=201)
async def create_customer(
    body: CustomerCreate,
    ctx: OrgContext = Depends(require_permission("customers.manage")),
    db: AsyncSession = Depends(get_db),
):
    await _check_phone_free(db, ctx.organization_id, body.phone)
    customer = Customer(organization_id=ctx.organization_id, **body.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(
    customer_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("customers.view")),
    db: AsyncSession = Depends(get_db),
):
    return await _get_customer(db, ctx.organization_id, customer_id)


@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: uuid.UUID,
    body: CustomerUpdate,
    ctx: OrgContext = Depends(require_permission("customers.manage")),
    db: AsyncSession = Depends(get_db),
):
    customer = await _get_customer(db, ctx.organization_id, customer_id)
    values = body.model_dump(exclude_unset=True)  # only what the caller sent

    if "name" in values and values["name"] is None:
        raise HTTPException(status_code=422, detail="name cannot be null")
    if "phone" in values:
        await _check_phone_free(db, ctx.organization_id, values["phone"], exclude_id=customer.id)

    for key, value in values.items():
        setattr(customer, key, value)
    await db.commit()
    await db.refresh(customer)
    return customer