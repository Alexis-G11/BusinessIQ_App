import uuid
from datetime import date, datetime
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("organization_id", "idempotency_key", name="uq_payments_org_idempotency"),
        CheckConstraint("amount_cents > 0 AND direction in ('in','out')", name="ck_payments_valid"),
        CheckConstraint("customer_id IS NULL OR supplier_id IS NULL", name="ck_payments_one_counterparty"),
        CheckConstraint(
            "(customer_id IS NULL OR direction = 'in') AND (supplier_id IS NULL OR direction = 'out')",
            name="ck_payments_counterparty_direction",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    method: Mapped[str] = mapped_column(String, nullable=False)  # cash|bank|card|mobile_money|other
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    direction: Mapped[str] = mapped_column(String, nullable=False)  # "in" (customer paid us) | "out" (we paid supplier/expense)
    payment_date: Mapped[date] = mapped_column(Date, default=date.today)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=True)  # unique per business, not globally
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PaymentAllocation(Base):
    """Links a payment to what it actually paid for — a sale, purchase, or expense."""
    __tablename__ = "payment_allocations"
    __table_args__ = (
        CheckConstraint("amount_cents > 0", name="ck_payment_allocations_amount"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"))
    reference_type: Mapped[str] = mapped_column(String, nullable=False)  # "sale" | "purchase" | "expense"
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
