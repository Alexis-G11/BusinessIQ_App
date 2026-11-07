# BusinessIQ External Integrations

| Integration | Intended role | Repository status | External configuration or decision |
|---|---|---|---|
| Supabase Auth | Identity, email and phone verification | Token validation/client foundations exist; lifecycle not fully compliant | Project, redirect allow-list, SMTP, SMS provider, MFA and verified-flow tests |
| PostgreSQL | Sole business/financial database | Models, services and Alembic migrations exist | Confirm authoritative instance, role, RLS/tenant context, backups and applied revision |
| Subscription billing | Hosted checkout, subscription status and provider events | Stripe key client only; no checkout/webhook routes | Confirm merchant country/entity/bank/provider eligibility; pricing and plan policy |
| AI provider | Optional assistant generation | Optional key and package only; no backend assistant | Provider, data processing/retention, consent, safety and credentials |
| Email/SMS | Verification and account recovery | Auth SDK flows exist; delivery unverified | Provider settings, templates, limits, sender/domain, supported launch-market delivery |
| Cloud platform | API, DB, secrets, artifacts and monitoring | No deployment configuration found | Approve topology, projects, IAM, network, regions, budget and operations |
| Rwanda RRA EBM/VSDC | Optional certified invoicing path | No implementation found | Official protocol, credentials, sandbox, certification and legal approval |
| Object storage/scanning | Private receipts, invoices and exports | No integration found | Provider, region, malware scanning, lifecycle, key management and access policy |
| Barcode devices | Camera, HID scanners, optional ESP32 | Camera screen and manual entry present; no device protocol | Hardware compatibility tests, secure pairing protocol and device provisioning |

External accounts and secrets are owner-provisioned. Code, placeholders, or build-time placeholders do not indicate a service is configured or operational.
