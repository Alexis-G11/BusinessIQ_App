import uuid
from datetime import datetime, date
from sqlalchemy import CheckConstraint, String, DateTime, Date, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint(
            "trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at >= trial_started_at",
            name="ck_organizations_trial_window_order",
        ),
        CheckConstraint(
            "currency_exponent BETWEEN 0 AND 2",
            name="ck_organizations_currency_exponent",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    legal_name: Mapped[str] = mapped_column(String, nullable=True)
    business_type: Mapped[str] = mapped_column(String, nullable=True)  # sole_proprietor|llc|corporation|partnership|other
    industry: Mapped[str] = mapped_column(String, nullable=True)
    country: Mapped[str] = mapped_column(String, nullable=True)
    currency: Mapped[str] = mapped_column(String, default="usd")
    currency_exponent: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    timezone: Mapped[str] = mapped_column(String, default="UTC")
    tax_identifier: Mapped[str] = mapped_column(String, nullable=True)
    address: Mapped[dict] = mapped_column(JSONB, nullable=True)
    phone: Mapped[str] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, nullable=True)
    website: Mapped[str] = mapped_column(String, nullable=True)
    fiscal_year_start: Mapped[date] = mapped_column(Date, nullable=True)

    # Platform (SaaS) billing — the business owner pays BusinessIQ
    stripe_customer_id: Mapped[str] = mapped_column(String, nullable=True)
    
    subscription_status: Mapped[str] = mapped_column(String, default="trialing")
    trial_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    business_size: Mapped[str] = mapped_column(String, nullable=True)  # micro|small|medium
    tax_rate_bps: Mapped[int] = mapped_column(Integer, default=0) #sales tax in basis points: 800 = 8.00%
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization_users: Mapped[list["OrganizationUser"]] = relationship(back_populates="organization")
