# BusinessIQ Development Status

Last updated: 2026-11-07

## Latest increment: business settings and audit history

- Implemented tenant-scoped GET/PATCH business settings requiring `settings.manage`. Owners/admins can update business identity, contacts, tax identifier, fiscal-year start, and IANA timezone. Country/currency are deliberately read-only until transaction conversion is designed.
- Wired the existing Settings → Business Profile link to a new Expo form. Added fiscal-year and timezone fields, profile/contact fields, and locale disclosure. Added an owner/admin Business Activity page and a tenant-scoped `audit.view` feed.
- Added an additive migration for tenant audit events with actor/action/target, low-PII changed-field details, RLS entitlement guard, and a trigger that rejects updates/deletes. Organization creation, settings updates, and invitation/membership lifecycle actions are recorded in the same transaction as the business change.
- Financial and stock transaction services now also insert audit events for sales, purchases, expenses, supplier payments, and inventory adjustments in the source transaction. Audit details exclude free-text notes and contact values. Reversal and complete mutation coverage remain future work.
- Added six database-free settings route/schema tests and two audit feed/permission contract tests. They cannot run on this host because FastAPI/SQLAlchemy/Pydantic are unavailable. Verification completed: Expo TypeScript reports zero diagnostics across 72 files; 17 selected backend invitation/money/report unit tests pass; Python AST parsing passes for 92 backend/migration/test files; the migration graph has 20 revisions, one head (`9e7a2c41d5b0`), and no missing parents; `git diff --check` passes. The 8 new route/schema tests, migration, trigger, RLS, and full UI behavior remain **NOT VERIFIED**.

## Latest increment: currency-aware amount entry and display

- Purchase defaults and product-derived unit costs now produce valid values for the selected currency exponent. Purchase totals, POS paid/discount placeholders, product and expense price placeholders, payment placeholders, and invoice totals use the business precision instead of hard-coded two-decimal formatting.
- Currency formatting fallbacks now preserve the currency code and selected exponent instead of assuming a dollar sign and two fraction digits.
- The underlying operational amount model remains a legacy integer scale of 100 per major unit; this does not add transaction-currency snapshots, FX conversion, or currency settlement support.
- Verification: 17 selected backend money/report/invitation tests pass; Expo TypeScript reports zero diagnostics across 70 files. No mobile/web runtime or database was available for UI/accounting integration tests.

## Increment: managed membership lifecycle

- Added an additive migration for soft-revocable memberships and tenant/time-indexed membership events. A PostgreSQL trigger rejects event updates/deletes. Member access is revoked without deleting the membership or its historical financial attribution; the actor is recorded. Existing organization and authentication lookup paths now ignore revoked memberships. RLS entitlement guards now cover invitation and membership-event rows and the helper checks active membership.
- Added owner/admin scoped active-member listing, assignment of the existing non-privileged role allowlist, and removal controls in Expo Settings. Owners and the acting administrator cannot be removed through this flow. Role changes, revocations, creation, and invitation-based reinstatements write membership events.
- Invitation acceptance can reinstate an inactive membership row and replace its role assignment, preserving the same membership identifier. Historical lifecycle events before this migration are unavailable and are not backfilled.
- Verification: 6 database-free route contract tests have been added but cannot run on this host because FastAPI/SQLAlchemy are absent. 17 pure invitation/money/report tests pass; Python AST parsing passes for 85 backend, migration, and test files; the migration graph has one head (`c6e72b9a314f`) and no missing parents; Expo TypeScript reports zero diagnostics across 70 files; `git diff --check` passes. Migration execution, PostgreSQL RLS/trigger/constraints/locking, API acceptance/rejoin, and end-to-end role controls are **NOT VERIFIED**.

## Latest increment: business member invitations

- Added an additive `organization_invitations` model/migration and tenant-scoped endpoints to create, list, revoke, and accept seven-day invitations. Only an SHA-256 token digest is stored; the raw high-entropy token is returned once. Invitation acceptance requires the signed-in account email to match and the account phone to be verified. Owner/admin roles cannot be granted through this flow.
- Added an Expo Team and invitations screen under Settings. Since no email provider is configured, an administrator must share the one-time token manually. No email is sent by the application.
- Verification: 3 pure invitation service tests pass under host Python 3.9; Python AST parsing passes for 83 backend, migration, and test files; Expo TypeScript reports zero diagnostics across 70 files; `git diff --check` passes. FastAPI/schema/API tests, migration execution, PostgreSQL concurrency behavior, and end-to-end invitation acceptance are **NOT VERIFIED** because this environment has no backend runtime dependencies or database.
- Remaining membership work includes database-backed verification, ownership transfer policy, historical event backfill policy, and automated delivery only after a mail provider is configured. See FR-BIZ-006/007 in the traceability matrix.

## Latest increment: keyboard-wedge barcode support

