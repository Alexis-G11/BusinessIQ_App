# BusinessIQ Database Design

## Authority and existing shape

PostgreSQL is the target single source of truth for business and financial data. Existing SQLAlchemy models center on `organizations`; membership/role tables associate users to organizations; operational entities include products, inventory transactions, sales, purchases, expenses, customers, suppliers, payments, and payment allocations; accounting entities include accounts, journal entries, and journal lines.

Alembic contains 19 source revisions with source head `c6e72b9a314f`. This source graph includes additive currency, invitation, and membership-lifecycle revisions. The current database revision, extensions, indexes, grants, RLS state, and data quality are unknown because no database inspection was performed. Preserve every existing migration; use additive, reviewed migrations for changes.

The current development increment adds `organizations.trial_started_at` and an `organization_trial_decisions` row per business. The decision stores its actor, decision/reason, start/expiry times, and observed abuse-signal list. RLS is enabled with no authenticated-user policy; the API service role is the only application writer. Migration `c92fa24d7e10` backfills start time as seven days before the recorded end for existing trialing organizations. It is authored but not applied or tested against PostgreSQL in this workspace.

Migration `a84d6c21f903` adds nullable notes to backend expenses so the Expo expense form can preserve notes through the tenant-scoped API. This additive migration is source-reviewed only; it has not been applied or exercised against an isolated database.

Migration `5ec2a4b9d710` adds `organizations.currency_exponent`, backfilled to 2 to preserve every existing organization's historical integer amount meaning. New organizations derive an exponent from the supported currency list. The income-statement API aggregates posted journal lines by account class; report execution against PostgreSQL remains unverified.

Migration `f4b91d6a2e73` adds one-time organization invitations. Migration `c6e72b9a314f` adds soft membership revocation with actor attribution, membership lifecycle events, RLS entitlement guards for the new tenant tables, and a trigger that rejects membership-event updates and deletes. The entitlement helper now excludes revoked memberships. These migrations have source-only verification; none has been applied to a database in this workspace.

## Existing integrity mechanisms

The schema and services include tenant-scoped unique constraints, check constraints, indexes, payment allocations, idempotency keys, and row/advisory locks in selected stock and financial paths. Some references are polymorphic or have only independent foreign keys; the database does not universally prove that the parent, child, account, product, and source transaction share one organization.

## Target logical domains

Identity and security; businesses and memberships; plans/subscriptions/entitlements; products/categories/variants; inventory movements; customers/suppliers; sales/returns; purchase orders/receipts/bills; expenses; payments/allocations/refunds; accounts/journals/periods/reconciliations; tax; audit; files; export/background jobs; forecasts/model versions/anomalies; and scanner devices/events.

## Money, currency, and time

Current operational tables still store integers at a legacy scale of one hundred per major unit. New writes enforce the organization's currency exponent against that scale, and tax rounds using the exponent. Existing organizations keep exponent 2, so historical data is not reinterpreted. This bridge does not satisfy the full SRS currency model: transaction currency, base/reporting currency conversions, foreign-currency allocations, and exchange-rate snapshots/provenance remain unimplemented. Timestamps should be stored in UTC and rendered in the configured business timezone.

## Integrity direction

- Add composite tenant foreign keys where practical, with supporting unique keys on `(organization_id, id)`.
- Keep financial source records immutable after posting; correct them with linked reversals/adjustments.
- Enforce bounded positive quantities/amounts, valid transitions, unique idempotency per tenant, and currency-compatible allocations.
- Ensure journal balance and source posting atomicity through transaction design and tested database mechanisms.
- Define retention, deletion, anonymization, backup, legal hold, and restore policy before production.

## Migration controls

Inventory actual schema and row counts in an approved non-production copy first. Compare SQLAlchemy metadata, migration graph, and live schema. Test upgrade, rollback/forward-fix, and data preservation. Never run destructive commands against production without explicit reviewed approval and verified backups. Frontend Supabase SQL migrations use a different `business_id` schema; they are not part of the backend Alembic chain.
