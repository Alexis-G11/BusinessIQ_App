import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="received")  # ordered|received|cancelled
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    purchase_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("purchases.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # what you paid, this time