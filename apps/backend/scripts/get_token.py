"""Dev helper: print an access token for your test user, for use in curl.

Usage (from backend/):   TOKEN=$(python -m scripts.get_token)
Needs DEV_EMAIL and DEV_PASSWORD in backend/.env (that file is gitignored).
"""
import json
import sys
import urllib.error
import urllib.request

from dotenv import dotenv_values


def main() -> None:
    env = dotenv_values(".env")
    url = (env.get("SUPABASE_URL") or "").rstrip("/")
    key = env.get("SUPABASE_ANON_KEY")
    email = env.get("DEV_EMAIL")
    password = env.get("DEV_PASSWORD")
    if not all([url, key, email, password]):
        sys.exit("Set SUPABASE_URL, SUPABASE_ANON_KEY, DEV_EMAIL and DEV_PASSWORD in backend/.env")

    request = urllib.request.Request(
        f"{url}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"apikey": key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            print(json.load(response)["access_token"])
    except urllib.error.HTTPError as exc:
        sys.exit(f"Sign-in failed ({exc.code}). Check DEV_EMAIL / DEV_PASSWORD and that the user is confirmed.")


if __name__ == "__main__":
    main()
