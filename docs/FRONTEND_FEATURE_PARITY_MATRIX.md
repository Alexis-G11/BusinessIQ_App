# BusinessIQ Frontend Feature Parity Matrix

Baseline date: 2026-10-30

Statuses describe verified integration with the existing FastAPI/PostgreSQL backend, not whether a UI screen exists.

| Feature | Existing frontend | Bolt frontend | Backend endpoint/service | Integration status | Test status |
|---|---|---|---|---|---|
| Sign-in | Vite uses Supabase Auth then FastAPI `/auth/me` | Supabase Auth then FastAPI `/auth/me` | Supabase Auth; `GET /api/v1/auth/me` | SOURCE INTEGRATED; runtime pending | NOT TESTED |
| Sign-up | Vite calls FastAPI signup | Calls FastAPI signup; asks for business name; shows confirmation step | `POST /api/v1/auth/signup` creates BusinessIQ user/organization/role/chart | SOURCE INTEGRATED | NOT TESTED |
| Session restore/logout | Vite session restore and sign-out | Supabase Auth context plus FastAPI profile load | Supabase Auth + FastAPI JWT validation | SOURCE INTEGRATED; runtime pending | NOT TESTED |
| Business/organization selection | Vite uses current `/auth/me` organization | Maps one current organization from `/auth/me`; additional business creation disabled | `get_org_context`, `X-Organization-Id`, membership verification | PARTIAL; multiple organizations unsupported | NOT TESTED |
| Dashboard | Vite reads inventory, receivables, payables, expense summary, and sales | Bolt dashboard screens/data hooks | Existing inventory, payments, expenses, sales APIs | PARTIALLY IMPLEMENTED in Vite; Bolt NOT INTEGRATED | NOT TESTED end-to-end |
| Categories | Not exposed in the current Vite nav | UI/API support varies | `/api/v1/categories` | Bolt NOT INTEGRATED | NOT TESTED |
| Products | Vite read list | Bolt CRUD and direct Supabase reads/writes | `/api/v1/products` | NOT INTEGRATED; Bolt stock overwrite bypasses movement ledger | NOT TESTED |
| Inventory | Vite summary only | Bolt inventory screens/direct tables | `/api/v1/inventory/summary`, `/movements`, `/adjustments` | Vite PARTIAL; Bolt NOT INTEGRATED | NOT TESTED |
| Sales / POS | Vite sales list | Bolt sale and item writes direct to separate schema | Atomic `POST/GET /api/v1/sales` | NOT INTEGRATED; financial totals must be server-computed | NOT TESTED |
| Purchases | Vite purchase list | Bolt purchases UI/direct tables | `/api/v1/purchases` | NOT INTEGRATED | NOT TESTED |
| Suppliers | Not exposed as a full Vite management flow | Bolt contacts-based supplier screens | `/api/v1/suppliers` | NOT INTEGRATED; separate entity mapping required | NOT TESTED |
| Expenses | Vite list; summary dashboard card | Bolt expense create/list now call organization-scoped backend APIs | `/api/v1/expenses`, `/expense-categories`, `/expense-accounts` | INTEGRATED IN SOURCE; no runtime/API test yet | TypeScript check; DB/API behavior NOT TESTED |
| Customers | Not exposed as a full Vite management flow | Bolt contacts-based customer screens | `/api/v1/customers` | NOT INTEGRATED; separate entity mapping required | NOT TESTED |
| Payments | No complete Vite payment workflow | Bolt payment tables/screens | `/api/v1/payments`, customer/supplier payment endpoints | NOT INTEGRATED | NOT TESTED |
| Invoices | NOT IMPLEMENTED in current Vite app | Bolt invoice screens and separate SQL schema | No invoice router found | BLOCKED: backend endpoint/service not found | NOT TESTED |
| Receivables | Vite dashboard summary | Bolt receivables screen/direct tables | `/api/v1/receivables` | Vite PARTIAL; Bolt NOT INTEGRATED | NOT TESTED |
| Payables | Vite list and summary | Bolt payables screen/direct tables | `/api/v1/payables` | Vite PARTIAL; Bolt NOT INTEGRATED | NOT TESTED |
| Accounting / ledger | NOT IMPLEMENTED in current Vite nav | Bolt reports screen | Ledger/accounting services exist; no complete statement-route set found | BLOCKED/PARTIAL: map service API and implement endpoints as required | NOT TESTED |
| Reports | NOT IMPLEMENTED as a full Vite module | Bolt reports screen | No reports router found | BLOCKED: endpoints not found | NOT TESTED |
| Analytics / forecasting | NOT IMPLEMENTED in current Vite app | Bolt analytics screen | No analytics router found | BLOCKED: endpoints not found | NOT TESTED |
| AI assistant | NOT IMPLEMENTED in current Vite app | Bolt AI assistant screen | No AI router found | BLOCKED: endpoint/service not found | NOT TESTED |
| Team / permissions | NOT IMPLEMENTED in current Vite app | Bolt team UI/direct membership access | Permission model exists; no team router found | BLOCKED/PARTIAL: backend routes missing | NOT TESTED |
| Billing / subscription | NOT IMPLEMENTED in current Vite app | Reads backend status; client-side activation disabled | No billing/webhook router found | PARTIAL; checkout and verified webhooks not implemented | NOT TESTED |
| Help center | NOT IMPLEMENTED in current Vite app | Bolt help screen | No help endpoint found | NOT INTEGRATED | NOT TESTED |
| Bulk import | NOT IMPLEMENTED in current Vite app | Bolt product bulk screen/direct writes | No bulk-import router found | NOT INTEGRATED | NOT TESTED |

## Security notes

- Do not apply Bolt SQL migrations to the existing BusinessIQ database.
- Do not use `subscriptionApi.pay` or direct Supabase business-table writes in the integrated app.
- All money-moving/stock-moving actions must use the backend transaction, idempotency, ledger, and inventory movement services.
- All organization selection must be checked by the backend on each request.
- The supplied Bolt migration membership policies need dedicated recursion and authorization review before any use.
