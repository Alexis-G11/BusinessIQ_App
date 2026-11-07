from datetime import datetime, timedelta, timezone

from app.subscriptions import TRIAL_DAYS, has_feature_access, trial_expiry


def test_trial_expiry_is_seven_days_after_start():
    started_at = datetime(2026, 11, 7, 12, 30)
    assert trial_expiry(started_at) == datetime(2026, 11, 14, 12, 30)
    assert TRIAL_DAYS == 7


def test_phone_verification_is_required_even_for_active_subscription():
    assert not has_feature_access(
        phone_verified=False,
        subscription_status="active",
        trial_ends_at=None,
    )


def test_active_subscription_allows_verified_member():
    assert has_feature_access(
        phone_verified=True,
        subscription_status="active",
        trial_ends_at=None,
    )


def test_trial_is_accessible_until_its_end():
    now = datetime(2026, 11, 7, tzinfo=timezone.utc)
    assert has_feature_access(
        phone_verified=True,
        subscription_status="trialing",
        trial_ends_at=now + timedelta(seconds=1),
        now=now,
    )


def test_trial_expiry_is_exclusive():
    now = datetime(2026, 11, 7, tzinfo=timezone.utc)
    assert not has_feature_access(
        phone_verified=True,
        subscription_status="trialing",
        trial_ends_at=now,
        now=now,
    )


def test_inactive_status_does_not_grant_access_even_with_future_trial_end():
    now = datetime(2026, 11, 7, tzinfo=timezone.utc)
    assert not has_feature_access(
        phone_verified=True,
        subscription_status="past_due",
        trial_ends_at=now + timedelta(days=2),
        now=now,
    )
