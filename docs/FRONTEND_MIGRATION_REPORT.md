# BusinessIQ Frontend Migration Report

Status: **Folder-only relocation complete — Expo frontend is at `apps/frontend/`, FastAPI is at `apps/backend/`, and Vite is at `apps/legacy-web/`. Operational Expo features are still not fully integrated with FastAPI.**

Audit date: 2026-10-30

## 1. Previous frontend components removed

None. The existing Vite application was moved to `apps/legacy-web/` and preserved. No Expo app was removed.

## 2. New frontend components adopted

The supplied Bolt Expo/React Native Web project is now at `apps/frontend/`. Its internal source layout was preserved. Generated and installed content (`node_modules/`, `.expo/`, and `dist/`) remain generated content and are not application source.

## 3. New project structure

The Bolt application uses Expo Router and includes `app/`, `components/`, `context/`, `hooks/`, `lib/`, `theme/`, `types/`, and three Supabase SQL migrations. Its manifest still uses the starter package name `bolt-expo-starter`.

## 4. Backend endpoints integrated

- Bolt sign-up calls `POST /api/v1/auth/signup` with the required business name. It does not create Bolt `profiles` or `businesses` rows.
- Sign-in and session restore continue to use Supabase Auth; confirmed sessions call `POST /api/v1/auth/complete-signup` before loading the profile, then send the access token to FastAPI for `GET /api/v1/auth/me`.
- Email password recovery uses Supabase Auth recovery OTP; delivery depends on the project's email provider and reset-password template configuration.
- Profile reads and edits use `GET/PATCH /api/v1/auth/me`.
- The current single organization and its subscription status are loaded from `/auth/me`.
- Most operational Bolt API methods still access Bolt Supabase tables and are not integrated.

## 5. New endpoints created

- `PATCH /api/v1/auth/me` updates the authenticated user's full name; phone changes require verified OTP.
- `POST /api/v1/auth/complete-signup` links a confirmed Supabase identity to an existing BusinessIQ account when the IDs differ, preserving its organization and role records.
- `POST /api/v1/auth/phone-verification/complete` records a Supabase-confirmed phone and starts an eligible trial.

## 6. API mappings

| Frontend capability | Existing FastAPI mapping | Status |
|---|---|---|
| Sign up | `POST /api/v1/auth/signup` | Integrated; requires local Bolt `.env` configuration and backend runtime verification |
| Sign in / current user | Supabase Auth, `POST /api/v1/auth/complete-signup`, then `GET /api/v1/auth/me` | Integrated in source; runtime verification pending |
| Password recovery | Supabase Auth recovery OTP and password update | Integrated in source; email provider/template delivery not verified |
| Categories / products | `/api/v1/categories`, `/api/v1/products` | Not integrated |
| Customers / suppliers | `/api/v1/customers`, `/api/v1/suppliers` | Not integrated |
| Inventory | `/api/v1/inventory/summary`, `/movements`, `/adjustments` | Not integrated |
| Sales | `/api/v1/sales` | Not integrated |
| Purchases / payables | `/api/v1/purchases`, `/api/v1/payables`, `/api/v1/payments/supplier` | Not integrated |
| Expenses | `/api/v1/expenses`, `/api/v1/expense-categories`, `/api/v1/expense-accounts`, `/api/v1/expenses/summary` | Expo list/create now use tenant-scoped backend API; runtime behavior and DB migration remain unverified |
| Customer payments / receivables | `/api/v1/payments/customer`, `/api/v1/payments`, `/api/v1/receivables` | Not integrated |
| Accounting and reports | Accounting services exist; corresponding financial-statement route set was not found | Not integrated / endpoint gap |
| Billing, team, analytics, AI, help, invoices | No corresponding routers were found in the baseline router inventory | Not implemented in current backend inventory |

## 7. Authentication changes

The Bolt sign-up screen now collects a business name and calls the existing BusinessIQ signup endpoint. If an existing BusinessIQ user record has no Supabase Auth identity, signup creates the identity and waits for verified sign-in before relinking the user ID and its public-schema foreign keys. This preserves the existing organization and role assignments without creating another business. The frontend completes that link before loading the profile. Password recovery uses Supabase's email recovery OTP; actual delivery depends on SMTP authorization, rate limits, and the configured template.

Supabase URL and public anon key are read from Expo public environment variables instead of source-code constants. A `.env.example` contains placeholders only; no secret values were copied into documentation.

