"""Smoke test for password, phone, callback setup, and trial-gate request validation.

Usage (server running, from backend/):   python -m scripts.smoke_auth_trial
Does not create an account or send email/SMS.
"""
import sys
import uuid

from scripts.smoke_catalog import BASE, RESULTS, call, check


def main():
    tag = uuid.uuid4().hex[:8]
    valid = {
        "full_name": "Auth Smoke",
        "phone_number": "+1 555 123 4567",
        "email": f"auth-smoke-{tag}@example.com",
        "password": "validPass123",
        "business_name": "Auth Smoke Business",
    }

    status, _ = call("GET", "/health")
    check("server is up", status, 200, fatal=True)

    status, _ = call("POST", "/api/v1/auth/signup", body={**valid, "password": "12345678"})
    check("signup rejects a digits-only password", status, 422)
    status, _ = call("POST", "/api/v1/auth/signup", body={**valid, "password": "lettersOnly"})
    check("signup rejects a letters-only password", status, 422)
    status, _ = call("POST", "/api/v1/auth/signup", body={key: value for key, value in valid.items() if key != "phone_number"})
    check("signup requires a phone number", status, 422)
    status, _ = call("POST", "/api/v1/auth/signup", body={**valid, "phone_number": "5551234567"})
    check("signup requires an international phone number", status, 422)

    status, _ = call("POST", "/api/v1/auth/complete-signup")
    check("account linking requires authentication", status, 401)
    status, _ = call(
        "POST",
        "/api/v1/auth/phone-verification/complete",
        body={"phone_number": "+15551234567"},
    )
    check("phone trial claim requires authentication", status, 401)

    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} auth/trial smoke checks passed")
    if passed != len(RESULTS):
        sys.exit(1)


if __name__ == "__main__":
    main()
