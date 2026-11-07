"""Membership route contracts; these tests make no database connection."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

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

    from app.permissions import OrgContext, require_permission
    from app.routers.memberships import list_members, remove_member, update_member_role
    from app.schemas.memberships import MembershipRoleUpdate
    from app.models.role import Role, UserRole
    from app.models.user import OrganizationMembershipEvent, OrganizationUser, User


def _context(organization_id=None, user_id=None):
    return OrgContext(
        user=SimpleNamespace(id=user_id or uuid.uuid4()),
        organization_id=organization_id or uuid.uuid4(),
        is_owner=True,
        permissions=frozenset(),
        phone_verified=True,
        subscription_status="trialing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        currency="RWF",
        currency_exponent=0,
    )


class _FakeResult:
    def __init__(self, rows=()):
        self._rows = rows

    def all(self):
        return list(self._rows)


class _FakeDatabase:
    def __init__(self, scalars=(), objects=None, rows=()):
        self.scalars = list(scalars)
        self.objects = objects or {}
        self.rows = rows
        self.statement = None
        self.added = []
        self.committed = False

    async def scalar(self, statement):
        self.statement = statement
        return self.scalars.pop(0) if self.scalars else None

    async def get(self, model, key):
        return self.objects.get((model, key))

    async def execute(self, statement):
        self.statement = statement
        return _FakeResult(self.rows)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True


def test_member_listing_is_scoped_and_hides_revoked_memberships():
    organization_id = uuid.uuid4()
    db = _FakeDatabase()
    assert asyncio.run(list_members(_context(organization_id), db)) == []
    sql = str(db.statement.compile())
    assert "organization_users.revoked_at IS NULL" in sql
    assert organization_id in db.statement.compile().params.values()


def test_owner_role_cannot_be_changed():
    organization_id, membership_id = uuid.uuid4(), uuid.uuid4()
    owner = SimpleNamespace(id=membership_id, organization_id=organization_id, is_owner=True)
    db = _FakeDatabase(scalars=[owner])
    try:
        asyncio.run(update_member_role(membership_id, MembershipRoleUpdate(role="manager"), _context(organization_id), db))
        raise AssertionError("Expected owner protection")
    except HTTPException as exc:
        assert exc.status_code == 409
    assert not db.committed and not db.added


def test_role_change_is_scoped_and_records_the_previous_and_new_role():
    organization_id, actor_id, member_id, membership_id, old_role_id, new_role_id = (uuid.uuid4() for _ in range(6))
    membership = SimpleNamespace(
        id=membership_id,
        organization_id=organization_id,
        user_id=member_id,
        is_owner=False,
        revoked_at=None,
        created_at=datetime(2026, 1, 1),
    )
    target_user = SimpleNamespace(id=member_id, full_name="Team member", email="member@example.test")
    new_role = SimpleNamespace(id=new_role_id, name="manager")
    user_role = SimpleNamespace(role_id=old_role_id)
    db = _FakeDatabase(
        scalars=[membership, new_role, user_role],
        objects={(User, member_id): target_user},
    )

    result = asyncio.run(update_member_role(
        membership_id, MembershipRoleUpdate(role="manager"), _context(organization_id, actor_id), db,
    ))

    assert result.role == "manager"
    assert user_role.role_id == new_role_id
    event = next(item for item in db.added if isinstance(item, OrganizationMembershipEvent))
    assert event.event_type == "role_changed"
    assert event.previous_role_id == old_role_id
    assert event.new_role_id == new_role_id
    assert event.actor_user_id == actor_id
    assert db.committed


def test_member_management_permission_is_required_for_non_owner():
    from dataclasses import replace

    context = replace(_context(), is_owner=False, permissions=frozenset())
    checker = require_permission("members.manage")
    try:
        asyncio.run(checker(context))
        raise AssertionError("Expected member-management permission denial")
    except HTTPException as exc:
        assert exc.status_code == 403


def test_removal_soft_revokes_member_and_records_actor_event():
    organization_id, actor_id, member_id, membership_id, role_id = (uuid.uuid4() for _ in range(5))
    member = SimpleNamespace(
        id=membership_id,
        organization_id=organization_id,
        user_id=member_id,
        is_owner=False,
        revoked_at=None,
        revoked_by_user_id=None,
    )
    current_role = SimpleNamespace(role_id=role_id)
    db = _FakeDatabase(scalars=[member, current_role])

    response = asyncio.run(remove_member(membership_id, _context(organization_id, actor_id), db))

    assert response.status_code == 204
    assert member.revoked_at is not None
    assert member.revoked_by_user_id == actor_id
    assert db.committed
    event = next(item for item in db.added if isinstance(item, OrganizationMembershipEvent))
    assert event.event_type == "revoked"
    assert event.organization_id == organization_id
    assert event.membership_id == membership_id
    assert event.actor_user_id == actor_id
    assert event.previous_role_id == role_id
    assert event.new_role_id is None


def test_removal_requires_membership_in_selected_organization():
    organization_id, membership_id = uuid.uuid4(), uuid.uuid4()
    db = _FakeDatabase()
    try:
        asyncio.run(remove_member(membership_id, _context(organization_id), db))
        raise AssertionError("Expected tenant-scoped lookup to reject unknown member")
    except HTTPException as exc:
        assert exc.status_code == 404
    sql = str(db.statement.compile())
    assert "organization_users.organization_id" in sql
    assert organization_id in db.statement.compile().params.values()
