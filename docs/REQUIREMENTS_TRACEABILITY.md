# BusinessIQ Requirements Traceability

Status vocabulary: **PRESENT—UNVERIFIED** means relevant source exists without acceptance evidence; **PARTIAL** means only part of the requirement is present; **NOT IMPLEMENTED** means no adequate implementation was found; **NOT TESTED** means no execution evidence was produced. This is an initial source mapping, not an acceptance record.

| SRS IDs | Existing implementation evidence | Status | Required evidence or gap |
|---|---|---|---|
| FR-AUTH-001 | Signup request and backend user creation | PARTIAL | Email verification is bypassed by confirmed-user creation; flow tests |
| FR-AUTH-002 | No enforced email-verification gate in current signup | NOT IMPLEMENTED | Verify email before protected access |
| FR-AUTH-003 | Supabase phone OTP and completion endpoint | PARTIAL | SMS setup and expiry/replay/rate-limit tests |
| FR-AUTH-004 | `app/auth.py` validates token signature, issuer, audience, and expiry | PRESENT—UNVERIFIED | JWT negative-path integration tests |
| FR-AUTH-005 | Supabase recovery UI and sign-out; backend token validation | PARTIAL | Session revocation, recovery and account lifecycle tests |
| FR-AUTH-006 | No MFA implementation found | NOT IMPLEMENTED | MFA policy and privileged-role tests |
| FR-AUTH-007 | Backend resolves owner/role permissions; client role claims are not authority | PRESENT—UNVERIFIED | Role-escalation tests |
| FR-AUTH-008 | No rate-limit middleware found | NOT IMPLEMENTED | Rate-limit and abuse tests |
| FR-BIZ-001 | Signup creates one organization; create route absent | PARTIAL | Additional business creation and ownership tests |
| FR-BIZ-002 | Organization has selected profile fields | PARTIAL | Required contacts, country/currency/timezone/fiscal configuration |
| FR-BIZ-003 | Signup seeds owner membership, role, and chart of accounts | PARTIAL | Configurable setup and atomicity tests |
| FR-BIZ-004 | Backend lists authorized organizations | PARTIAL | Frontend uses `/auth/me` only; switch tests |
| FR-BIZ-005 | API organization context checks membership | PRESENT—UNVERIFIED | Every route and altered-ID negative tests |
| FR-BIZ-006 | No invitation or team-management backend routes | NOT IMPLEMENTED | Invite lifecycle and permission tests |
| FR-BIZ-007 | No membership removal/lifecycle workflow | NOT IMPLEMENTED | Attribution retention and revocation tests |
| FR-BILL-001–005 | Phone-claim/trial migration and verification code exist; current signup sets active/no trial | PARTIAL | Correct seven-day eligibility, expiry, abuse and recovery policy |
| FR-BILL-006–013 | Organization subscription placeholders; frontend status stub; no checkout/webhooks | NOT IMPLEMENTED | Per-business subscription model, signed durable events, reconciliation and tests |
| FR-OPS-001–004 | Product/category APIs and inventory movement/adjustment APIs | PARTIAL | Archive/search/bulk/transfer/opening-balance breadth and invariants |
| FR-OPS-005–008 | Purchase and supplier services update stock/accounting | PARTIAL | Orders, partial receipt, bulk imports, concurrency and override audit |
| FR-OPS-009–015 | Sales quote/create/list and payment recording; no invoice/return/refund/reversal suite | PARTIAL | POS, discounts/tax, partial payments, refunds, voids and idempotency coverage |
| FR-FIN-001 | Expense API/service exists; Expo creation still writes a separate Supabase table | PARTIAL | One authoritative API flow, attachments, validation and tests |
| FR-FIN-002–003 | Sales/purchases balances support receivables/payables; invoice/bill lifecycle absent | PARTIAL | Invoice/bill records, aging, due dates, partial settlement |
| FR-FIN-004–006 | Payment models and services allocate to selected source types | PARTIAL | Invoice allocation, currency/tenant/over-allocation constraints and accounting trace |
| FR-FIN-007 | Customer/supplier APIs exist | PARTIAL | Transaction history/search parity and tests |
| FR-ACC-001 | Default chart seeded per signup | PARTIAL | Configurable chart and account management |
| FR-ACC-002–003 | Journal service validates balancing in application code | PARTIAL | Journal APIs and database-level/concurrency evidence |
| FR-ACC-004 | Ledger and trial balance services exist | PARTIAL | General-ledger and financial statement APIs |
| FR-ACC-005–006 | Some source services post journals transactionally | PARTIAL | Deterministic posting coverage for every source operation |
| FR-ACC-007–008 | No fiscal period or opening-balance workflow found | NOT IMPLEMENTED | Period lifecycle and migration evidence |
| FR-ACC-009 | `posted_by` exists; general append-only audit/reversal workflow absent | PARTIAL | Full actor/action audit and reversal tests |
| FR-ACC-010–012 | No reproducible report basis or reconciliation implementation found | NOT IMPLEMENTED | Basis, currency, cash/accrual, and reconciliation tests |
| FR-REP-001–006 | Client dashboard/report calculations exist; no report API/export | PARTIAL | Authoritative scoped report service and provenance/empty/stale tests |
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
