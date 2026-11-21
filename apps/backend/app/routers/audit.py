from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audit import OrganizationAuditEvent
from app.models.user import User
from app.permissions import OrgContext, require_permission
from app.schemas.audit import AuditEventOut


router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("/events", response_model=list[AuditEventOut])
async def list_audit_events(
    limit: int = Query(default=50, ge=1, le=100),
    ctx: OrgContext = Depends(require_permission("audit.view")),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        select(OrganizationAuditEvent, User.full_name)
        .join(User, User.id == OrganizationAuditEvent.actor_user_id)
        .where(OrganizationAuditEvent.organization_id == ctx.organization_id)
        .order_by(OrganizationAuditEvent.occurred_at.desc(), OrganizationAuditEvent.id.desc())
        .limit(limit)
    )
    return [
        AuditEventOut(
            id=event.id,
            organization_id=event.organization_id,
            actor_user_id=event.actor_user_id,
            actor_name=actor_name,
            action=event.action,
            target_type=event.target_type,
            target_id=event.target_id,
            details=event.details,
            occurred_at=event.occurred_at,
        )
        for event, actor_name in rows.all()
    ]
