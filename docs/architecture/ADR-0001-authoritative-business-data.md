# ADR-0001 Authoritative Business Data

- Status: Accepted by project owner in the master development instruction, 2026-11-07
- Decision owners: Project owner and engineering lead

## Context

The repository combines a PostgreSQL/FastAPI backend using `organization_id` with Expo code and SQL migrations that use Supabase tables keyed by `business_id`. Financial and inventory writes across two stores would create conflicting sources of truth and bypass backend transaction and permission logic.

## Decision

PostgreSQL is the only authoritative store for business and financial data. Expo sends all business operations to FastAPI. Supabase Auth may remain the identity provider, but direct client access to business tables is not a supported target. Keep `apps/legacy-web/` intact until the Expo client is verified to replace its needed workflows.

## Consequences

- Existing direct Supabase business-table calls must be migrated through backend services and APIs.
- Existing backend `organization_id` data and migrations are preserved; the separate frontend schema is not applied as a competing production model.
- API contracts and generated/typed client models must be kept aligned.
- RLS is defense in depth, not a substitute for API authorization. Its feasibility depends on the API database role and reliable per-transaction tenant context.

## Verification

Acceptance requires contract tests, tenant-negative tests, migration checks, and an audit proving that each business-data screen uses the backend. No such full evidence exists yet.
