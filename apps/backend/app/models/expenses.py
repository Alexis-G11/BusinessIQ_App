import uuid
from datetime import datetime, date
from sqlalchemy import CheckConstraint, DateTime, Date, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"
    __table_args__ = (
        Index(
            "uq_expense_categories_org_name",
            "organization_id",
            text("lower(name)"),
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Rent", "Payroll", "Supplies"


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        UniqueConstraint("organization_id", "idempotency_key", name="uq_expenses_org_idempotency"),
        CheckConstraint(
            "amount_cents > 0 AND amount_paid_cents >= 0 AND amount_paid_cents <= amount_cents",
            name="ck_expenses_amounts",
        ),
        CheckConstraint(
            "amount_paid_cents = amount_cents OR supplier_id IS NOT NULL",
            name="ck_expenses_credit_supplier",
        ),
        Index("ix_expenses_org_date", "organization_id", "incurred_at"),
        Index("ix_expenses_org_supplier", "organization_id", "supplier_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("expense_categories.id"), nullable=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    incurred_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
