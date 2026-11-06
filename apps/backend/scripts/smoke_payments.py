"""Smoke test for customer payments and receivables, including the ledger.

Usage (server running, from backend/):   python -m scripts.smoke_payments
Creates its own product and customers each run, so it is safe to repeat.
"""
import asyncio
import json
import sys
import urllib.error
import urllib.request
import uuid
from decimal import Decimal

from sqlalchemy import func, select

from app.database import AsyncSessionLocal, engine
from app.models.accounting import Account, JournalEntry, JournalLine
from scripts.smoke_catalog import BASE, RESULTS, call, check, sign_in
from scripts.smoke_sales import make_product, post_sale

D = Decimal


def post_payment(token, body, key=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if key:
        headers["Idempotency-Key"] = key
    request = urllib.request.Request(BASE + "/api/v1/payments/customer", data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


def new_customer(token, label, tag):
    status, cust = call("POST", "/api/v1/customers", token, {"name": f"{label} {tag}", "phone": "07" + str(uuid.uuid4().int)[:8]})
    check(f"fixture: customer {label} created", status, 201, fatal=True)
    return cust["id"]


def sale_state(token, sale_id):
    sale = call("GET", f"/api/v1/sales/{sale_id}", token)[1]
    return sale["amount_paid_cents"], sale["balance_cents"], sale["payment_status"]


async def ledger_of_payment(payment_id):
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(Account.account_code, JournalLine.debit, JournalLine.credit, JournalLine.customer_id)
                .join(JournalLine, JournalLine.account_id == Account.id)
                .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
                .where(JournalEntry.source_type == "payment", JournalEntry.source_id == uuid.UUID(payment_id))
            )
        ).all()
    return sorted(((code, D(d), D(c), cust) for code, d, c, cust in rows), key=lambda r: (r[0], r[1], r[2]))


async def net_receivable(customer_id):
    """Debits minus credits on the Accounts Receivable account for one customer."""
    async with AsyncSessionLocal() as db:
        return D(
            await db.scalar(
                select(func.coalesce(func.sum(JournalLine.debit - JournalLine.credit), 0))
                .join(Account, Account.id == JournalLine.account_id)
                .where(Account.account_code == "1100", JournalLine.customer_id == uuid.UUID(customer_id))
            )
        )


async def ledger_checks(p1, p2, customer_id):
    first = await ledger_of_payment(p1)
    check("ledger [cash payment]: cash in, receivable down", [(c, d, k) for c, d, k, _ in first],
          [("1000", D("7.00"), D(0)), ("1100", D(0), D("7.00"))])
    check("ledger [cash payment]: the receivable line carries the customer",
          [str(cust) for code, _, _, cust in first if code == "1100"], [customer_id])
    second = await ledger_of_payment(p2)
    check("ledger [card payment]: card money goes to bank 1010", [(c, d, k) for c, d, k, _ in second],
          [("1010", D("10.00"), D(0)), ("1100", D(0), D("10.00"))])
    check("ledger: once paid in full, the customer's net receivable is zero", await net_receivable(customer_id), D(0))
    await engine.dispose()


