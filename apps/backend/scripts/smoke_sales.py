"""Smoke test for sales: totals, stock, payments, credit sales, retries and the ledger.

Usage (server running, from backend/):   python -m scripts.smoke_sales
Creates its own products and customer each run, so it is safe to repeat.
"""
import asyncio
import json
import sys
import urllib.error
import urllib.request
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.accounting import Account, JournalEntry, JournalLine
from scripts.smoke_catalog import BASE, RESULTS, call, check, sign_in

D = Decimal


def post_sale(token, body, key=None):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    headers["Idempotency-Key"] = key or f"smoke-{uuid.uuid4()}"
    request = urllib.request.Request(BASE + "/api/v1/sales", data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


def post_quote(token, body):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    request = urllib.request.Request(BASE + "/api/v1/sales/quote", data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


def make_product(token, name, price, cost, stock, tag):
    body = {"name": name, "sku": f"{name.split()[1]}-{tag}", "selling_price_cents": price, "cost_price_cents": cost, "initial_stock": stock}
    status, product = call("POST", "/api/v1/products", token, body)
    check(f"fixture: {name} created", status, 201, fatal=True)
    return product["id"]


def stock_of(token, product_id):
    return call("GET", f"/api/v1/products/{product_id}", token)[1]["stock_quantity"]


async def ledger_of(sale_id):
    """Every journal line of a sale: (account code, debit, credit, customer id)."""
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(Account.account_code, JournalLine.debit, JournalLine.credit, JournalLine.customer_id)
                .join(JournalLine, JournalLine.account_id == Account.id)
                .join(JournalEntry, JournalEntry.id == JournalLine.journal_entry_id)
                .where(JournalEntry.source_type == "sale", JournalEntry.source_id == uuid.UUID(sale_id))
            )
        ).all()
    return sorted(((code, D(d), D(c), cust) for code, d, c, cust in rows), key=lambda r: (r[0], r[1], r[2]))


async def ledger_checks(sales, customer_id):
    for label, sale_id in sales.items():
        lines = await ledger_of(sale_id)
        check(f"ledger [{label}]: debits equal credits",
              sum(d for _, d, _, _ in lines) == sum(c for _, _, c, _ in lines) and len(lines) >= 2, True)
    simple = lambda lines: [(code, d, c) for code, d, c, _ in lines]
    check("ledger [paid in cash]: cash, inventory, revenue, cost of goods",
          simple(await ledger_of(sales["cash"])),
          [("1000", D("22.50"), D(0)), ("1200", D(0), D("9.00")), ("4000", D(0), D("22.50")), ("5000", D("9.00"), D(0))])
    check("ledger [discount]: revenue is the discounted amount",
          simple(await ledger_of(sales["discount"])),
          [("1000", D("7.50"), D(0)), ("1200", D(0), D("4.00")), ("4000", D(0), D("7.50")), ("5000", D("4.00"), D(0))])
    credit = await ledger_of(sales["credit"])
    check("ledger [credit sale]: cash 4.00, receivable 6.00 for the customer",
          [(code, d, c) for code, d, c, _ in credit if code in ("1000", "1100")], [("1000", D("4.00"), D(0)), ("1100", D("6.00"), D(0))])
    check("ledger [credit sale]: the receivable line carries the customer",
          [str(cust) for code, _, _, cust in credit if code == "1100"], [customer_id])
    check("ledger [cash + card]: cash goes to 1000, card to bank 1010",
          [(code, d) for code, d, _, _ in await ledger_of(sales["mixed"]) if code in ("1000", "1010")],
          [("1000", D("4.00")), ("1010", D("6.00"))])
    await engine.dispose()


