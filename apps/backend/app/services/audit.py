import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import OrganizationAuditEvent


def record_audit_event(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    action: str,
    target_type: str,
    target_id: uuid.UUID | None,
    details: dict[str, Any] | None = None,
) -> None:
    """Queue a low-PII audit event in the caller's database transaction."""
    db.add(OrganizationAuditEvent(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
    ))
