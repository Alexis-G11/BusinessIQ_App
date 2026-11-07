"""Route contract tests with a fake session; no database or provider is contacted."""
import asyncio
import os
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

# Importing the app configuration constructs an engine but must not require real
# project credentials or make a connection in this test process.
_TEST_SETTINGS = {
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test",
    "DIRECT_URL": "postgresql://test:test@localhost:5432/test",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "STRIPE_SECRET_KEY": "test-stripe-key",
}
os.environ.update(_TEST_SETTINGS)

from fastapi import HTTPException

from app.permissions import OrgContext, require_permission
from app.routers.reports import income_statement


class _FakeResult:
    def all(self):
        return [
            ("4000", "Sales Revenue", "revenue", Decimal("0"), Decimal("1000")),
            ("5000", "Cost of Goods Sold", "cost_of_goods_sold", Decimal("300"), Decimal("0")),
            ("6000", "Rent Expense", "expense", Decimal("200"), Decimal("0")),
        ]


class _FakeDatabase:
    def __init__(self):
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return _FakeResult()


def _context(organization_id: uuid.UUID, permissions: frozenset[str] = frozenset({"reports.view"})):
    return OrgContext(
        user=None,
        organization_id=organization_id,
        is_owner=False,
        permissions=permissions,
        phone_verified=True,
        subscription_status="trialing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        currency="RWF",
        currency_exponent=0,
    )


def test_income_statement_api_uses_only_selected_tenant_posted_entries_in_range():
    organization_id = uuid.uuid4()
    db = _FakeDatabase()
    result = asyncio.run(income_statement(
        date(2026, 11, 1),
        date(2026, 11, 30),
        _context(organization_id),
        db,
    ))

    assert result.organization_id == organization_id
    assert result.period_start == date(2026, 11, 1)
    assert result.period_end == date(2026, 11, 30)
    assert result.currency == "RWF"
    assert result.accounting_basis == "accrual"
    assert result.source == "posted_journal_entries"
    assert result.revenue == Decimal("1000")
    assert result.cost_of_goods_sold == Decimal("300")
    assert result.gross_profit == Decimal("700")
    assert result.net_income == Decimal("500")

    compiled = db.statement.compile()
    parameters = list(compiled.params.values())
    assert parameters.count(organization_id) == 2
    assert "posted" in parameters
    assert date(2026, 11, 1) in parameters
    assert date(2026, 11, 30) in parameters


def test_income_statement_api_rejects_reversed_period_before_querying():
    db = _FakeDatabase()
    try:
        asyncio.run(income_statement(
            date(2026, 11, 2),
            date(2026, 11, 1),
            _context(uuid.uuid4()),
            db,
        ))
        raise AssertionError("Expected invalid date range to be rejected")
    except HTTPException as exc:
        assert exc.status_code == 422
    assert db.statement is None


def test_report_permission_denies_member_without_reports_access():
    checker = require_permission("reports.view")
    try:
        asyncio.run(checker(_context(uuid.uuid4(), permissions=frozenset())))
        raise AssertionError("Expected report permission to be rejected")
    except HTTPException as exc:
        assert exc.status_code == 403
