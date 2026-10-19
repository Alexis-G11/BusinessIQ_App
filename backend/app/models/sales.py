import uuid
from datetime import date, datetime
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Sale(Base):
    """One completed sale. Money fields are integer cents (see app/money.py).
    total_cents = subtotal_cents - discount_cents + tax_cents (enforced by the database)."""
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("organization_id", "reference", name="uq_sales_org_reference"),
        UniqueConstraint("organization_id", "idempotency_key", name="uq_sales_org_idempotency"),
        CheckConstraint("status in ('completed','refunded','voided')", name="ck_sales_status_valid"),
        CheckConstraint("payment_status in ('paid','partial','unpaid')", name="ck_sales_payment_status_valid"),
        CheckConstraint(
            "subtotal_cents >= 0 AND discount_cents >= 0 AND discount_cents <= subtotal_cents "
            "AND tax_cents >= 0 AND total_cents = subtotal_cents - discount_cents + tax_cents "
            "AND amount_paid_cents >= 0 AND amount_paid_cents <= total_cents",
            name="ck_sales_amounts",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=True)
    reference: Mapped[str] = mapped_column(String, nullable=True)  # receipt number, e.g. S-000001
    sale_date: Mapped[date] = mapped_column(Date, default=date.today)
    status: Mapped[str] = mapped_column(String, default="completed")  # completed|refunded|voided
    subtotal_cents: Mapped[int] = mapped_column(Integer, default=0)
    discount_cents: Mapped[int] = mapped_column(Integer, default=0)
    tax_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, default=0)
    payment_status: Mapped[str] = mapped_column(String, default="paid")  # paid|partial|unpaid
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=True)  # a retried request must not create a second sale
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0 AND unit_price_cents >= 0 AND unit_cost_cents >= 0", name="ck_sale_items_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales.id"))
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String, default="")  # name at time of sale, for receipts
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # selling price at time of sale
    unit_cost_cents: Mapped[int] = mapped_column(Integer, nullable=False)   # cost price at time of sale
