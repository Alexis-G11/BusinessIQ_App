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
| Barcode devices | Camera, USB/Bluetooth HID scanners, optional ESP32 | Mobile camera and manual product entry exist. Product entry and POS accept standard keyboard-wedge input terminated by Enter; exact active-product POS scans add to the cart and repeated scans increment quantity. USB and OS-paired Bluetooth HID scanners need no vendor SDK. This is source/typecheck verified only; physical devices are untested. No ESP32 protocol, pairing, device identity or ingestion endpoint exists. | Validate supported camera symbologies and physical HID devices across web/mobile; document scanner Enter suffix; for ESP32 define authenticated tenant-scoped pairing, TLS/device credentials, replay protection, event idempotency, firmware update and network-loss behavior before implementation |

External accounts and secrets are owner-provisioned. Code, placeholders, or build-time placeholders do not indicate a service is configured or operational.