- The Expo barcode product-entry screen now has a USB/Bluetooth HID mode. The sales cart accepts the same keyboard-wedge scanner input and adds one exact active-product barcode match per Enter; repeated scans increment quantity. Unknown codes remain in the search field with an error so the operator can recover. Native OS camera scanning and manual entry remain available for product creation.
- This is a host-keyboard workflow, not a paired device protocol. No hardware has been physically tested. Bluetooth devices must be paired by the operating system and configured to send Enter. Optional ESP32 Wi-Fi integration remains unimplemented and requires its own authenticated device protocol.
- Verification: Expo TypeScript reports zero diagnostics across 70 files. Physical device, browser, mobile scanner behavior, POS cart interaction and duplicate/unknown barcode handling are **NOT VERIFIED**.

## Latest increment: Rwanda launch defaults

- Signup and additional-business schemas, ORM defaults, frontend signup payload, and onboarding form now consistently default new businesses to RW/RWF/Africa-Kigali. Existing organization rows and financial records are not changed; explicit supported locale selections remain available.
- Added schema tests for both default paths and explicit override behavior. These require the backend runtime dependencies and need CI execution on this host.
- Verification: Expo TypeScript reports zero diagnostics, and Python AST parsing passes. This host's Python 3.9 has no Pydantic runtime and cannot execute the schema test; the repository CI installs backend requirements under Python 3.12.

## Latest increment: journal-backed balance sheet

- Added an organization-scoped `reports.view` API for balance-sheet balances through an as-of date. Current earnings through that date are included in equity until fiscal period closing is implemented. The response identifies currency, accrual basis, source, and whether assets equal liabilities plus equity; it returns the difference without forcing a correction.
- Expo Reports now displays asset, liability, equity, current-earnings and equation totals. Cash-flow reporting remains explicitly unavailable because the accounts do not yet classify operating/investing/financing cash movements.
- Added pure tests for the balance equation, drawings, and imbalance detection; fake-session API tests cover tenant/date/status filters for both report endpoints. API route tests remain unrun locally because FastAPI/SQLAlchemy are absent; no PostgreSQL instance was contacted. See ADR-0003 for the accounting rationale and reporting limitations.

## Latest increment: journal-backed income statement

- Added a permission-protected, organization-scoped income statement endpoint for required start/end dates. It reads only posted journal entries, uses account classes and Decimal arithmetic, and includes net revenue (including contra-revenue), COGS, gross profit, operating expenses/income, other income/expense, and net income.
- Expo Reports now requests the statement and identifies period, currency, accrual basis, and source. The old revenue-minus-expenses “profit” and “cash flow” approximations were removed from this page; cash flow is explicitly shown as unavailable pending classification and reconciliation support.
- Pure income-statement calculations have tests for COGS, contra-revenue, other income/expense, and empty periods. API/database integration evidence and the balance sheet/cash-flow statement are still required.
- Added fake-session API contract tests for income-statement tenant/date/status filters, reversed date rejection, and report permission denial. They make no database/provider calls.
- Verification: 11 pure backend money/report tests pass; the Expo TypeScript check has zero diagnostics; Python AST parsing passes. This host has no installed FastAPI/SQLAlchemy backend runtime, so neither the new API contract test nor PostgreSQL query execution could be run locally. CI has the runtime dependencies; no database-backed report test exists yet.

## Latest increment: currency precision enforcement bridge