def main():
    tag = uuid.uuid4().hex[:6]
    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)
    status, _ = post_sale("", {"items": [{"product_id": str(uuid.uuid4()), "quantity": 1}]})
    check("sale without a token is rejected", status, 401)
    token = sign_in()

    a = make_product(token, f"Sales A {tag}", 1000, 400, 10, tag)
    b = make_product(token, f"Sales B {tag}", 250, 100, 5, tag)
    quote_body = {"items": [{"product_id": a, "quantity": 2}, {"product_id": b, "quantity": 1}]}
    status, quote = post_quote(token, quote_body)
    check("quote: server returns subtotal, tax and total", status == 200 and (
        quote["subtotal_cents"], quote["tax_cents"], quote["total_cents"]
    ) == (2250, 0, 2250), True)
    status, _ = post_quote("", quote_body)
    check("quote without a token is rejected", status, 401)
    status, cust = call("POST", "/api/v1/customers", token, {"name": f"Buyer {tag}", "phone": "07" + str(uuid.uuid4().int)[:8]})
    check("fixture: customer created", status, 201, fatal=True)
    customer_id = cust["id"]
    sales = {}

    # --- a normal cash sale ---
    items = [{"product_id": a, "quantity": 2}, {"product_id": b, "quantity": 1}]
    status, sale = post_sale(token, {"items": items, "payments": [{"method": "cash", "amount_cents": 2250}]})
    check("sale: paid in full", status, 201, fatal=True)
    sales["cash"] = sale["id"]
    check("sale: totals are worked out by the server",
          (sale["subtotal_cents"], sale["tax_cents"], sale["total_cents"], sale["payment_status"], sale["balance_cents"]),
          (2250, 0, 2250, "paid", 0))
    check("sale: has a receipt number and 2 items", sale["reference"].startswith("S-") and len(sale["items"]) == 2, True)
    check("stock was reduced (A 10 to 8, B 5 to 4)", (stock_of(token, a), stock_of(token, b)), (8, 4))
    status, moves = call("GET", f"/api/v1/inventory/movements?product_id={a}&movement_type=sale", token)
    check("stock history shows the sale movement", status == 200 and len(moves) == 1 and moves[0]["quantity_change"] == -2, True)

    # --- discount ---
    status, sale = post_sale(token, {"items": [{"product_id": a, "quantity": 1}], "discount_cents": 250, "payments": [{"method": "cash", "amount_cents": 750}]})
    check("sale: discount applied", (status, sale["total_cents"], sale["payment_status"]), (201, 750, "paid"))
    sales["discount"] = sale["id"]

    # --- credit sale (part paid) ---
    status, sale = post_sale(token, {"customer_id": customer_id, "items": [{"product_id": a, "quantity": 1}], "payments": [{"method": "cash", "amount_cents": 400}]})
    check("sale: part-paid sale is a credit sale", (status, sale["payment_status"], sale["balance_cents"]), (201, "partial", 600))
    sales["credit"] = sale["id"]
    credit_sale_id = sale["id"]

    # --- two payment methods ---
    status, sale = post_sale(token, {"items": [{"product_id": a, "quantity": 1}], "payments": [{"method": "cash", "amount_cents": 400}, {"method": "card", "amount_cents": 600}]})
    check("sale: cash + card payments", (status, len(sale["payments"]), sale["payment_status"]), (201, 2, "paid"))
    sales["mixed"] = sale["id"]

    # --- rules that must refuse ---
    one_a = [{"product_id": a, "quantity": 1}]
    status, _ = post_sale(token, {"items": one_a, "payments": [{"method": "cash", "amount_cents": 100}]})
    check("refused: unpaid balance without a customer", status, 422)
    status, _ = post_sale(token, {"items": one_a, "payments": [{"method": "cash", "amount_cents": 2000}]})
    check("refused: paying more than the total", status, 422)
    status, _ = post_sale(token, {"items": [{"product_id": a, "quantity": 1000}], "payments": []})
    check("refused: not enough stock", status, 409)
    status, _ = post_sale(token, {"items": [{"product_id": str(uuid.uuid4()), "quantity": 1}], "payments": []})
    check("refused: unknown product", status, 404)
    status, _ = post_sale(token, {"customer_id": customer_id, "items": one_a, "discount_cents": 5000})
    check("refused: discount bigger than the subtotal", status, 422)
    status, _ = post_sale(token, {"customer_id": str(uuid.uuid4()), "items": one_a, "payments": [{"method": "cash", "amount_cents": 1000}]})
    check("refused: customer from outside the business", status, 422)
    status, _ = post_sale(token, {"items": [], "payments": []})
    check("refused: a sale with no items", status, 422)
    status, _ = post_sale(token, {"items": one_a, "payments": [{"method": "barter", "amount_cents": 1000}]})
    check("refused: unknown payment method", status, 422)
    c = make_product(token, f"Sales C {tag}", 100, 50, 3, tag)
    call("DELETE", f"/api/v1/products/{c}", token)
    status, _ = post_sale(token, {"items": [{"product_id": c, "quantity": 1}], "payments": [{"method": "cash", "amount_cents": 100}]})
    check("refused: archived product", status, 409)

    # --- a retried request must not sell twice ---
    stock_before = stock_of(token, b)
    body = {"items": [{"product_id": b, "quantity": 1}], "payments": [{"method": "cash", "amount_cents": 250}]}
    first_status, first = post_sale(token, body, key=f"retry-{tag}")
    second_status, second = post_sale(token, body, key=f"retry-{tag}")
    check("retry: first request creates the sale, the second replays it", (first_status, second_status, first["id"] == second["id"]), (201, 200, True))
    check("retry: stock reduced only once", stock_of(token, b), stock_before - 1)

    # --- reading ---
    status, detail = call("GET", f"/api/v1/sales/{sales['cash']}", token)
    check("read: sale detail has items and payments", (status, len(detail["items"]), len(detail["payments"])), (200, 2, 1))
    status, rows = call("GET", f"/api/v1/sales?payment_status=partial&customer_id={customer_id}", token)
    check("read: list filter finds the credit sale", status == 200 and [r["id"] for r in rows] == [credit_sale_id], True)
    status, _ = call("GET", f"/api/v1/sales/{uuid.uuid4()}", token)
    check("read: unknown sale gives 404", status, 404)

    asyncio.run(ledger_checks(sales, customer_id))

    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
