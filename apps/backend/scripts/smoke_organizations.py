"""Smoke test for the authenticated organization-list endpoint.

Usage (server running, from backend/): python -m scripts.smoke_organizations
This test is read-only and does not create or alter business data.
"""
import sys

from scripts.smoke_catalog import BASE, RESULTS, call, check, sign_in


def main():
    status, _ = call("GET", "/api/v1/organizations")
    check("organization list without a token is rejected", status, 401, fatal=True)

    token = sign_in()
    status, organizations = call("GET", "/api/v1/organizations", token)
    check("authenticated organization list responds", status, 200, fatal=True)
    check("organization list response is an array", isinstance(organizations, list), True, fatal=True)

    me_status, me = call("GET", "/api/v1/auth/me", token)
    check("current organization endpoint responds", me_status, 200, fatal=True)

    current = next(
        (
            item for item in organizations
            if item.get("organization", {}).get("id") == me["organization"]["id"]
        ),
        None,
    )
    check("current organization appears in the user's membership list", current is not None, True)
    if current is not None:
        check("membership includes owner status", isinstance(current.get("is_owner"), bool), True)
        check("membership includes role field", "role" in current, True)
        check(
            "organization includes subscription and locale fields",
            all(
                field in current["organization"]
                for field in ("subscription_status", "currency", "timezone")
            ),
            True,
        )
    check(
        "organization IDs are unique",
        len({item["organization"]["id"] for item in organizations}) == len(organizations),
        True,
    )

    passed = sum(RESULTS)
    print(f"\n{passed}/{len(RESULTS)} checks passed")
    sys.exit(0 if passed == len(RESULTS) else 1)


if __name__ == "__main__":
    main()
