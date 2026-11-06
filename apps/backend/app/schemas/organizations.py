from pydantic import BaseModel

from app.schemas.auth import OrganizationOut


class OrganizationMembershipOut(BaseModel):
    organization: OrganizationOut
    is_owner: bool
    role: str | None
