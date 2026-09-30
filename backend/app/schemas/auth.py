import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class SignUpRequest(BaseModel):
    full_name: str
    phone_number: str
    email: EmailStr
    password: str
    business_name: str
    industry: str | None = None
    business_size: str | None = None
    currency: str = "usd"
    timezone: str = "UTC"


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str
    industry: str | None
    business_size: str | None
    country: str | None
    currency: str
    timezone: str
    subscription_status: str
    trial_ends_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut