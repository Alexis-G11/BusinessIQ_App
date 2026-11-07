# BusinessIQ Backend Audit

Audit date: 2026-10-30

This is a baseline engineering audit, not an independent penetration test or a production-readiness certification. It records the existing architecture, verified runtime facts, gaps against the supplied backend master prompt, and the first completed database-integrity increment.

## Existing foundation

- FastAPI with async SQLAlchemy/PostgreSQL, Alembic migrations, and Supabase Auth.
- Database connections use `asyncpg` with prepared-statement caching disabled for the Supabase pooler.
- Access tokens are verified against Supabase signing keys (or the configured legacy HS256 secret), issuer, audience, and expiry.
- Business routes use organization context and permission dependencies. Reviewed queries generally scope business data by `organization_id`, with same-business checks for referenced records.
- Operational money is represented in integer cents; accounting journal lines use `Decimal`. Existing sales, purchase, expense, payment, inventory, chart-of-accounts, journal, ledger, and trial-balance services are retained.
- Sales, purchases, and expenses create associated operational, inventory/payment, and ledger records within transactions. Products are archived rather than deleted.
- The database was at migration `ab72c4519e60` with one Alembic head before this increment. The configured database passed `/health` and `/health/db`.

## Gaps and risks to address in later steps

- Signup creates one organization. There are no organization-list/create, membership invitation, or membership administration routes; membership lifecycle/status fields are not implemented.
- Subscription fields remain on `organizations`; Stripe currently has a client/key foundation but no checkout or verified webhook routes. The authentication increment below starts a seven-day trial after phone verification and enforces trial entitlement on API business routes.
- MFA, login/signup rate limits, session revocation, and audit logging remain unimplemented. Email password recovery is provided by Supabase Auth in the frontend; delivery configuration has not been verified.
- Existing BusinessIQ user rows whose Supabase Auth identities are missing can no longer be mistaken for successful account creation: signup starts Auth registration for these records, and a confirmed session can relink the Auth ID while preserving organization and role foreign keys. Full confirmation-email delivery and sign-in round-trip testing remain pending.
- Idempotency headers are optional on some financial/stock operations, including sales and customer payments; idempotency is required on purchases and expenses. Inventory adjustments also need review against the required idempotency policy.
- Tenant-scoped foreign-key correctness is primarily enforced by API validation. The schema does not generally use composite foreign keys to guarantee that referenced rows belong to the same organization.
- Accounting services exist, but financial-statement routes are missing. Trial-balance calculation calls the ledger once per account, which may become expensive as account and journal counts grow.
- Invoices, refunds/reversals, bulk imports, analytics/forecasting, AI, and team-management routes are not present in the inspected router inventory.
- Testing is provided mainly by manually invoked smoke scripts. No pytest suite/configuration or deployment/CI configuration was found in the repository inventory. Sales calculations do not currently expose the randomized `self_check` available in purchase and expense calculations.
- Full production validation remains outstanding: authenticated integration coverage, tenant-isolation tests, migration testing against an isolated database copy, performance testing, deployment configuration, and an independent security review.

## First increment: membership and role uniqueness

Before migration, read-only database checks found:

- Duplicate organization memberships: 0.
- Duplicate business-role assignments: 0.
- Duplicate role-permission assignments: 0.
- Existing organization memberships: 5.
- Existing business-role assignments: 5.
- Existing role-permission assignments: 104.

Added and applied migration `c28f3a6e91b4`, which enforces:

- One `organization_users` membership per `(organization_id, user_id)`.
- One `user_roles` assignment per `(organization_id, user_id)`.
- One `role_permissions` assignment per `(role_id, permission_id)`.

These are also declared in the corresponding SQLAlchemy models. The migration is reversible in code. The forward migration was applied to the configured database with user approval; the downgrade was not run against that database. Upgrade/downgrade/upgrade testing against an isolated database copy remains required.

## Verification performed

- Alembic graph: one head, `c28f3a6e91b4` (11 revisions).
- Database revision and all three unique constraints: verified after upgrade.
- `/health`: `ok`.
- `/health/db`: `ok`.
- Purchase randomized calculation self-check: passed.
- Expense randomized calculation self-check: passed.
- Model metadata includes all three matching named constraints.

No claim of production readiness is made.

## Authentication and trial increment

Signup validates an international phone number and a password containing at least eight characters, a letter, and a number. Phone verification is performed by Supabase Auth; verified phone claims are unique and durable, and legacy phone values are backfilled as already claimed. New organizations remain pending until phone verification, when a seven-day trial starts. Signup still administratively confirms email, so email verification is not enforced and remains a requirement gap. Previously started trials are not reset.

FastAPI business routes now deny access until phone verification and while a trial is expired or inactive. The backend Alembic migration also enables RLS on the existing `organization_id` tables and denies direct Supabase client access to those tables, avoiding the separate, unapplied Bolt `business_id` schema. The API enforces the same phone and subscription conditions in its permission dependency. The API's database role bypasses RLS as configured. SMS delivery still requires enabling phone authentication and configuring an SMS provider in the Supabase Dashboard; see [AUTHENTICATION_PHONE_TRIAL_SETUP.md](./AUTHENTICATION_PHONE_TRIAL_SETUP.md).

The access predicate has pure boundary tests (verified/unverified, active/trialing/inactive, and expiry). Full signup and protected-route integration tests remain outstanding; the configured Supabase and database migration were not exercised for this increment.

Signup confirmation and SMS delivery require live Supabase configuration and were not validated end to end here. The backend migration was not applied to the configured database.

## Second increment: list current user's organizations

Added `GET /api/v1/organizations`. It derives the user exclusively from the verified bearer token, queries only that user's `organization_users` memberships, and returns each organization's existing public summary together with the membership's owner flag and business-specific role. It requires no organization-selection header because it lists all memberships for the authenticated user. No database migration or frontend change was needed.

Added `apps/backend/scripts/smoke_organizations.py`. It checks unauthenticated rejection, sign-in, membership response shape, inclusion of the current organization, and unique organization IDs. The live smoke script could not complete its Supabase sign-in because the configured smoke credentials received HTTP 400; credentials were not printed or changed.

Endpoint verification using the FastAPI ASGI transport and the configured database passed: an unauthenticated request returned 401; an authenticated-user dependency override returned the user's one existing membership with organization, owner, and role fields. This verifies the route's database query and response shape, but is not a full Supabase JWT integration test. The route and response schema passed syntax/import validation.
