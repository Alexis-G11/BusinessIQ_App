"""Smoke test for purchases, weighted-average inventory and supplier payables.

Usage (server running, from backend/):   python -m scripts.smoke_purchases
Creates uniquely named records each run, so it is safe to repeat.
"""
import asyncio
import json
import urllib.error
import urllib.request
import uuid
from decimal import Decimal

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine
from app.models.accounting import Account, JournalEntry, JournalLine
from app.models.inventory import InventoryTransaction
from app.models.product import Product
from scripts.smoke_catalog import BASE, RESULTS, call, check, sign_in
from scripts.smoke_sales import make_product
from app.services.purchases_calc import self_check

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
                .where(JournalEntry.source_type == source_type, JournalEntry.source_id == uuid.UUID(source_id))
            )
        ).all()
    return sorted(
        [(code, D(debit), D(credit), supplier_id) for code, debit, credit, supplier_id in rows],
        key=lambda row: (row[0], row[1], row[2]),
    )


def main():
    tag = uuid.uuid4().hex[:6]
    self_check()
    check("purchase calculations: randomized invariants hold", True, True)

    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)
    status, _ = post_json(
        "/api/v1/purchases",
        "",
        {"items": [{"product_id": str(uuid.uuid4()), "quantity": 1, "unit_cost_cents": 10}]},
        "no-auth",
    )
    check("purchase without a token is rejected", status, 401)
    token = sign_in()

    status, supplier = call("POST", "/api/v1/suppliers", token, {"name": f"Buy supplier {tag}"})
    check("fixture: supplier created", status, 201, fatal=True)
    product = make_product(token, f"Purchase {tag}", 900, 100, 3, tag)

    purchase_body = {
        "supplier_id": supplier["id"],
        "items": [{"product_id": product, "quantity": 2, "unit_cost_cents": 200}],
        "amount_paid_cents": 100,
        "payment_method": "cash",
    }
    key1 = f"purchase-{uuid.uuid4()}"
    status, purchase1 = post_json("/api/v1/purchases", token, purchase_body, key1)
    check("purchase: received with partial cash payment",
          (status, purchase1["reference"].startswith("P-"), purchase1["reference"][2:].isdigit(),
           purchase1["total_cents"], purchase1["balance_cents"]),
          (201, True, True, 400, 300))
    check("purchase: line total is computed from its quantity and cost",
          purchase1["items"][0]["line_total_cents"], 400)
    status, replay = post_json("/api/v1/purchases", token, purchase_body, key1)
    check("purchase: retry replays original result", (status, replay["id"]), (200, purchase1["id"]))
    status, product_after_first = call("GET", f"/api/v1/products/{product}", token)
    check("inventory: stock and weighted cost after first receipt",
          (status, product_after_first["stock_quantity"], product_after_first["cost_price_cents"]), (200, 5, 140))

    purchase2_body = {
        "supplier_id": supplier["id"],
        "items": [{"product_id": product, "quantity": 1, "unit_cost_cents": 300}],
    }
    status, purchase2 = post_json("/api/v1/purchases", token, purchase2_body, f"purchase-{uuid.uuid4()}")
    check("purchase: unpaid receipt is on supplier credit",
          (status, purchase2["total_cents"], purchase2["balance_cents"]), (201, 300, 300))
    status, product_after_second = call("GET", f"/api/v1/products/{product}", token)
    check("inventory: second receipt updates weighted average with half-up rounding",
          (status, product_after_second["stock_quantity"], product_after_second["cost_price_cents"]), (200, 6, 167))
    status, movements = call("GET", f"/api/v1/inventory/movements?product_id={product}", token)
    check("inventory movements: both purchases are recorded in receipt order",
          [(m["movement_type"], m["quantity_change"], m["resulting_quantity"]) for m in movements
           if m["movement_type"] == "purchase"], [("purchase", 1, 6), ("purchase", 2, 5)])

    status, payables = call("GET", "/api/v1/payables", token)
    supplier_rows = [row for row in payables.get("suppliers", []) if row["supplier_id"] == supplier["id"]]
    check("payables: supplier balance includes both open purchases",
          (status, [(row["open_purchases"], row["balance_cents"]) for row in supplier_rows]), (200, [(2, 600)]))
    status, detail = call("GET", f"/api/v1/payables/{supplier['id']}", token)
    check("payables: detail is oldest first",
          (status, [row["purchase_id"] for row in detail["open_purchases"]], detail["balance_cents"]),
          (200, [purchase1["id"], purchase2["id"]], 600))
    status, not_found = call("GET", f"/api/v1/payables/{uuid.uuid4()}", token)
    check("payables: unknown supplier returns 404", status, 404)

    status, _ = post_json(
        "/api/v1/purchases",
        token,
        {
            "items": [{"product_id": product, "quantity": 1, "unit_cost_cents": 100}],
        },
        f"invalid-{uuid.uuid4()}",
    )
    check("purchase: credit without a supplier is rejected", status, 422)
    status, _ = post_json(
        "/api/v1/purchases",
        token,
        {
            "supplier_id": supplier["id"],
            "items": [{"product_id": str(uuid.uuid4()), "quantity": 1, "unit_cost_cents": 100}],
        },
        f"foreign-product-{uuid.uuid4()}",
    )
    check("purchase: product outside this business is not found", status, 404)

    payment_body = {"supplier_id": supplier["id"], "amount_cents": 350, "method": "bank"}
    payment_key = f"supplier-payment-{uuid.uuid4()}"
    status, payment = post_json("/api/v1/payments/supplier", token, payment_body, payment_key)
    check("supplier payment: oldest purchase is settled first",
          (status, [(a["purchase_id"], a["amount_cents"]) for a in payment["allocations"]]),
          (201, [(purchase1["id"], 300), (purchase2["id"], 50)]))
    status, payment_retry = post_json("/api/v1/payments/supplier", token, payment_body, payment_key)
    check("supplier payment: retry replays without a duplicate",
          (status, payment_retry["id"]), (200, payment["id"]))
    status, payment_detail = call("GET", f"/api/v1/payments/{payment['id']}", token)
    check("payment detail: supplier and purchase allocations are exposed",
          (status, payment_detail["supplier_id"], len(payment_detail["purchase_allocations"])),
          (200, supplier["id"], 2))
    status, payables_detail = call("GET", f"/api/v1/payables/{supplier['id']}", token)
    check("supplier payment: amount is applied to purchase balances",
          [(row["purchase_id"], row["balance_cents"]) for row in payables_detail["open_purchases"]],
          [(purchase2["id"], 250)])

    chosen_body = {
        "supplier_id": supplier["id"],
        "purchase_id": purchase2["id"],
        "amount_cents": 250,
        "method": "cash",
    }
    status, chosen = post_json("/api/v1/payments/supplier", token, chosen_body, f"chosen-{uuid.uuid4()}")
    check("supplier payment: chosen purchase is settled",
          (status, [(a["purchase_id"], a["amount_cents"]) for a in chosen["allocations"]]),
          (201, [(purchase2["id"], 250)]))
    status, _ = post_json(
        "/api/v1/payments/supplier",
        token,
        {"supplier_id": supplier["id"], "amount_cents": 1, "method": "cash"},
        f"overpay-{uuid.uuid4()}",
    )
    check("supplier payment: cannot pay more than the open balance", status, 422)
    status, payables = call("GET", "/api/v1/payables", token)
    check("payables: fully settled supplier no longer appears",
          status == 200 and all(row["supplier_id"] != supplier["id"] for row in payables["suppliers"]), True)

    async def database_checks():
        async with AsyncSessionLocal() as db:
            product_row = await db.scalar(
                select(Product).where(Product.id == uuid.UUID(product))
            )
            inventory_rows = (
                await db.execute(
                    select(InventoryTransaction.quantity_change, InventoryTransaction.resulting_quantity)
                    .where(
                        InventoryTransaction.product_id == uuid.UUID(product),
                        InventoryTransaction.movement_type == "purchase",
                    )
                    .order_by(InventoryTransaction.created_at, InventoryTransaction.id)
                )
            ).all()
        check("database: purchase movements preserve resulting stock",
              [(change, resulting) for change, resulting in inventory_rows], [(2, 5), (1, 6)])
        check("database: weighted average cost is persisted",
              (product_row.stock_quantity, product_row.cost_price_cents), (6, 167))

        first = await ledger_for("purchase", purchase1["id"])
        check("ledger [purchase]: inventory debit, cash paid and supplier payable",
              [(code, debit, credit) for code, debit, credit, _ in first],
              [("1000", D(0), D("1.00")), ("1200", D("4.00"), D(0)), ("2000", D(0), D("3.00"))])
        check("ledger [purchase]: payable is tagged to the supplier",
              [str(sid) for code, _, _, sid in first if code == "2000"], [supplier["id"]])
        paid = await ledger_for("payment", payment["id"])
        check("ledger [supplier payment]: payable debit and bank credit balance",
              [(code, debit, credit) for code, debit, credit, _ in paid],
              [("1010", D(0), D("3.50")), ("2000", D("3.50"), D(0))])
        check("ledger [supplier payment]: supplier is tagged to payable debit",
              [str(sid) for code, _, _, sid in paid if code == "2000"], [supplier["id"]])
        await engine.dispose()

    asyncio.run(database_checks())
    check("smoke test completed", all(RESULTS), True)
    print(f"\n{sum(RESULTS)}/{len(RESULTS)} checks passed")


if __name__ == "__main__":
    main()
