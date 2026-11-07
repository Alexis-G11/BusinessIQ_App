# BusinessIQ Test Strategy

## Principles

Every requirement is mapped to code and test evidence. Label status as passed, failed, blocked, or not tested. Source presence, a visual screen, a smoke script, or a build alone is not acceptance evidence. Use isolated databases and provider sandboxes; never target production from tests.

## Layers

1. Pure unit tests: money/currency/rounding, transaction calculations, permissions, entitlements, accounting postings, report definitions, tax rules, and ML metrics.
2. Database integration: PostgreSQL constraints, transaction atomicity, row/advisory locks, idempotency races, allocation limits, and migration upgrade/forward-fix.
3. API/security: authentication failures, role matrix, membership lifecycle, subscription entitlements, nested cross-tenant IDs, files, reports, exports, jobs, and future AI/device APIs.
4. Contract tests: OpenAPI request/response/error schemas against Expo and retained Vite clients.
5. Frontend: typecheck, lint, web build, component tests, accessibility, route states, and browser/mobile E2E.
6. Provider integration: Supabase Auth lifecycle, SMS/email sandbox, billing signatures/retries/order, object storage, and AI provider failure/fallback.
7. Domain acceptance: SRS AT-001 through AT-012, including independent businesses, transactional sale/stock/payment/accounting, no invented forecast, restore, and malicious-file handling.
8. Operational: load and soak, observability, dependency/image scans, backup restore, recovery objectives, rollback and incident drills.

## Current baseline

Nine manual backend smoke scripts exist. A new pure unit test module and CI workflow provide the initial foundation. No test results beyond explicitly recorded command output should be claimed. Integration tests requiring PostgreSQL, Auth, billing, file, or AI services must use isolated test fixtures and explicit configuration.

## Commands

From `apps/backend/`, install `requirements-dev.txt` and run `python -m pytest tests`. From `apps/frontend/`, run `npm ci`, `npm run typecheck`, and `npm run build:web`. From `apps/legacy-web/`, run `npm ci`, `npm run typecheck`, and `npm run build`. The legacy app remains in CI until replacement parity is accepted.

## Phase 2 additions

- Test organization creation with verified and unverified callers; prove owner membership, role, chart, trial window, and decision record commit or roll back as one transaction.
- Test organization listing for two users with overlapping and disjoint memberships, including guessed IDs and role-specific summaries.
- Test switching between two owned workspaces and one joined workspace; verify each request's organization header and deny an altered non-member ID.
- Test account profile reads/updates without a selected organization; assert phone changes cannot bypass Supabase verification.
- Upgrade a disposable PostgreSQL database through the trial-decision migration, verify existing-trial backfill, RLS default deny, and downgrade/forward-fix behavior.

These scenarios remain planned. This increment has pure trial-window tests and frontend typecheck/build evidence only; the new routes and migration have not been exercised against PostgreSQL.
