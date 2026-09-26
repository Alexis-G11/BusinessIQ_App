import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    method: Mapped[str] = mapped_column(String, nullable=False)  # cash|bank|card|mobile_money|other
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    direction: Mapped[str] = mapped_column(String, nullable=False)  # "in" (customer paid us) | "out" (we paid supplier/expense)
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PaymentAllocation(Base):
    """Links a payment to what it actually paid for — a sale, purchase, or expense."""
    __tablename__ = "payment_allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"))
    reference_type: Mapped[str] = mapped_column(String, nullable=False)  # "sale" | "purchase" | "expense"
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)