"""Smoke test for inventory adjustments, movement history and the stock summary.

Usage (server running, from backend/):   python -m scripts.smoke_inventory
Reuses the helpers from smoke_catalog.py. Safe to repeat: it creates a new product each run.
"""
import sys
import uuid

from scripts.smoke_catalog import RESULTS, call, check, sign_in


def adjust(token, product_id, idempotency_key=None, **fields):
    headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
    return call(
        "POST",
        "/api/v1/inventory/adjustments",
        token,
        {"product_id": product_id, **fields},
        extra_headers=headers,
    )


def main():
    tag = uuid.uuid4().hex[:6]

    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)
    status, _ = call("GET", "/api/v1/inventory/summary")
    check("summary without a token is rejected", status, 401)
    token = sign_in()

    body = {"name": f"Stock {tag}", "sku": f"I-{tag}", "selling_price_cents": 500,
            "cost_price_cents": 200, "initial_stock": 5}
    product_key = f"smoke-product-{uuid.uuid4()}"
    status, prod = call(
        "POST", "/api/v1/products", token, body,
        extra_headers={"Idempotency-Key": product_key},
    )
    check("product: create with 5 in stock", status, 201, fatal=True)
    status, replay = call(
        "POST", "/api/v1/products", token, body,
        extra_headers={"Idempotency-Key": product_key},
    )
    check("product creation replay returns original product", status == 200 and replay["id"] == prod["id"], True)
    status, _ = call(
        "POST", "/api/v1/products", token, {**body, "name": f"Changed {tag}"},
        extra_headers={"Idempotency-Key": product_key},
    )
    check("product idempotency key rejects a different request", status, 409)
    pid = prod["id"]

    adjustment_key = f"smoke-adjustment-{uuid.uuid4()}"
    status, move = adjust(token, pid, idempotency_key=adjustment_key, quantity_change=10, reason="found")
    check("adjust +10", status, 201)
    check("stock is now 15", move["resulting_quantity"], 15)
    status, replay = adjust(token, pid, idempotency_key=adjustment_key, quantity_change=10, reason="found")
    check("adjustment replay returns original movement", status == 200 and replay["id"] == move["id"], True)
    status, _ = adjust(token, pid, idempotency_key=adjustment_key, quantity_change=11, reason="found")
    check("adjustment idempotency key rejects a different request", status, 409)
    status, move = adjust(token, pid, quantity_change=-3, reason="damaged", note="dropped")
    check("adjust -3", status, 201)
    check("stock is now 12", move["resulting_quantity"], 12)
    status, _ = adjust(token, pid, quantity_change=-100, reason="lost")
    check("adjustment that would go negative is rejected", status, 422)

    status, move = adjust(token, pid, counted_quantity=20, reason="count_correction")
    check("stock count of 20 accepted", status, 201)
    check("count worked out +8 and stock 20", (move["quantity_change"], move["resulting_quantity"]), (8, 20))
    status, _ = adjust(token, pid, counted_quantity=20, reason="count_correction")
    check("count equal to current stock rejected", status, 422)
    status, _ = adjust(token, pid, quantity_change=1, counted_quantity=5, reason="other")
    check("sending both quantity fields rejected", status, 422)
    status, _ = adjust(token, pid, reason="other")
    check("sending neither quantity field rejected", status, 422)
    status, _ = adjust(token, pid, quantity_change=0, reason="other")
    check("zero change rejected", status, 422)
    status, _ = adjust(token, pid, quantity_change=1, reason="because")
    check("unknown reason code rejected", status, 422)
    status, _ = adjust(token, str(uuid.uuid4()), quantity_change=1, reason="found")
    check("unknown product gives 404", status, 404)

    status, rows = call("GET", f"/api/v1/inventory/movements?product_id={pid}", token)
    check("history: 4 movements, newest first", status == 200 and len(rows) == 4 and rows[0]["resulting_quantity"] == 20, True)
    status, rows = call("GET", f"/api/v1/inventory/movements?product_id={pid}&movement_type=adjustment", token)
    check("history filter: 3 adjustments", status == 200 and len(rows) == 3, True)
    status, fresh = call("GET", f"/api/v1/products/{pid}", token)
    check("product shows stock 20", fresh["stock_quantity"], 20)

    status, summary = call("GET", "/api/v1/inventory/summary", token)
    check("summary counts this product's stock and value",
          status == 200 and summary["units_in_stock"] >= 20 and summary["inventory_value_cents"] >= 4000, True)

    status, _ = call("DELETE", f"/api/v1/products/{pid}", token)
    check("product: archive", status, 204)
    status, _ = adjust(token, pid, quantity_change=1, reason="found")
    check("adjusting an archived product is rejected", status, 409)

    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
