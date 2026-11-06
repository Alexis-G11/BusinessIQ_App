import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.supplier import Supplier
from app.permissions import OrgContext, require_permission

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])


class _SupplierFields(BaseModel):
    """Shared input rules. Blank strings from forms become None (empty)."""

    @field_validator("contact_name", "phone", "email", "address", mode="before", check_fields=False)
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


class SupplierCreate(_SupplierFields):
    name: str = Field(min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=300)


class SupplierUpdate(_SupplierFields):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=300)


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    contact_name: str | None
    phone: str | None
    email: str | None
    address: str | None
    created_at: datetime


async def _get_supplier(db: AsyncSession, org_id: uuid.UUID, supplier_id: uuid.UUID) -> Supplier:
    supplier = await db.scalar(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.organization_id == org_id)
    )
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


async def _check_name_free(db: AsyncSession, org_id: uuid.UUID, name: str, exclude_id=None) -> None:
    stmt = select(Supplier.id).where(
        Supplier.organization_id == org_id,
        func.lower(Supplier.name) == name.lower(),
    )
    if exclude_id is not None:
        stmt = stmt.where(Supplier.id != exclude_id)
    if await db.scalar(stmt) is not None:
        raise HTTPException(status_code=409, detail="A supplier with this name already exists")


@router.get("", response_model=list[SupplierOut])
async def list_suppliers(
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("suppliers.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Supplier).where(Supplier.organization_id == ctx.organization_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Supplier.name.ilike(like),
                Supplier.contact_name.ilike(like),
                Supplier.phone.ilike(like),
                Supplier.email.ilike(like),
            )
        )
    stmt = stmt.order_by(Supplier.name).limit(limit).offset(offset)
    return (await db.execute(stmt)).scalars().all()


@router.post("", response_model=SupplierOut, status_code=201)
async def create_supplier(
    body: SupplierCreate,
    ctx: OrgContext = Depends(require_permission("suppliers.manage")),
    db: AsyncSession = Depends(get_db),
):
    await _check_name_free(db, ctx.organization_id, body.name)
    supplier = Supplier(organization_id=ctx.organization_id, **body.model_dump())
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("suppliers.view")),
    db: AsyncSession = Depends(get_db),
):
    return await _get_supplier(db, ctx.organization_id, supplier_id)


@router.patch("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: uuid.UUID,
    body: SupplierUpdate,
    ctx: OrgContext = Depends(require_permission("suppliers.manage")),
    db: AsyncSession = Depends(get_db),
):
    supplier = await _get_supplier(db, ctx.organization_id, supplier_id)
    values = body.model_dump(exclude_unset=True)  # only what the caller sent

    if "name" in values:
        if values["name"] is None:
            raise HTTPException(status_code=422, detail="name cannot be null")
        await _check_name_free(db, ctx.organization_id, values["name"], exclude_id=supplier.id)

    for key, value in values.items():
        setattr(supplier, key, value)
    await db.commit()
    await db.refresh(supplier)
    return supplier