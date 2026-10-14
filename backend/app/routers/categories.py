import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.product import Product, ProductCategory
from app.permissions import OrgContext, require_permission

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def _clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name cannot be blank")
        return v


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    product_count: int = 0


async def _get_category(db: AsyncSession, org_id: uuid.UUID, category_id: uuid.UUID) -> ProductCategory:
    category = await db.scalar(
        select(ProductCategory).where(
            ProductCategory.id == category_id, ProductCategory.organization_id == org_id
        )
    )
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


async def _check_name_free(db: AsyncSession, org_id: uuid.UUID, name: str, exclude_id=None) -> None:
    stmt = select(ProductCategory.id).where(
        ProductCategory.organization_id == org_id,
        func.lower(ProductCategory.name) == name.lower(),
    )
    if exclude_id is not None:
        stmt = stmt.where(ProductCategory.id != exclude_id)
    if await db.scalar(stmt) is not None:
        raise HTTPException(status_code=409, detail="A category with this name already exists")


async def _count_products(db: AsyncSession, org_id: uuid.UUID, category_id: uuid.UUID, active_only: bool) -> int:
    stmt = select(func.count(Product.id)).where(
        Product.organization_id == org_id, Product.category_id == category_id
    )
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    return await db.scalar(stmt) or 0


@router.get("", response_model=list[CategoryOut])
async def list_categories(
    ctx: OrgContext = Depends(require_permission("products.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(ProductCategory, func.count(Product.id))
        .outerjoin(
            Product,
            (Product.category_id == ProductCategory.id) & (Product.is_active.is_(True)),
        )
        .where(ProductCategory.organization_id == ctx.organization_id)
        .group_by(ProductCategory.id)
        .order_by(ProductCategory.name)
    )
    rows = (await db.execute(stmt)).all()
    return [CategoryOut(id=c.id, name=c.name, product_count=n) for c, n in rows]


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    body: CategoryIn,
    ctx: OrgContext = Depends(require_permission("products.manage")),
    db: AsyncSession = Depends(get_db),
):
    await _check_name_free(db, ctx.organization_id, body.name)
    category = ProductCategory(organization_id=ctx.organization_id, name=body.name)
    db.add(category)
    await db.commit()
    return CategoryOut(id=category.id, name=category.name, product_count=0)


@router.patch("/{category_id}", response_model=CategoryOut)
async def rename_category(
    category_id: uuid.UUID,
    body: CategoryIn,
    ctx: OrgContext = Depends(require_permission("products.manage")),
    db: AsyncSession = Depends(get_db),
):
    category = await _get_category(db, ctx.organization_id, category_id)
    await _check_name_free(db, ctx.organization_id, body.name, exclude_id=category.id)
    category.name = body.name
    await db.commit()
    count = await _count_products(db, ctx.organization_id, category.id, active_only=True)
    return CategoryOut(id=category.id, name=category.name, product_count=count)


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("products.manage")),
    db: AsyncSession = Depends(get_db),
):
    category = await _get_category(db, ctx.organization_id, category_id)
    # Refuse if ANY product (even archived) still points here: moving them is the owner's call.
    if await _count_products(db, ctx.organization_id, category.id, active_only=False) > 0:
        raise HTTPException(status_code=409, detail="This category still has products. Move them first.")
    await db.delete(category)
    await db.commit()