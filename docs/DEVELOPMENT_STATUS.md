# BusinessIQ Development Status

Last updated: 2026-11-07

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
