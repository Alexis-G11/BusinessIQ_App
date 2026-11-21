import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    actor_user_id: uuid.UUID
    actor_name: str
    action: str
    target_type: str
    target_id: uuid.UUID | None
    details: dict
    occurred_at: datetime
