# BusinessIQ Implementation Roadmap

Target: thesis-ready V1 by June 2027. The SRS remains a draft baseline until stakeholder approval. Milestone dates are planning targets, not delivery guarantees.

| Phase | Target | Scope | Exit evidence |
|---|---|---|---|
| 1. Foundation | Nov 2026 | Branch, architecture decisions, configuration, requirements traceability, unit-test and CI foundation, migration review | CI runs reproducibly; no unreviewed schema change; initial test evidence recorded |
| 2. Security and multi-business | Dec 2026–Jan 2027 | Auth lifecycle, trial, create/switch businesses, memberships, roles, entitlements, audit, tenant constraints | AT-001–005 and cross-tenant negative tests pass |
| 3. Business operations | Feb–Mar 2027 | Catalog, inventory, purchases/receiving, customers/suppliers, POS, sales, payments, returns | Atomicity, stock, allocation, duplicate and concurrency scenarios pass |
| 4. Financial management | Mar–Apr 2027 | Expenses, invoices, receivables/payables, journals, statements, periods, reversals, reconciliation | Trial balance and statement reconciliation to source journals passes |
| 5. Country and commercial | Apr 2027 | Currency model, Rwanda jurisdiction module, tax configuration, EBM adapter design, subscription provider adapter | Currency/tax test evidence; provider eligibility and legal review recorded |
| 6. Intelligence | Apr–May 2027 | Reporting APIs, descriptive/diagnostic analytics, forecast and anomaly baselines, grounded assistant | Time-aware backtests, data sufficiency, provenance, and tenant-safety evidence |
| 7. Hardware and integrations | May 2027 | Camera/HID workflows and optional ESP32 prototype/device simulator | Camera and HID tests pass; ESP32 documented and isolated from core operations |
| 8. Hardening and thesis acceptance | Jun 2027 | Accessibility, security, performance, backup/restore, deployment, UAT, documentation | Release checklist and SRS acceptance evidence complete; remaining gaps explicitly scoped |

Dependencies may change sequencing. Any change to phase boundaries should be recorded in `DEVELOPMENT_STATUS.md` and the traceability matrix.