def main():
    tag = uuid.uuid4().hex[:6]
    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)
    status, _ = post_payment("", {"customer_id": str(uuid.uuid4()), "amount_cents": 100, "method": "cash"})
    check("payment without a token is rejected", status, 401)
    token = sign_in()

    product = make_product(token, f"Pay A {tag}", 1000, 400, 20, tag)
    customer = new_customer(token, "Debtor", tag)
    stranger = new_customer(token, "Nobody", tag)

    # --- two credit sales: 1000 unpaid, and 2000 with 500 paid ---
    status, s1 = post_sale(token, {"customer_id": customer, "items": [{"product_id": product, "quantity": 1}]})
    check("setup: unpaid credit sale", (status, s1["payment_status"], s1["balance_cents"]), (201, "unpaid", 1000))
    status, s2 = post_sale(token, {"customer_id": customer, "items": [{"product_id": product, "quantity": 2}], "payments": [{"method": "cash", "amount_cents": 500}]})
    check("setup: part-paid credit sale", (status, s2["payment_status"], s2["balance_cents"]), (201, "partial", 1500))

    status, rec = call("GET", "/api/v1/receivables", token)
    mine = [c for c in rec["customers"] if c["customer_id"] == customer]
    check("receivables: customer owes 2500 over 2 sales", (status, [(c["balance_cents"], c["open_sales"]) for c in mine]), (200, [(2500, 2)]))
    status, detail = call("GET", f"/api/v1/receivables/{customer}", token)
    check("receivables: customer detail lists open sales oldest first",
          (status, [o["sale_id"] for o in detail["open_sales"]], detail["balance_cents"]), (200, [s1["id"], s2["id"]], 2500))

    # --- payment 1: 700 cash, settles the oldest sale first ---
    status, p1 = post_payment(token, {"customer_id": customer, "amount_cents": 700, "method": "cash"})
    check("payment 1: 700 goes to the oldest sale", (status, [(a["sale_id"], a["amount_cents"]) for a in p1["allocations"]]), (201, [(s1["id"], 700)]))
    check("payment 1: first sale is now part-paid", sale_state(token, s1["id"]), (700, 300, "partial"))

    # --- payment 2: 1000 by card spills over to the next sale ---
    status, p2 = post_payment(token, {"customer_id": customer, "amount_cents": 1000, "method": "card"})
    check("payment 2: 300 finishes sale one, 700 goes to sale two",
          (status, [(a["sale_id"], a["amount_cents"]) for a in p2["allocations"]]), (201, [(s1["id"], 300), (s2["id"], 700)]))
    check("payment 2: sale one paid, sale two part-paid", (sale_state(token, s1["id"])[2], sale_state(token, s2["id"])), ("paid", (1200, 800, "partial")))

    # --- payment 3: aimed at one specific sale ---
    status, p3 = post_payment(token, {"customer_id": customer, "amount_cents": 300, "method": "cash", "sale_id": s2["id"]})
    check("payment 3: a chosen sale receives it", (status, [(a["sale_id"], a["amount_cents"]) for a in p3["allocations"]]), (201, [(s2["id"], 300)]))

    # --- rules that must refuse ---
    status, _ = post_payment(token, {"customer_id": customer, "amount_cents": 100000, "method": "cash"})
    check("refused: paying more than is owed", status, 422)
    status, _ = post_payment(token, {"customer_id": customer, "amount_cents": 100, "method": "cash", "sale_id": s1["id"]})
    check("refused: paying a sale that is already fully paid", status, 422)
    status, _ = post_payment(token, {"customer_id": str(uuid.uuid4()), "amount_cents": 100, "method": "cash"})
    check("refused: customer from outside the business", status, 422)
    status, _ = post_payment(token, {"customer_id": customer, "amount_cents": 100, "method": "cash", "sale_id": str(uuid.uuid4())})
    check("refused: unknown sale", status, 422)
    status, _ = post_payment(token, {"customer_id": customer, "amount_cents": 0, "method": "cash"})
    check("refused: an amount of zero", status, 422)
    status, _ = post_payment(token, {"customer_id": stranger, "amount_cents": 100, "method": "cash"})
    check("refused: a customer who owes nothing", status, 422)

    # --- a retried request must not count twice ---
    body = {"customer_id": customer, "amount_cents": 200, "method": "cash"}
    first_status, first = post_payment(token, body, key=f"pay-{tag}")
    second_status, second = post_payment(token, body, key=f"pay-{tag}")
    check("retry: first request records it, the second replays it", (first_status, second_status, first["id"] == second["id"]), (201, 200, True))
    status, detail = call("GET", f"/api/v1/receivables/{customer}", token)
    check("retry: the debt went down only once (300 left)", detail["balance_cents"], 300)

    # --- pay the rest ---
    status, _ = post_payment(token, {"customer_id": customer, "amount_cents": 300, "method": "cash"})
    check("final payment settles everything", status, 201)
    status, detail = call("GET", f"/api/v1/receivables/{customer}", token)
    check("receivables: nothing left to pay", (status, detail["balance_cents"], detail["open_sales"]), (200, 0, []))
    status, rec = call("GET", "/api/v1/receivables", token)
    check("receivables: customer no longer listed", [c for c in rec["customers"] if c["customer_id"] == customer], [])
    check("both sales are marked paid", (sale_state(token, s1["id"])[2], sale_state(token, s2["id"])[2]), ("paid", "paid"))

    # --- reading ---
    status, rows = call("GET", f"/api/v1/payments?customer_id={customer}", token)
    check("read: five payments, all money in", (status, len(rows), {r["direction"] for r in rows}), (200, 5, {"in"}))
    status, one = call("GET", f"/api/v1/payments/{p2['id']}", token)
    check("read: payment detail shows its two allocations", (status, len(one["allocations"])), (200, 2))
    status, _ = call("GET", f"/api/v1/payments/{uuid.uuid4()}", token)
    check("read: unknown payment gives 404", status, 404)

    asyncio.run(ledger_checks(p1["id"], p2["id"], customer))

    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
