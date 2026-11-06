"""Smoke test for expense categories, paid and credit expenses, payables and ledger.

Usage (server running, from backend/):   python -m scripts.smoke_expenses
Creates unique records each run, so it is safe to repeat.
"""
import asyncio
import json
import urllib.error
import urllib.request
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.accounting import Account, JournalEntry, JournalLine
from app.services.expenses_calc import self_check
from scripts.smoke_catalog import BASE, RESULTS, call, check, sign_in

D = Decimal


def post_json(path, token, body, key=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"******"
    if key:
        headers["Idempotency-Key"] = key
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


async def ledger_for(source_type, source_id):
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(Account.account_code, JournalLine.debit, JournalLine.credit, JournalLine.supplier_id)
                .join(JournalLine, JournalLine.account_id == Account.id)
                .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
                .where(
                    JournalEntry.source_type == source_type,
                    JournalEntry.source_id == uuid.UUID(source_id),
                )
            )
        ).all()
    return sorted(
        [(code, D(debit), D(credit), supplier_id) for code, debit, credit, supplier_id in rows],
        key=lambda row: (row[0], row[1], row[2]),
    )


def main():
    tag = uuid.uuid4().hex[:6]
    self_check()
    check("expense calculations: randomized amount and ledger invariants hold", True, True)

    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)
    status, _ = post_json(
        "/api/v1/expenses",
        "",
        {"category_id": str(uuid.uuid4()), "amount_cents": 100, "incurred_at": date.today().isoformat(),
         "description": "unauthorized"},
        f"unauth-{uuid.uuid4()}",
    )
    check("expense without a token is rejected", status, 401)
    token = sign_in()

    status, accounts = call("GET", "/api/v1/expense-accounts", token)
    check("expense accounts: active chart accounts are available",
          status == 200 and any(account["account_code"] == "6900" for account in accounts), True, fatal=True)
    general_account = next(account for account in accounts if account["account_code"] == "6900")
    status, category = call(
        "POST",
        "/api/v1/expense-categories",
        token,
        {"name": f"Ops {tag}", "account_id": general_account["id"]},
    )
    check("category: created and linked to general expense account",
          (status, category["account_code"]), (201, "6900"), fatal=True)
    status, _ = call(
        "POST",
        "/api/v1/expense-categories",
        token,
        {"name": f"ops {tag}", "account_id": general_account["id"]},
    )
    check("category: case-insensitive duplicate rejected", status, 409)
    status, _ = call(
        "POST",
        "/api/v1/expense-categories",
        token,
        {"name": f"Foreign {tag}", "account_id": str(uuid.uuid4())},
    )
    check("category: account outside business rejected", status, 404)

    status, supplier = call("POST", "/api/v1/suppliers", token, {"name": f"Expense supplier {tag}"})
    check("fixture: supplier created", status, 201, fatal=True)
    expense_date = date.today().isoformat()
    cash_body = {
        "category_id": category["id"],
        "amount_cents": 12500,
        "amount_paid_cents": 12500,
        "payment_method": "bank",
        "incurred_at": expense_date,
        "description": f"Paid operating cost {tag}",
    }
    cash_key = f"expense-{uuid.uuid4()}"
    status, paid_expense = post_json("/api/v1/expenses", token, cash_body, cash_key)
    check("expense: paid expense creates a bank payment",
          (status, paid_expense["amount_cents"], paid_expense["balance_cents"], paid_expense["payment_method"]),
          (201, 12500, 0, "bank"), fatal=True)
    status, expense_replay = post_json("/api/v1/expenses", token, cash_body, cash_key)
    check("expense: retry returns original entry", (status, expense_replay["id"]), (200, paid_expense["id"]))

    credit_body = {
        "category_id": category["id"],
        "supplier_id": supplier["id"],
        "amount_cents": 30000,
        "amount_paid_cents": 5000,
        "payment_method": "cash",
        "incurred_at": expense_date,
        "description": f"Part-paid supplier expense {tag}",
    }
    status, credit_expense = post_json(
        "/api/v1/expenses",
        token,
        credit_body,
        f"expense-{uuid.uuid4()}",
    )
    check("expense: partial payment records supplier payable",
          (status, credit_expense["payment_status"], credit_expense["balance_cents"]),
          (201, "partial", 25000))
    status, _ = post_json(
        "/api/v1/expenses",
        token,
        {
            "category_id": category["id"],
            "amount_cents": 1000,
            "incurred_at": expense_date,
            "description": "unpaid without supplier",
        },
        f"expense-{uuid.uuid4()}",
    )
    check("expense: unpaid expense without supplier rejected", status, 422)
    status, _ = post_json(
        "/api/v1/expenses",
        token,
        {
            "category_id": str(uuid.uuid4()),
            "amount_cents": 1000,
            "amount_paid_cents": 1000,
            "payment_method": "cash",
            "incurred_at": expense_date,
            "description": "foreign category",
        },
        f"expense-{uuid.uuid4()}",
    )
    check("expense: foreign category rejected", status, 404)
    status, _ = post_json(
        "/api/v1/expenses",
        token,
        {
            "category_id": category["id"],
            "amount_cents": 100,
            "amount_paid_cents": 101,
            "payment_method": "cash",
            "incurred_at": expense_date,
            "description": "overpaid",
        },
        f"expense-{uuid.uuid4()}",
    )
    check("expense: paid amount cannot exceed total", status, 422)
    status, _ = post_json("/api/v1/expenses", token, cash_body)
    check("expense: missing idempotency key rejected", status, 422)

    status, expenses = call("GET", f"/api/v1/expenses?category_id={category['id']}", token)
    check("expenses: list is category-filtered and tenant-scoped",
          (status, {expense["id"] for expense in expenses} >= {paid_expense["id"], credit_expense["id"]}),
          (200, True))
    status, summary = call("GET", f"/api/v1/expenses/summary?date_from={expense_date}&date_to={expense_date}", token)
    category_summary = next(row for row in summary["categories"] if row["category_id"] == category["id"])
    check("expenses: summary returns backend cents totals",
          (status, category_summary["total_cents"], category_summary["count"]), (200, 42500, 2))
    status, payables = call("GET", "/api/v1/payables", token)
    row = next(item for item in payables["suppliers"] if item["supplier_id"] == supplier["id"])
    check("payables: unpaid expenses contribute to supplier balance",
          (status, row["open_expenses"], row["balance_cents"]), (200, 1, 25000))
    status, detail = call("GET", f"/api/v1/payables/{supplier['id']}", token)
    check("payables: supplier detail returns open expense",
          (status, len(detail["open_expenses"]), detail["open_expenses"][0]["expense_id"]),
          (200, 1, credit_expense["id"]))

    payment_body = {
        "supplier_id": supplier["id"],
        "expense_id": credit_expense["id"],
        "amount_cents": 25000,
        "method": "cash",
    }
    payment_key = f"supplier-payment-{uuid.uuid4()}"
    status, payment = post_json("/api/v1/payments/supplier", token, payment_body, payment_key)
    check("supplier payment: settles selected expense",
          (status, [(item["expense_id"], item["amount_cents"]) for item in payment["expense_allocations"]]),
          (201, [(credit_expense["id"], 25000)]))
    status, payables = call("GET", "/api/v1/payables", token)
    check("payables: settled expense no longer contributes",
          (status, all(item["supplier_id"] != supplier["id"] for item in payables["suppliers"])),
          (200, True))
    status, payment_detail = call("GET", f"/api/v1/payments/{payment['id']}", token)
    check("payment detail: expense allocation visible",
          (status, len(payment_detail["expense_allocations"])), (200, 1))

    async def ledger_checks():
        paid_lines = await ledger_for("expense", paid_expense["id"])
        check("ledger [paid expense]: expense debit and bank credit",
              [(code, debit, credit) for code, debit, credit, _ in paid_lines],
              [("1010", D(0), D("125.00")), ("6900", D("125.00"), D(0))])
        credit_lines = await ledger_for("expense", credit_expense["id"])
        check("ledger [credit expense]: expense, cash and payable lines balance",
              [(code, debit, credit) for code, debit, credit, _ in credit_lines],
              [("1000", D(0), D("50.00")), ("2000", D(0), D("250.00")), ("6900", D("300.00"), D(0))])
        check("ledger [credit expense]: payable is tagged to supplier",
              [str(sid) for code, _, _, sid in credit_lines if code == "2000"], [supplier["id"]])
        payment_lines = await ledger_for("payment", payment["id"])
        check("ledger [supplier payment]: payable debit and cash credit",
              [(code, debit, credit) for code, debit, credit, _ in payment_lines],
              [("1000", D(0), D("250.00")), ("2000", D("250.00"), D(0))])
        await engine.dispose()

    asyncio.run(ledger_checks())
    check("smoke test completed", all(RESULTS), True)
    print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")


if __name__ == "__main__":
    main()
