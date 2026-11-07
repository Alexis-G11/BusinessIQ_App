from datetime import datetime
from typing import Literal
import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


AssignableRole = Literal["manager", "accountant", "employee", "inventory_staff", "analyst"]


class InvitationCreate(BaseModel):
    email: EmailStr
    role: AssignableRole

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class InvitationCreated(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: AssignableRole
    token: str = Field(min_length=32, max_length=128)
    expires_at: datetime


class InvitationSummary(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: str
    invited_by_user_id: uuid.UUID
    accepted_by_user_id: uuid.UUID | None
    revoked_by_user_id: uuid.UUID | None
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class InvitationAccept(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class InvitationAccepted(BaseModel):
    organization_id: uuid.UUID
    organization_name: str
    membership_id: uuid.UUID
    role: AssignableRole


class MembershipRoleUpdate(BaseModel):
    role: AssignableRole


class MembershipSummary(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: EmailStr
    is_owner: bool
    role: str | None
    joined_at: datetime
