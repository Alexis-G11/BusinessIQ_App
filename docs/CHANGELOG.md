# BusinessIQ Changelog

## 2026-11-07 — Managed membership lifecycle

- Added soft-revocation fields to business membership and a tenant-scoped event table for created, role-changed, revoked, and reinstated events. A database trigger makes event rows immutable. Existing memberships remain active by default; no rows are deleted or rewritten by the migration.
- Added authorized active-member listing, non-privileged role changes, and removal. Business owners and an acting administrator cannot be removed through this flow. Removed users are excluded from business selection and API organization context.
- Invitation acceptance now reactivates a previously removed membership and updates its role while preserving the membership identifier and lifecycle events.
- Added six database-free membership route contract tests. They require the CI backend runtime; migration and database behavior remain unverified locally.

## 2026-11-07 — Business member invitations

- Added an additive invitation table and tenant-scoped create/list/revoke/accept endpoints. Invitation tokens are high entropy, expire after seven days, are bound to the invited email, and are stored only as SHA-256 digests. Acceptance requires a phone-verified authenticated account.
- Added an Expo Team and invitations screen. The token is displayed once for manual sharing; automated delivery is unavailable because no email provider is configured.
- Added pure token, expiry, and role-allowlist tests. Runtime API/database verification and full member lifecycle management remain outstanding; see `DEVELOPMENT_STATUS.md` and `REQUIREMENTS_TRACEABILITY.md`.

## 2026-11-07 — Rwanda launch defaults

- Signup and additional-business onboarding now default new organizations to RW, RWF, and `Africa/Kigali`, matching the approved initial launch configuration. Explicit supported locales remain selectable for additional businesses.
- Existing organizations are unchanged. No migration or historical data rewrite was needed.
- Added schema-default tests for signup, additional-business creation, and explicit locale overrides.

## 2026-11-07 — Journal-backed balance sheet

- Added `GET /api/v1/reports/balance-sheet?as_of=...`, protected by `reports.view` and organization membership. It derives balances from posted journals, includes current earnings in equity, and returns the accounting-equation difference and balance flag.
- Added balance-sheet rendering to Expo Reports. A non-zero difference is surfaced for investigation rather than hidden.
- Added arithmetic tests and fake-session API contract coverage. Cash-flow statements, database-backed tests, current/non-current presentation, and jurisdiction-specific accounting review remain outstanding.

## 2026-11-07 — Journal-backed income statement

- Added `GET /api/v1/reports/income-statement`, requiring the existing `reports.view` permission and an authorized organization context. It aggregates posted journal lines in a required date range and reports net revenue, COGS, gross profit, expenses, other income/expense, and net income using Decimal arithmetic.
- The Expo Reports screen now uses the backend statement, states its period/currency/accrual basis/source, and no longer presents revenue minus expenses as net profit or as cash flow.
- Balance sheet, classified cash flow, reconciliation, report export, and report integration tests remain outstanding.

## 2026-11-07 — Currency precision enforcement bridge

- Added organization currency precision and an additive migration that preserves existing organizations at their historical two-decimal interpretation.
- New organization setup derives precision from its selected supported currency. Sales, product prices, purchases, expenses, and payments reject values smaller than the currency unit; sale tax rounds half-up to that precision.
- Expo money input and formatting now follow the selected business precision.
- Operational values remain encoded as hundredths for compatibility. Per-transaction currency codes, FX snapshots, and a complete SRS-aligned monetary schema remain future work; the migration was not applied to a database.

## 2026-11-07 — Development foundation started

- Created the owner-requested `codex/businessiq-development` branch from the clean repository `main` commit; `main` was not modified.
- Added architecture and currency decision records, implementation roadmap, initial SRS traceability, security/database/API/test/deployment/integration documents, and development status.
- Added a backend `.env.example` containing placeholders only.
- Replaced the unused `python-jose` requirement with direct `PyJWT[crypto]` declaration to match `app/auth.py` imports.
- Added pure unit tests for current two-decimal money conversion and sale calculation behavior, plus initial backend and frontend CI jobs.
- Verification results and limitations are recorded in `DEVELOPMENT_STATUS.md`; no database or external provider was contacted.

## 2026-11-07 — Frontend verification and dependency hardening

- Fixed Expo inventory screens to use existing design tokens and corrected billing UI types.
- Removed fabricated subscription plan/status values from the client summary; plan is now nullable where the API does not return it, and status is derived from `/auth/me`.
- Updated the Expo lockfile's vulnerable transitive `shell-quote` and `ws` versions while keeping major-version compatibility.
- Updated the preserved legacy web app's Vite patch version to 6.4.5.
- Expo TypeScript check and web export passed; legacy typecheck and production build passed. Expo dependency audit still reports 27 noncritical findings (9 high, 17 moderate, 1 low). See `DEVELOPMENT_STATUS.md`.

## 2026-11-07 — Trial entitlement enforcement

- New organizations now remain pending until phone verification; phone numbers are stored as pending contact data and the seven-day trial starts only after Supabase confirms the phone.
- Account setup now routes users with an unverified phone to the existing verification flow.
- Backend business permission dependencies require phone verification and an active subscription or unexpired trial. The owner role does not bypass subscription entitlement.
- Updated signup copy to describe phone verification and the trial accurately.
- Added five deterministic entitlement tests. The complete pure backend suite passes (11 tests); API/database integration and email verification remain outstanding.

## 2026-11-07 — Multi-business workflow increment

- Added authenticated organization creation and membership listing; creation seeds the owner role, default chart of accounts, an independent seven-day trial, and a per-business trial decision record.
- Added additive migration `c92fa24d7e10` for trial start/decision persistence with an existing-trial backfill; no migration was applied.
- Connected the existing Expo business picker and onboarding form to these organization APIs, and added identity profile endpoints that work without a selected business.
- Removed direct profile phone mutation so a user cannot replace their verified phone without a verification flow.
- Frontend typecheck and web export passed; 12 pure backend unit tests passed. The database migration and backend route transactions still require isolated PostgreSQL integration tests; trial-abuse detection and fiscal-year selection are incomplete.

## 2026-11-07 — Email verification and expense API integration

- Replaced the Supabase administrative email-confirmation bypass with public signup and confirmation/resend requests to the configured callback. The backend rejects a signup that unexpectedly returns a session and independently verifies the confirmed-email timestamp during account setup.
- Connected Expo expense listing/creation to the organization-scoped FastAPI endpoints, mapped expense categories and payment methods, preserved notes, and supplied idempotency keys.
- Added additive migration `a84d6c21f903` for nullable backend expense notes; source graph has one head. The migration and expense/accounting flow remain untested against PostgreSQL/Supabase.
- Corrected the backend CI working directory so the test runner can resolve the `app` package, and added pure coverage for expense journal arithmetic and payment validation.
- Expo TypeScript compiler check passed with zero diagnostics; Python AST and migration graph checks passed. Backend tests and runtime authentication/expense checks were unavailable in this host environment.
