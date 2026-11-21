import unittest

from app.schemas.auth import SignUpRequest
from app.schemas.organizations import OrganizationCreate


class OrganizationDefaultTests(unittest.TestCase):
    def test_signup_defaults_to_rwanda_launch_configuration(self):
        request = SignUpRequest(
            full_name="Rwanda Owner",
            phone_number="+250788123456",
            email="owner@example.com",
            password="Business123",
            business_name="Example Shop",
        )
        self.assertEqual(request.country, "RW")
        self.assertEqual(request.currency, "rwf")
        self.assertEqual(request.timezone, "Africa/Kigali")

    def test_additional_business_defaults_to_rwanda_launch_configuration(self):
        organization = OrganizationCreate(name="Second Shop")
        self.assertEqual(organization.country, "RW")
        self.assertEqual(organization.currency, "rwf")
        self.assertEqual(organization.timezone, "Africa/Kigali")

    def test_explicit_business_locale_is_preserved(self):
        organization = OrganizationCreate(
            name="London Shop",
            country="GB",
            currency="GBP",
            timezone="Europe/London",
        )
        self.assertEqual(organization.country, "GB")
        self.assertEqual(organization.currency, "gbp")
        self.assertEqual(organization.timezone, "Europe/London")


if __name__ == "__main__":
    unittest.main()
