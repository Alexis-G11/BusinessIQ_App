import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import BigInteger, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.inventory import InventoryTransaction
from app.models.product import Product
from app.permissions import OrgContext, require_permission

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])

Reason = Literal["count_correction", "damaged", "expired", "lost", "found", "other"]


class AdjustmentIn(BaseModel):
    product_id: uuid.UUID
    quantity_change: int | None = None  # +5 adds stock, -3 removes stock
    counted_quantity: int | None = Field(default=None, ge=0)  # "I counted 20": the system works out the change
    reason: Reason
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _exactly_one_way(self):
        if (self.quantity_change is None) == (self.counted_quantity is None):
            raise ValueError("Send exactly one of quantity_change or counted_quantity")
        if self.quantity_change == 0:
            raise ValueError("quantity_change cannot be 0")
        return self


class MovementOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    movement_type: str
    quantity_change: int
    resulting_quantity: int
    reason: str | None
    note: str | None
    reference_type: str | None
    reference_id: uuid.UUID | None
    created_by: uuid.UUID | None
    created_at: datetime


class InventorySummary(BaseModel):
    active_products: int
    units_in_stock: int
    inventory_value_cents: int
    out_of_stock: int
    low_stock: int
    valuation_method: str


def _to_out(m: InventoryTransaction, product_name: str) -> MovementOut:
    return MovementOut(
        id=m.id,
        product_id=m.product_id,
        product_name=product_name,
        movement_type=m.movement_type,
        quantity_change=m.quantity_change,
        resulting_quantity=m.resulting_quantity,
        reason=m.reason,
        note=m.note,
        reference_type=m.reference_type,
        reference_id=m.reference_id,
        created_by=m.created_by,
        created_at=m.created_at,
    )


@router.get("/summary", response_model=InventorySummary)
async def inventory_summary(
    ctx: OrgContext = Depends(require_permission("inventory.view")),
    db: AsyncSession = Depends(get_db),
):
    """Stock totals. Value uses the product's current cost price ("latest cost" method)."""
    value = cast(Product.stock_quantity, BigInteger) * cast(Product.cost_price_cents, BigInteger)
    row = (
        await db.execute(
            select(
                func.count(Product.id),
                func.coalesce(func.sum(Product.stock_quantity), 0),
                func.coalesce(func.sum(value), 0),
                func.count(Product.id).filter(Product.stock_quantity <= 0),
                func.count(Product.id).filter(
                    (Product.stock_quantity > 0) & (Product.stock_quantity <= Product.reorder_level)
                ),
            ).where(Product.organization_id == ctx.organization_id, Product.is_active.is_(True))
        )
    ).one()
    return InventorySummary(
        active_products=int(row[0]),
        units_in_stock=int(row[1]),
        inventory_value_cents=int(row[2]),
        out_of_stock=int(row[3]),
        low_stock=int(row[4]),
        valuation_method="latest_cost",
    )


@router.get("/movements", response_model=list[MovementOut])
async def list_movements(
    product_id: uuid.UUID | None = None,
    movement_type: str | None = Query(default=None, max_length=32),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: OrgContext = Depends(require_permission("inventory.view")),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(InventoryTransaction, Product.name)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .where(
            InventoryTransaction.organization_id == ctx.organization_id,
            Product.organization_id == ctx.organization_id,
        )
    )
    if product_id is not None:
        stmt = stmt.where(InventoryTransaction.product_id == product_id)
    if movement_type:
        stmt = stmt.where(InventoryTransaction.movement_type == movement_type)
    stmt = stmt.order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.id).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    return [_to_out(m, name) for m, name in rows]


@router.post("/adjustments", response_model=MovementOut, status_code=201)
async def create_adjustment(
    body: AdjustmentIn,
    ctx: OrgContext = Depends(require_permission("inventory.adjust")),
    db: AsyncSession = Depends(get_db),
):
    # FOR UPDATE locks this product row until we commit, so two simultaneous
    # adjustments cannot both read the same old stock level.
    product = await db.scalar(
        select(Product)
        .where(Product.id == body.product_id, Product.organization_id == ctx.organization_id)
        .with_for_update()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.is_active:
        raise HTTPException(status_code=409, detail="This product is archived")

    current = product.stock_quantity or 0
    change = body.quantity_change if body.quantity_change is not None else body.counted_quantity - current
    if change == 0:
        raise HTTPException(status_code=422, detail="Counted quantity matches current stock: nothing to adjust")
    new_quantity = current + change
    if new_quantity < 0:
        raise HTTPException(status_code=422, detail="This adjustment would make stock negative")

    product.stock_quantity = new_quantity
    movement = InventoryTransaction(
        organization_id=ctx.organization_id,
        product_id=product.id,
        movement_type="adjustment",
        quantity_change=change,
        resulting_quantity=new_quantity,
        reason=body.reason,
        note=body.note,
        created_by=ctx.user.id,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return _to_out(movement, product.name)
