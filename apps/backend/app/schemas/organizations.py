import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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
    country: str | None = Field(default="RW", min_length=2, max_length=2)
    currency: str = "RWF"
    timezone: str = "Africa/Kigali"
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


class OrganizationSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=120)
    legal_name: str | None = Field(default=None, max_length=160)
    business_type: Literal["sole_proprietor", "llc", "corporation", "partnership", "other"] | None = None
    industry: str | None = Field(default=None, max_length=60)
    business_size: Literal["micro", "small", "medium"] | None = None
    timezone: str | None = None
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    tax_identifier: str | None = Field(default=None, max_length=64)
    fiscal_year_start: date | None = None

    @model_validator(mode="after")
    def require_non_null_name_when_supplied(self):
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Business name cannot be empty")
        if "timezone" in self.model_fields_set and self.timezone is None:
            raise ValueError("Timezone cannot be empty")
        return self

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Business name must contain at least two characters")
        return normalized

    @field_validator("legal_name", "industry", "address", "phone", "tax_identifier")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("timezone")
    @classmethod
    def validate_optional_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError, OSError) as exc:
            raise ValueError("Unknown timezone") from exc
        return value
