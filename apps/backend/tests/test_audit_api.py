"""Tenant-scoped immutable audit feed route contracts; no database is contacted."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException

_TEST_SETTINGS = {
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test",
    "DIRECT_URL": "postgresql://test:test@localhost:5432/test",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "STRIPE_SECRET_KEY": "test-stripe-key",
}
with patch.dict(os.environ, _TEST_SETTINGS):
    from app.permissions import OrgContext, require_permission
    from app.routers.audit import list_audit_events


class _Result:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return list(self._rows)


class _FakeDatabase:
    def __init__(self, rows):
        self.rows = rows
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return _Result(self.rows)


def _context(organization_id, *, owner=True, permissions=frozenset()):
    return OrgContext(
        user=None,
        organization_id=organization_id,
        is_owner=owner,
        permissions=permissions,
        phone_verified=True,
        subscription_status="trialing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        currency="RWF",
        currency_exponent=0,
    )


def test_audit_feed_is_tenant_scoped_and_returns_actor_name():
    organization_id, actor_id, event_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    event = SimpleNamespace(
        id=event_id,
        organization_id=organization_id,
        actor_user_id=actor_id,
        action="organization.settings.updated",
        target_type="organization",
        target_id=organization_id,
        details={"changed_fields": ["name"]},
        occurred_at=datetime(2026, 11, 7),
    )
    db = _FakeDatabase([(event, "Business owner")])
    result = asyncio.run(list_audit_events(50, _context(organization_id), db))

    assert len(result) == 1
    assert result[0].actor_name == "Business owner"
    assert result[0].actor_user_id == actor_id
    assert result[0].details == {"changed_fields": ["name"]}
    compiled = db.statement.compile()
    assert organization_id in compiled.params.values()
    assert "organization_audit_events.organization_id" in str(compiled)
    assert 50 in compiled.params.values()


def test_audit_permission_denies_non_owner_without_audit_view():
    checker = require_permission("audit.view")
    with pytest.raises(HTTPException) as raised:
        asyncio.run(checker(_context(uuid.uuid4(), owner=False)))
    assert raised.value.status_code == 403
