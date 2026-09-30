import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator

# A reasonably complete ISO 4217 set — extend freely, this isn't exhaustive
VALID_CURRENCIES = {
    "USD", "EUR", "GBP", "RWF", "GHS", "LRD", "NGN", "KES", "ZAR",
    "UGX", "TZS", "XOF", "XAF", "EGP", "MAD", "ETB", "CAD", "AUD",
    # add more as needed — this list just needs to be complete, not clever
}


class SignUpRequest(BaseModel):
    full_name: str
    phone_number: str
    email: EmailStr
    password: str
    business_name: str
    industry: str | None = None
    business_size: str | None = None
    currency: str = "USD"
    timezone: str = "UTC"

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_CURRENCIES:
            raise ValueError(f"Unsupported currency code: {v}")
        return v

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