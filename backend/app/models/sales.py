import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="completed")  # completed|refunded|voided
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # selling price at time of sale
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False)   # cost price at time of sale