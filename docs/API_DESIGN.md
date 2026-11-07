# BusinessIQ API Design

## Current API

FastAPI routes are versioned under `/api/v1` for auth, organizations, products, categories, customers, suppliers, inventory, sales, payments, purchases, and expenses. OpenAPI/docs are enabled outside production and disabled in production by current app configuration. Route presence does not establish working integration or stable contracts.

## Contract rules

- The API is authoritative for business reads/writes, calculations, role checks, entitlements, and transaction boundaries.
- Authenticate with a bearer token; accept organization context only as a request to select a business, then verify membership server-side.
- Use typed Pydantic request/response schemas, bounded list sizes, consistent errors, UTC timestamps, explicit currency, and stable identifiers.
- Use idempotency keys for retryable financial, inventory, webhook, import, and device operations; reject reuse with a different request body.
- Check each referenced child record belongs to the active organization before mutation.
- Version contracts and generate or validate TypeScript types from OpenAPI as coverage is added.
- Record correlation IDs and material audit events without sensitive payloads.

## Target domains

`/auth`, `/organizations`, `/memberships`, `/billing`, `/products`, `/inventory`, `/purchases`, `/sales`, `/customers`, `/suppliers`, `/expenses`, `/payments`, `/accounting`, `/tax`, `/reports`, `/analytics`, `/forecasts`, `/assistant`, `/files`, `/audit`, `/exports`, and `/devices`.

## Integration gap

The Expo API layer mixes backend calls with direct Supabase queries to a separate `business_id` schema. Migrate these operations to versioned APIs and retire the generic direct-table helper only after equivalent flows are verified. Preserve the legacy Vite app during this transition.

## Verification

Add OpenAPI schema snapshots/contract checks, authorization and tenant-negative tests, idempotency tests, pagination limits, and frontend API tests. No live API contract suite currently demonstrates end-to-end parity.
