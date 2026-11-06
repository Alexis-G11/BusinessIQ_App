# BusinessIQ Frontend Replacement Baseline

Audit date: 2026-10-30

## Scope and safety

This is a non-destructive baseline for the requested Bolt frontend integration. No frontend was removed, no Supabase migration was applied, and no environment-file contents or credentials were read. The supplied Bolt project and its generated outputs were inspected in place.

The local environment does not have the `git` command available, and this directory could not be verified as a Git worktree. Consequently, the current branch and working-tree changes cannot be established, and the requested migration branch cannot safely be created here. Do not treat this audit as a clean-worktree or backup confirmation.

## Structure relocation update (2026-10-30)

- The FastAPI application is now under `apps/backend/`, the Expo Router application under `apps/frontend/`, and the Vite application under `apps/legacy-web/`.
- The applications' internal source paths and configuration references were preserved. No application source code, environment-file contents, database schema, or migration was changed.
- Expo's static favicon and app-icon assets remain in their original relative locations; neither was moved or replaced in this folder-only pass.
- This was a filesystem organization only. The Expo application's operational data calls still need to be migrated from direct Supabase access to FastAPI before the front end is fully connected.

## Repository layout found

- `apps/backend/`: FastAPI application, SQLAlchemy models, Alembic migrations, routers, services, scripts, pinned Python requirements, and `alembic.ini`.
- `apps/legacy-web/`: Existing standalone Vite, React, and TypeScript browser application, with a Supabase Auth client and API calls to the FastAPI service.
- `apps/frontend/`: Supplied Bolt-generated Expo Router application using React Native Web. It contains `app/`, `components/`, `context/`, `hooks/`, `lib/`, `theme/`, `types/`, and three Supabase SQL migrations. It also contains generated/dependency directories (`node_modules/`, `.expo/`, `dist/`); these must not be copied into source-control deliverables.
- `frontend/` and `frontend-bolt/`: Not present at the expected root paths.
- `docs/`: Present. `FRONTEND_MIGRATION_REPORT.md` and `FRONTEND_FEATURE_PARITY_MATRIX.md` existed as empty files at the time of this audit; they are initialized with this baseline.
- `Business_Intelligence_Platform_SRS_v1_0 (1).docx`: SRS document present at the project root.

The Bolt application manifest identifies the app as `bolt-expo-starter`, uses Expo Router, and defines `dev`, `build:web`, `lint`, and `typecheck` scripts. The existing `apps/legacy-web/` project is a distinct Vite application. They remain two browser-app candidates.

## Existing backend architecture and integration points

- Identity is Supabase Auth. `apps/backend/app/auth.py` verifies Supabase access tokens and resolves the local BusinessIQ user record.
- Business tenancy is represented by organizations and memberships. `apps/backend/app/permissions.py` resolves the user's authorized organization and checks permission codes. Routes receive the active organization through `X-Organization-Id` where needed; backend membership validation remains authoritative.
- FastAPI routers currently cover authentication (`/api/v1/auth/signup`, `/api/v1/auth/me`), categories, products, customers, suppliers, inventory, sales, customer payments/receivables, purchases/supplier payments/payables, and expenses.
- SQLAlchemy models and services are the financial-data source of truth. Operational money is represented in integer cents, and ledger calculations/postings use backend services.
- Existing accounting models and ledger services are present. Dedicated financial statement and general-ledger HTTP routes were not found in the router inventory.
- No billing, Stripe webhook, team-management, general invoice, reporting, analytics, or AI-assistant API routes were found in the current router inventory. Their presence in a frontend is not evidence that these capabilities are implemented.
- CORS defaults include the local Vite origins. Explicit environment overrides and deployment origins must be checked for the intended host before testing either browser application.

## Bolt frontend architecture and observed integration

- The Bolt app uses Expo Router and includes routes for sign-in, sign-up, dashboard, onboarding, products, inventory, sales, purchases, expenses, contacts, invoices, payments, receivables, payables, reports, analytics, AI assistant, help, settings, team, health, and billing.
- `lib/api.ts` is not a FastAPI API client. It directly calls Supabase Auth and queries or mutates Supabase tables such as `profiles`, `businesses`, `memberships`, `products`, `contacts`, `sales`, and `expenses`.
- The Bolt auth signup writes directly to a `profiles` table and does not call the existing FastAPI `/api/v1/auth/signup` flow, which creates the BusinessIQ user, organization, membership, owner role, trial, and chart of accounts together.
- The Bolt business context loads memberships/businesses directly from Supabase, uses `user.id` in frontend queries, and selects the first listed business when no stored selection is found.
- The Bolt subscription guard checks `businesses[0]`, not the selected business. Subscription state is read directly from the Bolt `businesses` table, with a client-side fallback to an expired status on request errors.
- `subscriptionApi.pay` directly updates the subscription plan/status in Supabase without verified payment. This must not be carried into an integrated application.
- Product and sale write helpers perform direct table writes; sale creation and sale-item creation require separate operations in the frontend API layer rather than one authoritative backend transaction.
- A generic direct-table listing helper applies `business_id` filters client-side at the query layer. That table and tenant model do not match the backend's `organization_id` schema.
- Bolt's product types and schema use decimal-style numeric values, unlike the backend operational integer-cent API contract. Financial fields require explicit, tested conversions and backend-authoritative totals before integration.

## Separate Bolt database and migration risk

