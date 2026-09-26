import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, ForeignKey, DateTime, Date, Text, Numeric, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint("organization_id", "account_code", name="uq_account_code_per_org"),
        CheckConstraint(
            "account_type in ('asset','liability','equity','revenue','cost_of_goods_sold','expense','other_income','other_expense')",
            name="ck_account_type_valid",
        ),
        CheckConstraint("normal_balance in ('debit','credit')", name="ck_normal_balance_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    account_code: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    account_type: Mapped[str] = mapped_column(String, nullable=False)
    parent_account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"), nullable=True)
    normal_balance: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_system_account: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    __table_args__ = (
        CheckConstraint("status in ('draft','posted','voided')", name="ck_journal_status_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    entry_number: Mapped[str] = mapped_column(String, nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    source_type: Mapped[str] = mapped_column(String, nullable=True)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")
    posted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    posted_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class JournalLine(Base):
    __tablename__ = "journal_lines"
    __table_args__ = (
        CheckConstraint("debit >= 0", name="ck_debit_nonnegative"),
        CheckConstraint("credit >= 0", name="ck_credit_nonnegative"),
        CheckConstraint("not (debit > 0 and credit > 0)", name="ck_line_not_both_debit_and_credit"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    journal_entry_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("journal_entries.id"))
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    debit: Mapped[Decimal] = mapped_column(Numeric(19, 4), default=0)
    credit: Mapped[Decimal] = mapped_column(Numeric(19, 4), default=0)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("customers.id"), nullable=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)