import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inventory import InventoryTransaction
from app.models.product import Product, ProductCategory
from app.models.supplier import Supplier
from app.permissions import OrgContext, require_permission

router = APIRouter(prefix="/api/v1/products", tags=["products"])

# Money is always stored as whole cents (integers): 1250 = 12.50. Never floats.


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    unit: str | None = Field(default=None, max_length=32)
    category_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    cost_price_cents: int = Field(default=0, ge=0)
    selling_price_cents: int = Field(ge=0)
    reorder_level: int = Field(default=5, ge=0)
    initial_stock: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    # No stock field on purpose: stock only changes through inventory movements.
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sku: str | None = Field(default=None, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    unit: str | None = Field(default=None, max_length=32)
    category_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    cost_price_cents: int | None = Field(default=None, ge=0)
    selling_price_cents: int | None = Field(default=None, ge=0)
    reorder_level: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sku: str | None
    barcode: str | None
    unit: str | None
    category_id: uuid.UUID | None
    supplier_id: uuid.UUID | None
    cost_price_cents: int
    selling_price_cents: int
    stock_quantity: int
    reorder_level: int
    is_active: bool


NON_NULLABLE = {"name", "selling_price_cents", "cost_price_cents", "reorder_level", "is_active"}


async def _check_refs(db: AsyncSession, org_id: uuid.UUID, category_id, supplier_id) -> None:
    """A product may only point at categories/suppliers of the SAME business."""
    if category_id is not None:
        found = await db.scalar(
            select(ProductCategory.id).where(
                ProductCategory.id == category_id, ProductCategory.organization_id == org_id
            )
        )
        if found is None:
            raise HTTPException(status_code=422, detail="category_id is not valid for this business")
    if supplier_id is not None:
        found = await db.scalar(
            select(Supplier.id).where(Supplier.id == supplier_id, Supplier.organization_id == org_id)
        )
        if found is None:
            raise HTTPException(status_code=422, detail="supplier_id is not valid for this business")


async def _check_sku_free(db: AsyncSession, org_id: uuid.UUID, sku: str | None, exclude_id=None) -> None:
    if not sku:
        return
    stmt = select(Product.id).where(Product.organization_id == org_id, Product.sku == sku)
    if exclude_id is not None:
        stmt = stmt.where(Product.id != exclude_id)
    if await db.scalar(stmt) is not None:
        raise HTTPException(status_code=409, detail="This SKU is already used by another product")


async def _get_product(db: AsyncSession, org_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = await db.scalar(
        select(Product).where(Product.id == product_id, Product.organization_id == org_id)
    )
    if product is None:
        # Same 404 whether the ID doesn't exist or belongs to another business.
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("", response_model=list[ProductOut])
async def list_products(
    q: str | None = Query(default=None, max_length=100),
    active_only: bool = True,
    low_stock: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("products.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Product).where(Product.organization_id == ctx.organization_id)
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.barcode.ilike(like))
        )
    if low_stock:
        stmt = stmt.where(Product.stock_quantity <= Product.reorder_level)
    stmt = stmt.order_by(Product.name).limit(limit).offset(offset)
    return (await db.execute(stmt)).scalars().all()


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    body: ProductCreate,
    ctx: OrgContext = Depends(require_permission("products.manage")),
    db: AsyncSession = Depends(get_db),
):
    await _check_refs(db, ctx.organization_id, body.category_id, body.supplier_id)
    await _check_sku_free(db, ctx.organization_id, body.sku)

    product = Product(
        organization_id=ctx.organization_id,
        stock_quantity=body.initial_stock,
        **body.model_dump(exclude={"initial_stock"}),
    )
    db.add(product)
    await db.flush()  # gives the product its ID

    if body.initial_stock > 0:
        db.add(
            InventoryTransaction(
                organization_id=ctx.organization_id,
                product_id=product.id,
                movement_type="opening_balance",
                quantity_change=body.initial_stock,
                resulting_quantity=body.initial_stock,
                reference_type="product",
                reference_id=product.id,
            )
        )
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("products.view")),
    db: AsyncSession = Depends(get_db),
):
    return await _get_product(db, ctx.organization_id, product_id)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    ctx: OrgContext = Depends(require_permission("products.manage")),
    db: AsyncSession = Depends(get_db),
):
    product = await _get_product(db, ctx.organization_id, product_id)
    values = body.model_dump(exclude_unset=True)  # only what the caller actually sent

    for key in NON_NULLABLE & values.keys():
        if values[key] is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")

    await _check_refs(db, ctx.organization_id, values.get("category_id"), values.get("supplier_id"))
    if "sku" in values:
        await _check_sku_free(db, ctx.organization_id, values["sku"], exclude_id=product.id)

    for key, value in values.items():
        setattr(product, key, value)
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
async def archive_product(
    product_id: uuid.UUID,
    ctx: OrgContext = Depends(require_permission("products.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Products are archived, never deleted: past sales still point at them."""
    product = await _get_product(db, ctx.organization_id, product_id)
    product.is_active = False
    await db.commit()