import re
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

VALID_CURRENCIES = {
    "USD", "EUR", "GBP", "RWF", "GHS", "LRD", "NGN", "KES", "ZAR",
    "UGX", "TZS", "XOF", "XAF", "EGP", "MAD", "ETB", "CAD", "AUD",
}


class SignUpRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str = Field(min_length=9, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=2, max_length=120)
    industry: str | None = Field(default=None, max_length=60)
    business_size: Literal["micro", "small", "medium"] | None = None
    country: str | None = Field(default=None, min_length=2, max_length=2)
    currency: str = "USD"
    timezone: str = "UTC"

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        normalized = re.sub(r"[\s().-]", "", value)
        if not re.fullmatch(r"\+[1-9]\d{7,14}", normalized):
            raise ValueError("phone_number must be an international number such as +15551234567")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("password must contain at least one letter and one number")
        return value

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


class ResendConfirmationRequest(BaseModel):
    email: EmailStr


class UpdateUserRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("full_name must contain at least two characters")
        return normalized


class PhoneVerificationRequest(BaseModel):
    phone_number: str = Field(min_length=9, max_length=20)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        normalized = re.sub(r"[\s().-]", "", value)
        if not re.fullmatch(r"\+[1-9]\d{7,14}", normalized):
            raise ValueError("phone_number must be an international number such as +15551234567")
        return normalized


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    legal_name: str | None
    business_type: str | None
    industry: str | None
    business_size: str | None
    country: str | None
    currency: str
    timezone: str
    address: dict | None
    phone: str | None
    email: str | None
    tax_identifier: str | None
    fiscal_year_start: date | None
    subscription_status: str
    trial_started_at: datetime | None
    trial_ends_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    phone_number: str | None
    pending_phone_number: str | None
    phone_verified: bool
    created_at: datetime


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut
    is_owner: bool
