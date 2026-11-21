import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OrganizationAuditEvent(Base):
    """Immutable, tenant-scoped record of a consequential business action."""
    __tablename__ = "organization_audit_events"
    __table_args__ = (
        CheckConstraint("length(trim(action)) > 0", name="ck_organization_audit_events_action_nonempty"),
        CheckConstraint("length(trim(target_type)) > 0", name="ck_organization_audit_events_target_nonempty"),
        Index("ix_organization_audit_events_tenant_time", "organization_id", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="RESTRICT"))
    actor_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    target_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID, nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
