"""Business profile route and validation contracts; no database is contacted."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from pydantic import ValidationError

_TEST_SETTINGS = {
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test",
    "DIRECT_URL": "postgresql://test:test@localhost:5432/test",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "STRIPE_SECRET_KEY": "test-stripe-key",
}
with patch.dict(os.environ, _TEST_SETTINGS):
    from fastapi import HTTPException

    from app.models.audit import OrganizationAuditEvent
    from app.models.organization import Organization
    from app.permissions import OrgContext, require_permission
    from app.routers.organizations import get_organization_settings, update_organization_settings
    from app.schemas.organizations import OrganizationSettingsUpdate


def _context(organization_id=None, user_id=None, *, owner=True, permissions=frozenset()):
    return OrgContext(
        user=SimpleNamespace(id=user_id or uuid.uuid4()),
        organization_id=organization_id or uuid.uuid4(),
        is_owner=owner,
        permissions=permissions,
        phone_verified=True,
        subscription_status="trialing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        currency="RWF",
        currency_exponent=0,
    )


class _FakeDatabase:
    def __init__(self, organization=None):
        self.organization = organization
        self.statement = None
        self.added = []
        self.committed = False
        self.refreshed = False

    async def get(self, model, key):
        self.statement = (model, key)
        return self.organization

    async def scalar(self, statement):
        self.statement = statement
        return self.organization

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed = item is self.organization


def test_settings_read_uses_selected_tenant_id():
    organization_id = uuid.uuid4()
    organization = SimpleNamespace(id=organization_id)
    db = _FakeDatabase(organization)
    result = asyncio.run(get_organization_settings(_context(organization_id), db))
    assert result is organization
    assert db.statement == (Organization, organization_id)


def test_settings_patch_scopes_row_and_records_actor_and_changed_fields():
    organization_id, actor_id = uuid.uuid4(), uuid.uuid4()
    organization = SimpleNamespace(id=organization_id, address={"formatted": "Old address"})
    db = _FakeDatabase(organization)
    body = OrganizationSettingsUpdate(name="  New Business  ", timezone="Africa/Kigali", address="New address")

    result = asyncio.run(update_organization_settings(body, _context(organization_id, actor_id), db))

    assert result is organization
    assert organization.name == "New Business"
    assert organization.timezone == "Africa/Kigali"
    assert organization.address == {"formatted": "New address"}
    assert organization_id in db.statement.compile().params.values()
    assert db.committed and db.refreshed
    event = next(item for item in db.added if isinstance(item, OrganizationAuditEvent))
    assert event.organization_id == organization_id
    assert event.actor_user_id == actor_id
    assert event.action == "organization.settings.updated"
    assert event.details == {"changed_fields": ["address", "name", "timezone"]}


def test_settings_patch_rejects_empty_body_without_query():
    db = _FakeDatabase()
    try:
        asyncio.run(update_organization_settings(OrganizationSettingsUpdate(), _context(), db))
        raise AssertionError("Expected an empty patch to be rejected")
    except HTTPException as exc:
        assert exc.status_code == 422
    assert db.statement is None


def test_currency_changes_are_not_accepted_by_settings_schema():
    with pytest.raises(ValidationError):
        OrganizationSettingsUpdate.model_validate({"currency": "USD"})


def test_invalid_timezone_and_blank_business_name_are_rejected():
    with pytest.raises(ValidationError):
        OrganizationSettingsUpdate(timezone="Not/A-Timezone")
    with pytest.raises(ValidationError):
        OrganizationSettingsUpdate(name="  ")


def test_business_settings_permission_is_enforced_for_non_owner():
    checker = require_permission("settings.manage")
    context = _context(owner=False, permissions=frozenset())
    with pytest.raises(HTTPException) as raised:
        asyncio.run(checker(context))
    assert raised.value.status_code == 403
