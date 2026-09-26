import uuid
from datetime import datetime, date
from sqlalchemy import String, ForeignKey, DateTime, Integer, Date, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Rent", "Payroll", "Supplies"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"))
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("expense_categories.id"), nullable=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("suppliers.id"), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    incurred_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)