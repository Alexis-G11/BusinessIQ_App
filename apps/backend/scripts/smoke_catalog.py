"""Smoke test for categories, customers, suppliers and products.

Usage (server running, from backend/):   python -m scripts.smoke_catalog
Each run creates uniquely named records, so it is safe to repeat.
"""
import json
import sys
import urllib.error
import urllib.request
import uuid

from dotenv import dotenv_values

BASE = "http://localhost:8000"
ENV = dotenv_values(".env")
RESULTS = []


def call(method, path, token=None, body=None, extra_headers=None):
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    if method == "POST" and path in ("/api/v1/products", "/api/v1/inventory/adjustments"):
        headers.setdefault("Idempotency-Key", f"smoke-{uuid.uuid4()}")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode()
            return response.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw
    except urllib.error.URLError:
        sys.exit("Cannot reach the server. Start it with: bash scripts/run_dev.sh")


def sign_in():
    url = (ENV.get("SUPABASE_URL") or "").rstrip("/") + "/auth/v1/token?grant_type=password"
    request = urllib.request.Request(
        url,
        data=json.dumps({"email": ENV.get("DEV_EMAIL"), "password": ENV.get("DEV_PASSWORD")}).encode(),
        headers={"apikey": ENV.get("SUPABASE_ANON_KEY") or "", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)["access_token"]
    except urllib.error.HTTPError as exc:
        sys.exit(f"Sign-in failed ({exc.code}). Check DEV_EMAIL and DEV_PASSWORD in .env")


def check(name, got, expected, fatal=False):
    ok = got == expected
    RESULTS.append(ok)
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok else f"   (got {got}, expected {expected})"))
    if not ok and fatal:
        sys.exit("Stopping: the checks after this one depend on it.")


def main():
    tag = uuid.uuid4().hex[:6]
    phone = "07" + str(uuid.uuid4().int)[:8]

    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)
    status, _ = call("GET", "/api/v1/products")
    check("request without a token is rejected", status, 401)
    token = sign_in()

    # --- categories ---
    status, cat = call("POST", "/api/v1/categories", token, {"name": f"Cat {tag}"})
    check("category: create", status, 201, fatal=True)
    status, _ = call("POST", "/api/v1/categories", token, {"name": f"cat {tag}"})
    check("category: duplicate name (other case) rejected", status, 409)
    status, _ = call("PATCH", f"/api/v1/categories/{cat['id']}", token, {"name": f"Renamed {tag}"})
    check("category: rename", status, 200)
    status, listing = call("GET", "/api/v1/categories", token)
    check("category: list shows the new name", status == 200 and any(c["name"] == f"Renamed {tag}" for c in listing), True)

    # --- customers ---
    status, cust = call("POST", "/api/v1/customers", token, {"name": f"Cust {tag}", "phone": phone, "email": ""})
    check("customer: create (blank email accepted)", status, 201, fatal=True)
    status, _ = call("POST", "/api/v1/customers", token, {"name": "Other", "phone": phone})
    check("customer: duplicate phone rejected", status, 409)
    status, _ = call("PATCH", f"/api/v1/customers/{cust['id']}", token, {"email": "ada@example.com"})
    check("customer: update email", status, 200)
    status, found = call("GET", f"/api/v1/customers?q={tag}", token)
    check("customer: search finds it", status == 200 and len(found) == 1, True)

    # --- suppliers ---
    status, sup = call("POST", "/api/v1/suppliers", token, {"name": f"Sup {tag}", "contact_name": "Sam"})
    check("supplier: create", status, 201, fatal=True)
    status, _ = call("POST", "/api/v1/suppliers", token, {"name": f"sup {tag}"})
    check("supplier: duplicate name (other case) rejected", status, 409)
    status, _ = call("PATCH", f"/api/v1/suppliers/{sup['id']}", token, {"email": "sam@example.com"})
    check("supplier: update email", status, 200)

    # --- products ---
    body = {
        "name": f"Prod {tag}", "sku": f"S-{tag}", "selling_price_cents": 500,
        "initial_stock": 5, "category_id": cat["id"], "supplier_id": sup["id"],
    }
    status, prod = call("POST", "/api/v1/products", token, body)
    check("product: create linked to category and supplier", status, 201, fatal=True)
    check("product: opening stock saved", prod["stock_quantity"], 5)
    status, _ = call("POST", "/api/v1/products", token, {"name": "Dup", "sku": f"S-{tag}", "selling_price_cents": 1})
    check("product: duplicate SKU rejected", status, 409)
    status, _ = call("PATCH", f"/api/v1/products/{prod['id']}", token, {"supplier_id": str(uuid.uuid4())})
    check("product: supplier from outside the business rejected", status, 422)
    status, _ = call("PATCH", f"/api/v1/products/{prod['id']}", token, {"selling_price_cents": 750})
    check("product: price update", status, 200)
    status, _ = call("DELETE", f"/api/v1/categories/{cat['id']}", token)
    check("category: delete refused while products use it", status, 409)
    status, _ = call("DELETE", f"/api/v1/products/{prod['id']}", token)
    check("product: archive", status, 204)
    status, listing = call("GET", f"/api/v1/products?q={tag}", token)
    check("product: archived item hidden from the default list", status == 200 and listing == [], True)

    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