- Added `organizations.currency_exponent` in additive migration `5ec2a4b9d710`; existing organizations receive exponent 2 to preserve historical amount interpretation.
- New organization creation derives exponent from its selected currency. Backend write paths for products, sales, purchases, expenses, and customer/supplier payments validate configured precision. Sale tax rounds half-up to the organization exponent.
- Expo money input and formatting use the selected business exponent.
- Operational amount columns still store hundredths of a major unit. This bridge does not complete SRS requirements for transaction currency codes, FX/base-currency snapshots, or multi-currency settlement. The migration was not applied to a database.
- Currency fraction digits follow supported currency data; CLDR describes the supplemental currency fraction digits at [Unicode CLDR number formatting](https://unicode.org/reports/tr35/tr35-numbers.html). Production should pin and review an explicit supported-currency table.
- Verification for this increment: pure backend money/sale calculation tests pass (9 tests), Expo TypeScript reports zero diagnostics, Python AST parsing passes, and the migration source graph has one head (`5ec2a4b9d710`). Full backend suite unavailable on this host because its Python 3.9 lacks the repository test dependency `pytest` (CI uses Python 3.12); no database migration was applied.

## Repository

- Branch: `codex/businessiq-development`
- Starting commit: `d932a3c` (`Prepare latest BusinessIQ project`)
- Starting tree: clean; branch was created from `main` without changing or resetting it.
- The attached SRS and repository SRS have identical SHA-256 hashes.

## Completed

- Read the SRS and audited the existing repository source, migrations, frontend clients, smoke scripts, and documentation.
- Added initial architecture/ADR, roadmap, traceability, security, database, API, test, deployment, integration, changelog, and status documents.
- Added backend placeholder environment template and declared PyJWT directly.
- Added six pure unit tests and CI workflow jobs for backend and both frontend apps.
- Corrected new-account trial lifecycle: signup stays pending until phone verification, the seven-day clock starts after verification, and protected business routes now enforce phone and entitlement status. `/auth/me` remains available to complete the verification flow.
- Wired multi-business listing, creation, and switching through the backend organization API and the existing Expo picker/onboarding UI. Added a user-profile endpoint independent of business selection and removed unverified phone-number mutation from profile updates.
- Added the invitation and membership lifecycle APIs and Expo team workflow; database-backed authorization, tenant-isolation, expiry, replay and acceptance evidence remains outstanding.
- Added an additive migration to persist trial start and per-business eligibility decisions. Existing migrations were not edited or applied.
- Replaced administrative email auto-confirmation with Supabase public signup, the configured confirmation callback, generic confirmation resend, and a fail-closed check when signup returns an authenticated session. Updated the Expo signup flow and auth setup instructions.
- Added an independent confirmed-email check to `/auth/complete-signup` before account linking/setup and corrected the missing `date` import referenced by `OrganizationOut.fiscal_year_start`.
- Replaced the Expo expense screen's direct legacy-table create/list with organization-scoped backend expense/category/account APIs. The adapter maps accounting amounts, payment methods, categories, notes, and stable per-form idempotency keys. Added a nullable `expenses.notes` field through new additive migration `a84d6c21f903`.
- Fixed the backend CI job's working directory so `app.*` imports resolve from `apps/backend`, and added pure expense calculator tests for paid, partial, unpaid, invalid amount and payment-account cases.

## Verification this batch

- Branch creation and starting Git state: verified locally.
- SRS file identity: verified by matching SHA-256.
- Pure backend unit tests: **11 passed** under bundled Python 3.12 with pytest, including deterministic subscription entitlement boundaries.
- Python syntax compilation: **passed** for backend source and tests using a writable temporary bytecode cache. An initial attempt using the host's default cache failed due to a filesystem permission error; the retry succeeded without writing generated files into the repository.
- `git diff --check`: **passed**.
- Expo app `npm run typecheck`: **passed** under Node 24.22.1.
- Expo web export: **passed** with placeholder build-time API/Supabase values; this verifies bundling only, not connectivity or runtime behavior.
- Expo lockfile security update: bumped compatible nested `shell-quote` to 1.12.0, `ws` 7.x to 7.5.13, and `ws` 8.x to 8.21.0. `npm audit` now reports 0 critical, 9 high, 17 moderate, and 1 low findings across the complete development dependency tree. Remaining issues need separate triage; a clean audit is not claimed.
- Legacy frontend: typecheck and production build **passed**; Vite updated to 6.4.5 and `npm audit` reports 0 vulnerabilities.
- Trial change Python syntax compilation and `git diff --check`: **passed**.
- Multi-business Expo TypeScript check and web export: **passed**. Backend source/migration syntax compilation and **12 pure unit tests passed**.
- Email confirmation change Python AST syntax validation and `git diff --check`: **passed**. Runtime auth/API verification was unavailable in this environment: Node/npm are absent, the host Python is 3.9, and no Supabase or database connection was attempted.
- Expo TypeScript compiler API check after expense integration: **0 diagnostics**. Backend and migration Python AST parsing: **passed**; a source graph check found 16 revisions, one head (`a84d6c21f903`), and no missing parent revisions. Migration/API/database behavior and backend pytest remain **NOT VERIFIED**.
- CI workflow and expense tests were updated but not executed locally; the runtime lacks Python 3.12 and the backend dependency environment. GitHub Actions must provide the execution evidence.
- Database migration or live schema: **not checked**; no database connection was made.
- Supabase, Stripe, SMS/email, AI, storage, cloud, RRA: **not configured or tested**.
- No secrets were read, printed, or copied.

## Phase 1 remaining

- Run the complete CI workflow in GitHub after branch publication; local backend dependency setup could not complete because native cryptography build dependencies were unavailable in the sandbox.
- Triage remaining Expo development dependency advisories and run mobile-platform validation on supported devices/simulators.
- Review the CI workflow syntax and run it in GitHub after branch publication.
- Compare all ORM metadata against migrations and, only with a safe isolated DB, verify upgrade paths.
- Add a supported local bootstrap that does not kill unrelated processes or require production credentials.
- Decide and implement the currency-aware money representation and safe migration plan before RWF transaction data is introduced.
- Add database-backed tests for signup, phone verification/trial claims, protected-route denial and cross-tenant access. The entitlement predicate's unit tests do not prove route integration or migration/RLS behavior.
- Apply migration head `a84d6c21f903` only after isolated PostgreSQL upgrade/backfill/RLS tests; test organization creation, owner-role seeding, chart initialization, expense creation/list, list/switch, and tenant-denial end to end.
- Implement fiscal-year selection and configurable chart templates; add creation idempotency and multi-signal trial-abuse controls before production.
- Add auth flow tests for confirmation required, callback completion, resend behavior, and auto-confirm misconfiguration; evaluate recovery and rate limits in the same auth lifecycle.
- Migrations `c92fa24d7e10` and `a84d6c21f903` are authored but not applied.

## Next milestone

Continue Phase 2: verify trial enforcement through API/database integration tests, build multi-business create/switch and membership lifecycle, and add tenant-isolation tests. Preserve `apps/legacy-web/` throughout.
