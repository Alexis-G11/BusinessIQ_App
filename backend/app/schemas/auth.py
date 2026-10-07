import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

VALID_CURRENCIES = {
    "USD", "EUR", "GBP", "RWF", "GHS", "LRD", "NGN", "KES", "ZAR",
    "UGX", "TZS", "XOF", "XAF", "EGP", "MAD", "ETB", "CAD", "AUD",
}


class SignUpRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str | None = Field(default=None, max_length=32)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=2, max_length=120)
    industry: str | None = Field(default=None, max_length=60)
    business_size: Literal["micro", "small", "medium"] | None = None
    country: str | None = Field(default=None, min_length=2, max_length=2)
    currency: str = "USD"
    timezone: str = "UTC"

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_CURRENCIES:
            raise ValueError(f"Unsupported currency code: {v}")
        return v.lower()  # stored lowercase, as the Organization model defaults to "usd"

    @field_validator("country")
    @classmethod
    def validate_country(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not v.isalpha():
            raise ValueError("country must be a 2-letter code")
        return v.upper()

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError, OSError):
            raise ValueError("Unknown timezone")
        return v


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut