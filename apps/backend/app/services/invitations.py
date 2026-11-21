from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone


INVITATION_DAYS = 7
INVITABLE_ROLES = frozenset({"manager", "accountant", "employee", "inventory_staff", "analyst"})


def issue_invitation_token() -> tuple[str, str]:
    """Return a 256-bit opaque token and its SHA-256 storage digest."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_invitation_token(raw)


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def invitation_expiry(now: datetime | None = None) -> datetime:
    """Return a naive UTC expiry for the database's existing timestamp convention."""
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return (current.astimezone(timezone.utc) + timedelta(days=INVITATION_DAYS)).replace(tzinfo=None)


def is_invitable_role(role: str) -> bool:
    """Roles that tenant admins may grant without transferring ownership or admin power."""
    return role in INVITABLE_ROLES
