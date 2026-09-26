import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    movement_type: Mapped[str] = mapped_column(String, nullable=False)  # purchase|sale|adjustment|return|opening_balance
    quantity_change: Mapped[int] = mapped_column(Integer, nullable=False)  # positive = stock in, negative = stock out
    resulting_quantity: Mapped[int] = mapped_column(Integer, nullable=False)  # stock level *after* this movement
    reference_type: Mapped[str] = mapped_column(String, nullable=True)  # "sale" | "purchase" | etc.
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=True)  # id of the sale/purchase that caused this
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)