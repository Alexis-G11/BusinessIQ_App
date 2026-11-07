import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OrganizationTrialDecision(Base):
    __tablename__ = "organization_trial_decisions"
    __table_args__ = (
        CheckConstraint("decision IN ('eligible', 'denied')", name="ck_trial_decisions_decision"),
        CheckConstraint("jsonb_typeof(abuse_signals) = 'array'", name="ck_trial_decisions_signals_array"),
        CheckConstraint(
            "trial_ends_at IS NULL OR trial_started_at IS NULL OR trial_ends_at >= trial_started_at",
            name="ck_trial_decisions_trial_window_order",
        ),
        Index("ix_trial_decisions_org_decided_at", "organization_id", "decided_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), nullable=False
    )
    decided_by_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    decision: Mapped[str] = mapped_column(String, nullable=False)
    decision_reason: Mapped[str] = mapped_column(String, nullable=False)
    abuse_signals: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    decided_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    trial_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
