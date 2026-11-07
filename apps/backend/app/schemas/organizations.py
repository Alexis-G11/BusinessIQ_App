import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.auth import OrganizationOut


class OrganizationMembershipOut(BaseModel):
    organization: OrganizationOut
    membership_id: uuid.UUID
    user_id: uuid.UUID
    is_owner: bool
    role: str | None


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    legal_name: str | None = Field(default=None, max_length=160)
    business_type: Literal["sole_proprietor", "llc", "corporation", "partnership", "other"] | None = None
    industry: str | None = Field(default=None, max_length=60)
    business_size: Literal["micro", "small", "medium"] | None = None
    country: str | None = Field(default=None, min_length=2, max_length=2)
    currency: str = "USD"
    timezone: str = "UTC"
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    tax_identifier: str | None = Field(default=None, max_length=64)
    fiscal_year_start: date | None = None

    @field_validator("legal_name", "industry", "address", "phone", "tax_identifier")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("name must contain at least two characters")
        return normalized

    @field_validator("country")
    @classmethod
    def normalize_country(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value.isalpha():
            raise ValueError("country must be a 2-letter code")
        return value.upper()

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        from app.schemas.auth import VALID_CURRENCIES

        code = value.upper()
        if code not in VALID_CURRENCIES:
            raise ValueError(f"Unsupported currency code: {code}")
        return code.lower()

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError, OSError) as exc:
            raise ValueError("Unknown timezone") from exc
        return value
