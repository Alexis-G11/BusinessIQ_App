# BusinessIQ Requirements Traceability

Status vocabulary: **PRESENT—UNVERIFIED** means relevant source exists without acceptance evidence; **PARTIAL** means only part of the requirement is present; **NOT IMPLEMENTED** means no adequate implementation was found; **NOT TESTED** means no execution evidence was produced. This is an initial source mapping, not an acceptance record.

| SRS IDs | Existing implementation evidence | Status | Required evidence or gap |
|---|---|---|---|
| FR-AUTH-001 | Signup request, backend user/organization transaction, and generic email-confirmation resend | PARTIAL | Confirmed-email callback, phone verification and new-account transaction integration tests; rate limits |
| FR-AUTH-002 | Supabase public signup requests an email confirmation to the configured callback and rejects a returned session (auto-confirm misconfiguration) | PARTIAL | Verify Supabase project confirmation setting, redirect allowlist/template, and full signup/callback/access flow in integration tests |
| FR-AUTH-003 | Supabase phone OTP and completion endpoint | PARTIAL | SMS setup and expiry/replay/rate-limit tests |
| FR-AUTH-004 | `app/auth.py` validates token signature, issuer, audience, and expiry | PRESENT—UNVERIFIED | JWT negative-path integration tests |
| FR-AUTH-005 | Supabase recovery UI and sign-out; backend token validation | PARTIAL | Session revocation, recovery and account lifecycle tests |
| FR-AUTH-006 | No MFA implementation found | NOT IMPLEMENTED | MFA policy and privileged-role tests |
| FR-AUTH-007 | Backend resolves owner/role permissions; client role claims are not authority | PRESENT—UNVERIFIED | Role-escalation tests |
| FR-AUTH-008 | No rate-limit middleware found | NOT IMPLEMENTED | Rate-limit and abuse tests |
| FR-BIZ-001 | `POST /organizations` creates an additional organization for a verified user | PARTIAL | API/database transaction, duplicate retry, and ownership tests |
| FR-BIZ-002 | Organization creation accepts business type, industry, country code, currency, timezone, address, contacts, and fiscal-year date; signup and additional-business setup now default to RW/RWF/Africa-Kigali while allowing supported locale choices | PARTIAL | Frontend does not yet collect fiscal-year start; test validation and settings-update lifecycle |
| FR-BIZ-003 | Creation seeds an owner membership, owner role, chart of accounts, trial decision, and independent trial | PARTIAL | Isolated database atomicity test; chart template remains fixed, not configurable |
| FR-BIZ-004 | `GET /organizations` returns only the user's memberships; Expo picker persists a selected ID and API requests validate it | PARTIAL | Two-business switch and altered-header negative tests |
| FR-BIZ-005 | API organization context checks membership | PRESENT—UNVERIFIED | Every route and altered-ID negative tests |
| FR-BIZ-006 | Membership API creates, lists, revokes, and accepts seven-day email-bound invitations; tokens are returned once and persisted only as SHA-256 digests. Owners/admins can invite only manager, accountant, employee, inventory_staff, or analyst; phone verification is required at acceptance. Expo Settings includes manual token sharing because no email provider is configured. | PARTIAL | Route authorization, tenant isolation, concurrency, expiry, replay, and database-backed acceptance tests; automated delivery; active member listing and role administration |
| FR-BIZ-007 | Invitation records retain inviter, accepter and revoker attribution. Active membership removal, role changes, owner transfer, and general append-only activity history are absent. | PARTIAL | Membership lifecycle endpoints and UI; preserve historical attribution on rejoin; owner-transfer policy and lifecycle tests |
| FR-BILL-001–005 | Phone verification and additional-business creation start server-timed seven-day trials; `organization_trial_decisions` records decision, reason, times, and observed signal list | PARTIAL | Migration/API integration tests; denial decisions, multi-signal abuse detection, recovery policy and verified signup integration remain gaps |
| FR-BILL-006–013 | Organization subscription placeholders; frontend status stub; no checkout/webhooks | NOT IMPLEMENTED | Per-business subscription model, signed durable events, reconciliation and tests |
| FR-OPS-001–004 | Product/category APIs and inventory movement/adjustment APIs | PARTIAL | Archive/search/bulk/transfer/opening-balance breadth and invariants |
| FR-OPS-005–008 | Purchase and supplier services update stock/accounting | PARTIAL | Orders, partial receipt, bulk imports, concurrency and override audit |
| FR-OPS-009–015 | Sales quote/create/list and payment recording; no invoice/return/refund/reversal suite | PARTIAL | POS, discounts/tax, partial payments, refunds, voids and idempotency coverage |
| FR-FIN-001 | Expo expense listing and creation use organization-scoped FastAPI routes; creation maps to categories/accounts and posts the backend expense/payment/journal transaction. Notes are stored through an additive migration; pure expense-ledger calculation tests cover paid/partial/unpaid arithmetic. | PARTIAL | Execute unit tests; add isolated migration/API/accounting tests, attachments, category lifecycle, currency-aware minor units, and end-to-end validation |
| FR-FIN-002–003 | Sales/purchases balances support receivables/payables; invoice/bill lifecycle absent | PARTIAL | Invoice/bill records, aging, due dates, partial settlement |
| FR-FIN-004–006 | Payment models and services allocate to selected source types | PARTIAL | Invoice allocation, currency/tenant/over-allocation constraints and accounting trace |
| FR-FIN-007 | Customer/supplier APIs exist | PARTIAL | Transaction history/search parity and tests |
| FR-ACC-001 | Default chart seeded per signup | PARTIAL | Configurable chart and account management |
| FR-ACC-002–003 | Journal service validates balancing in application code | PARTIAL | Journal APIs and database-level/concurrency evidence |
| FR-ACC-004 | Ledger and trial-balance services exist; income-statement and balance-sheet APIs derive values from posted journals; balance sheet includes current earnings and exposes the equation difference | PARTIAL | Cash-flow statement, execute authored fake-session contract tests in CI, live DB report tests, export and reproducibility tests |
| FR-ACC-005–006 | Some source services post journals transactionally | PARTIAL | Deterministic posting coverage for every source operation |
| FR-ACC-007–008 | No fiscal period or opening-balance workflow found | NOT IMPLEMENTED | Period lifecycle and migration evidence |
| FR-ACC-009 | `posted_by` exists; general append-only audit/reversal workflow absent | PARTIAL | Full actor/action audit and reversal tests |
| FR-ACC-010–012 | Income statement states period; balance sheet states as-of date; both identify organization currency, accrual basis, and posted-journal source. Fake-session tests cover tenant/date filters for both. Cash-flow classification and reconciliation are absent. | PARTIAL | Execute API tests in CI; live database tests; cash-flow method, bank reconciliation and full report reproducibility tests |
| FR-REP-001–006 | Tenant-scoped income-statement and balance-sheet APIs query posted journals; Expo Reports consumes both and marks period/as-of, currency, basis and source. Cash-flow statement is explicitly unavailable until classifications exist. Sales/expense detail lists remain operational summaries. | PARTIAL | Add date/dimension filters, export/audit, stale/incomplete-data indicators, execute API tests, add live DB tests and remaining report families |
| FR-DS-001–002 | Client-side summary calculations; no backend analytics service | PARTIAL | Validated tenant-scoped metrics and diagnostic tests |
| FR-DS-003–010 | ML libraries listed, no forecast/anomaly pipeline found | NOT IMPLEMENTED | Backtests, uncertainty, model cards, drift and evidence |
| FR-DS-011–012 | No cross-tenant training/labeling governance implementation found | NOT IMPLEMENTED | Consent/governance and explicit output labels |
| FR-AI-001–008 | Client keyword rules over loaded data; no backend assistant tools | NOT IMPLEMENTED | Permission-checked tools, grounded answers, injection and confirmation tests |
| FR-FILE-001–005 | No file service/storage integration found | NOT IMPLEMENTED | Private storage, validation, scanning, access audit and tests |
| FR-ADM-001 | `/auth/me` profile update exists; business/team admin absent | PARTIAL | Business settings and lifecycle APIs |
| FR-ADM-002–005 | No general audit event or support-access system found | NOT IMPLEMENTED | Append-only events, activity history, purpose-bound support tests |
| NFR-SEC-001–010 | Token checks, CORS configuration, generic error handler; no deployment proof or security pipeline | PARTIAL | HTTPS, secrets, rate limits, scans, pen test, secure uploads and evidence |
| AT-001–002 | One-org signup/listing source exists; no create/switch test suite | NOT TESTED | Two-business isolation acceptance tests |
| AT-003–005 | Billing/trial source contradicts SRS trial behavior | NOT TESTED | Independent billing and expiry scenarios |
| AT-006–008 | Sales/purchase/payment/accounting paths exist; no automated integration suite | NOT TESTED | Atomicity, balanced posting, and duplicate webhook tests |
| AT-009–010 | Forecast and backend AI tools absent | NOT IMPLEMENTED | Insufficient-history and cross-tenant denial tests |
| AT-011–012 | No backup/restore or file pipeline in repository | NOT IMPLEMENTED | Restore exercise and malicious-file rejection evidence |

All grouped ID ranges above include each ID in the range. No requirement is accepted as complete solely from source presence.