The Bolt project contains three SQL migrations creating a second schema around `profiles`, `businesses`, `memberships`, `products`, `contacts`, `sales`, `sale_items`, `expenses`, `invoices`, `payments`, and `purchases`. This is a separate tenant and financial-data model from the existing BusinessIQ organization schema.

These Bolt migrations have not been applied and must not be applied to the existing BusinessIQ Supabase database as part of this migration. In the inspected SQL, policies on `businesses` and `memberships` query the `memberships` table from membership policies themselves; these recursive-policy patterns need deliberate security review and testing before use. Several business-member policies grant broad table writes to active members and do not implement the backend's role-permission model. The migrations also use cascading deletion for business-owned data, which conflicts with the backend's financial-record retention and reversal conventions.

## Feature inventory and known gaps

| Area | Bolt screen/API evidence | Existing backend evidence | Baseline status |
|---|---|---|---|
| Sign-in | Supabase Auth direct | Supabase Auth token verification and FastAPI `/auth/me` | Not integrated |
| Sign-up | Supabase Auth plus direct `profiles` insert | FastAPI signup creates user and organization atomically | Not integrated; separate profile model |
| Multiple businesses | Direct `businesses`/`memberships` tables; first-business fallback | Organization membership selection and header validation | Incompatible tenancy model |
| Products/inventory | Direct product table reads/writes | Product, category, inventory movement and adjustment APIs | Not integrated; stock overwrite is unsafe |
| Sales | Direct sale table writes | Atomic sale API computes totals server-side | Not integrated; frontend sequence is not authoritative |
| Purchases/payables | Screens and direct schema | Purchase, supplier payment, and payable APIs | Not integrated |
| Expenses | Direct expense table writes | Expense categories, expenses, summary, supplier credit APIs | Not integrated |
| Customers/suppliers | Direct contacts table | Separate customer and supplier APIs | Requires model/API mapping |
| Invoices/payments | Bolt tables and screens | Customer payment/receivables and supplier payment APIs; no invoice router found | Partial backend capability |
| Accounting/statements | Report screens exist | Ledger services/models exist; statement HTTP routes not found | UI does not establish parity |
| Billing | Client-side plan update helper | Stripe billing/webhook routes not found | Unsafe placeholder; must be removed/replaced before use |
| Team/permissions | Membership UI and direct tables | Permission services exist; team routes not found | Not integrated |
| Analytics/AI/help | Screens exist | No corresponding routers found in inspected backend | Not integrated or not implemented |

This is a source audit, not a feature test. Screen presence is not counted as working backend integration.

## Security and migration risks identified

1. The Bolt UI's direct Supabase data access creates a second source of truth and bypasses backend services and permission checks.
2. Its `business_id` tenant columns and membership model are incompatible with backend `organization_id` tenancy.
3. Bolt membership RLS policies contain recursive membership-table lookups; their behavior and safety are unverified.
4. Direct client subscription activation is an authorization and payment-integrity risk.
5. Client-side trial and subscription checks cannot be authoritative.
6. Direct stock updates, separate sale/item writes, and client-supplied financial fields bypass backend transactions and server calculations.
7. The Bolt schema's cascading deletion for financial business data conflicts with append-only/reversal requirements.
8. The supplied frontend includes `node_modules`, `.expo`, and `dist`; these generated artifacts must remain out of any migration/source-control change.
9. Current Git branch and worktree state are unknown because Git is unavailable in this environment.

No credential values were inspected or copied into this document.

## Recommended controlled implementation sequence

1. Ensure the project is in a Git worktree, inspect and preserve all user changes, and create the requested feature branch with Git before structural edits.
2. Preserve `apps/legacy-web/` and `apps/frontend/`; make a backup or use the feature branch as the recovery point.
3. Map each Bolt screen to existing FastAPI endpoints and document unsupported features. Do not apply Bolt SQL migrations.
4. Replace Bolt direct business-table operations with a typed API client for FastAPI, retaining Supabase Auth only for identity and sending its access token to the API.
5. Reconcile signup/session restoration with the existing backend signup behavior and verify browser/native redirect and email-confirmation flows.
6. Implement active organization selection using backend-verified membership; clear or re-fetch cached screen data on switching. Do not use client-selected tenant context as authorization.
7. Remove fake billing mutation and any direct table fallback. Keep billing screens unavailable or explicitly incomplete until server-side checkout and signed, idempotent webhooks exist.
8. Integrate and test features in bounded slices, beginning with sign-in, organization context, products/inventory, sales, purchases, expenses, contacts, and receivables/payables.
9. Add backend endpoints only where required and consistent with existing service, permission, tenant, idempotency, ledger, and migration conventions.
10. Run Expo typecheck/lint/web build, backend unit/integration and smoke tests, tenant-isolation checks, and browser/native smoke tests.
11. Retire the duplicate Vite app only after the Expo replacement has equivalent verified functionality and the project has a tested recovery point.
12. Produce the migration report and parity matrix using measured integration/test status; do not mark a feature PASS based on a screen alone.

## Baseline validation

- Repository structure, manifests, Bolt routes, Bolt API usage, Bolt SQL migrations, and backend router inventory were inspected.
- No frontend build, live API feature test, RLS policy test, or cross-tenant test was run as part of this audit.
- Git status, current branch, and uncommitted changes could not be checked because the `git` executable is unavailable.
- No frontend was replaced or deleted, no database migration was run, and no `.env` file was read or modified.
