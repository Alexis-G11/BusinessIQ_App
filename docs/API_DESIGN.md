# BusinessIQ API Design

## Current API

FastAPI routes are versioned under `/api/v1` for auth, organizations, products, categories, customers, suppliers, inventory, sales, payments, purchases, expenses, and reports. The income-statement route reads posted journal activity for an explicit date range and returns its currency, accrual basis, and source. OpenAPI/docs are enabled outside production and disabled in production by current app configuration. Route presence does not establish working integration or stable contracts.

## Contract rules

- The API is authoritative for business reads/writes, calculations, role checks, entitlements, and transaction boundaries.
- Authenticate with a bearer token; accept organization context only as a request to select a business, then verify membership server-side.
- Use typed Pydantic request/response schemas, bounded list sizes, consistent errors, UTC timestamps, explicit currency, and stable identifiers.
- Use idempotency keys for retryable financial, inventory, webhook, import, and device operations; reject reuse with a different request body.
- Check each referenced child record belongs to the active organization before mutation.
- Version contracts and generate or validate TypeScript types from OpenAPI as coverage is added.
- Record correlation IDs and material audit events without sensitive payloads.

`GET /api/v1/auth/profile` and `PATCH /api/v1/auth/profile` operate on the authenticated identity without selecting a business. `GET /api/v1/organizations` lists only the current user's memberships. `POST /api/v1/organizations` creates a workspace for a phone-verified user, seeds its owner access and default chart, and starts a server-timed seven-day trial. Expo selection is local UI state; every business API request still sends `X-Organization-Id`, which the backend validates against membership.

Signup and additional-organization creation default new businesses to country `RW`, currency `RWF`, and timezone `Africa/Kigali`. Additional organizations may explicitly select another supported locale. These defaults do not assign jurisdictional tax rates.

`GET /api/v1/reports/income-statement?from=YYYY-MM-DD&to=YYYY-MM-DD` requires `reports.view`, resolves the selected organization through membership, and returns totals aggregated from posted journal lines only. The response states the date range, organization currency, accrual basis, and `posted_journal_entries` provenance. `GET /api/v1/reports/balance-sheet?as_of=YYYY-MM-DD` returns cumulative posted balances through the business-local date, includes current earnings in equity, and exposes the accounting-equation difference. It does not yet provide a classified cash-flow statement.

## Target domains

`/auth`, `/organizations`, `/memberships`, `/billing`, `/products`, `/inventory`, `/purchases`, `/sales`, `/customers`, `/suppliers`, `/expenses`, `/payments`, `/accounting`, `/tax`, `/reports`, `/analytics`, `/forecasts`, `/assistant`, `/files`, `/audit`, `/exports`, and `/devices`.

## Integration gap

The Expo API layer mixes backend calls with direct Supabase queries to a separate `business_id` schema. Migrate these operations to versioned APIs and retire the generic direct-table helper only after equivalent flows are verified. Preserve the legacy Vite app during this transition.

## Verification

The income-statement route has a fake-session API contract test for tenant/date/status query scoping, reversed date rejection, and permission denial. It does not prove a live PostgreSQL query. Add OpenAPI snapshots, broader authorization/tenant-negative tests, idempotency tests, pagination limits, database-backed report tests, and frontend API tests. No live API contract suite currently demonstrates end-to-end parity.
