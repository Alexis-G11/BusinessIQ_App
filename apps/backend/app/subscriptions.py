from datetime import datetime, timezone


def has_feature_access(
    *,
    phone_verified: bool,
    subscription_status: str,
    trial_ends_at: datetime | None,
    now: datetime | None = None,
) -> bool:
    """Return whether an organization can use paid business features.

    Database timestamps are stored as naive UTC. The helper also accepts aware
    datetimes so callers and tests can supply either representation safely.
    """
    if not phone_verified:
        return False
    if subscription_status == "active":
        return True
    if subscription_status != "trialing" or trial_ends_at is None:
        return False

    current = now or datetime.now(timezone.utc)
    end = trial_ends_at
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    else:
        current = current.astimezone(timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    else:
        end = end.astimezone(timezone.utc)

    return end > current