The backend `/auth/me` response now includes the authenticated user's phone number, phone-verification state, creation date, and owner flag. The PATCH endpoint updates the current user's name; verified phone changes cannot be made in place. These API changes have not yet been tested against the live database or Supabase project.

## 8. Business context changes

The Bolt context now maps the current backend organization from `/auth/me` for the one-organization signup flow. Multi-organization listing/switching and creating additional businesses are not supported yet; the frontend no longer writes additional businesses directly to Supabase.

## 9. Subscription integration

The client now reads subscription status from the BusinessIQ API. Fake client-side activation has been removed; the billing screen reports that online billing is unavailable until a server-backed checkout and verified webhook exist. Existing backend billing and webhook endpoints were not found in the router inventory.

## 10. Database changes

None. No Bolt SQL migration was applied. Those migrations define a competing business and financial schema, use membership-recursive RLS checks that require review, and include cascading deletion of business records.

## 11. Security issues discovered

- Bolt's business data is read and written directly through Supabase instead of backend services and permission enforcement.
- Bolt's business tenant key differs from the backend's organization tenant key.
- Membership policies reference the membership table recursively; the pattern is unverified.
- A fake client-side subscription activation was present and has been disabled; real billing still requires a server-backed checkout and verified webhook.
- Inventory and sale writes do not consistently use the existing backend's atomic, ledger-aware operations.
- No secret values were read or copied into project documentation.

## 12. Features fully connected

Authentication signup, confirmed account recovery/relinking, sign-in identity, current-user/profile access, email password recovery, and the initial single-organization context are connected in source. The foreign-key relink was exercised inside a database transaction and rolled back; a full signup-confirmation round trip and email delivery are still pending.

## 13. Features still incomplete

Operational Bolt reads/writes, organization switching/creation, team permissions, accounting/report endpoints, billing/webhooks, analytics, AI, help, and feature-level migration tests remain incomplete or unverified. See `FRONTEND_FEATURE_PARITY_MATRIX.md`.

## 14. Tests executed

- Pylance diagnostics: no errors reported for the changed Bolt TypeScript files.
- Python syntax diagnostics: no errors in the changed auth router/schema.

## 15. Phone verification and trial entitlement

The frontend now requires an international phone number and a password with letters and numbers, supports the configured email-confirmation callback, and presents an SMS OTP verification screen after sign-in. Account setup errors are surfaced without an unhandled profile-load rejection. New seven-day trials start only after server-verified phone confirmation; prior trial dates are preserved.

FastAPI permission dependencies enforce phone verification and active subscription/trial status. The backend Alembic migration applies RLS to the actual `organization_id` tables and denies direct Supabase client access, rather than assuming the separate Bolt `business_id` schema is deployed. Actual email/SMS delivery requires the redirect allow-list and phone SMS provider settings described in [AUTHENTICATION_PHONE_TRIAL_SETUP.md](./AUTHENTICATION_PHONE_TRIAL_SETUP.md); neither was changed through this code update.
- Runtime schema check: `UpdateUserRequest` trims names and rejects blank names.
- Full npm typecheck/build and authenticated API/Supabase smoke tests were not run.

## 15. Test results

- Source-level changes reviewed; changed TypeScript files reported no editor diagnostics.
- npm typecheck, lint, production build, Expo/browser test, authenticated API/Supabase test, tenant-isolation test, and full feature integration tests: **NOT VERIFIED**.
- Git status and branch: **BLOCKED** because Git is not installed/available in this environment.

## 16. Production build result

Not run for the Bolt project during this audit; production build is **NOT TESTED**.

## 17. Known limitations

- The standalone Vite app and Bolt Expo Web app are both present at `apps/legacy-web/` and `apps/frontend/`; there is not yet a single canonical frontend.
- The Bolt Supabase schema does not match the existing backend schema.
- Required repository branch/worktree safety checks could not be completed.
- The static Expo favicon asset was not moved or changed; no blinking animation was found in the inspected app source.

## 18. Remaining work

Create and verify a Git worktree/branch and recovery point; replace remaining Bolt direct database operations with authenticated FastAPI services; implement multi-organization context; implement or explicitly defer missing server capabilities; run tests; only then decide whether the Vite app can be retired.

## 19. Deployment instructions

None established. Do not deploy the Bolt application as a production replacement. Deployment requires a canonical frontend decision, server-backed integration, environment/security review, production build, and the tests above.

## 20. Production readiness

**Not demonstrated.** The baseline shows material architecture, security, and feature gaps. No production-readiness claim is made.
