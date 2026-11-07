import unittest
from datetime import datetime, timedelta, timezone

from app.services.invitations import (
    INVITATION_DAYS,
    hash_invitation_token,
    invitation_expiry,
    is_invitable_role,
    issue_invitation_token,
)


class InvitationServiceTests(unittest.TestCase):
    def test_raw_invite_token_is_high_entropy_and_storage_uses_digest(self):
        token, digest = issue_invitation_token()
        self.assertGreaterEqual(len(token), 40)
        self.assertEqual(digest, hash_invitation_token(token))
        self.assertEqual(len(digest), 64)
        self.assertNotEqual(token, digest)

    def test_invitation_expires_after_seven_days_in_naive_utc(self):
        now = datetime(2026, 11, 7, 12, 0, tzinfo=timezone(timedelta(hours=2)))
        expiry = invitation_expiry(now)
        self.assertEqual(expiry, datetime(2026, 11, 14, 10, 0))
        self.assertIsNone(expiry.tzinfo)
        self.assertEqual(INVITATION_DAYS, 7)

    def test_invitable_roles_cannot_transfer_owner_or_admin_authority(self):
        self.assertTrue(is_invitable_role("accountant"))
        self.assertTrue(is_invitable_role("employee"))
        self.assertFalse(is_invitable_role("owner"))
        self.assertFalse(is_invitable_role("admin"))
        self.assertFalse(is_invitable_role("unknown"))


if __name__ == "__main__":
    unittest.main()
