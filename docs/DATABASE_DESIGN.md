# BusinessIQ Database Design

## Authority and existing shape

PostgreSQL is the target single source of truth for business and financial data. Existing SQLAlchemy models center on `organizations`; membership/role tables associate users to organizations; operational entities include products, inventory transactions, sales, purchases, expenses, customers, suppliers, payments, and payment allocations; accounting entities include accounts, journal entries, and journal lines.

Alembic contains 14 revisions with source head `b7e9c2a15f30`. The current database revision, extensions, indexes, grants, RLS state, and data quality are unknown because no database inspection was performed. Preserve every existing migration; use additive, reviewed migrations for changes.

## Existing integrity mechanisms

The schema and services include tenant-scoped unique constraints, check constraints, indexes, payment allocations, idempotency keys, and row/advisory locks in selected stock and financial paths. Some references are polymorphic or have only independent foreign keys; the database does not universally prove that the parent, child, account, product, and source transaction share one organization.

## Target logical domains

Identity and security; businesses and memberships; plans/subscriptions/entitlements; products/categories/variants; inventory movements; customers/suppliers; sales/returns; purchase orders/receipts/bills; expenses; payments/allocations/refunds; accounts/journals/periods/reconciliations; tax; audit; files; export/background jobs; forecasts/model versions/anomalies; and scanner devices/events.

## Money, currency, and time

Current operational tables store integer values described as cents, and conversion logic assumes two decimal places. The owner requires Rwanda/RWF launch plus multi-currency expansion. Before altering money fields, define a currency registry with minor-unit precision and rounding, transaction/base/reporting currencies, and an explicit migration that interprets existing values without changing posted history. Store exchange-rate snapshots and provenance on posted foreign-currency records. Timestamps should be stored in UTC and rendered in the configured business timezone.

## Integrity direction

- Add composite tenant foreign keys where practical, with supporting unique keys on `(organization_id, id)`.
- Keep financial source records immutable after posting; correct them with linked reversals/adjustments.
- Enforce bounded positive quantities/amounts, valid transitions, unique idempotency per tenant, and currency-compatible allocations.
- Ensure journal balance and source posting atomicity through transaction design and tested database mechanisms.
- Define retention, deletion, anonymization, backup, legal hold, and restore policy before production.

## Migration controls

Inventory actual schema and row counts in an approved non-production copy first. Compare SQLAlchemy metadata, migration graph, and live schema. Test upgrade, rollback/forward-fix, and data preservation. Never run destructive commands against production without explicit reviewed approval and verified backups. Frontend Supabase SQL migrations use a different `business_id` schema; they are not part of the backend Alembic chain.
