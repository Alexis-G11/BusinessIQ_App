# BusinessIQ Architecture

## Purpose and status

This document records the approved project direction and the implementation baseline for BusinessIQ. The requirements source is `BusinessIQ_SRS_v2.0.docx`; its current status is draft pending stakeholder approval. This document does not claim that source functionality has passed runtime, security, or production verification.

## Approved direction

- **Client:** `apps/frontend/` is the primary product client, built with Expo Router, React Native, TypeScript, and React Native Web. `apps/legacy-web/` remains intact until feature parity and replacement are verified.
- **API:** `apps/backend/` is the sole application boundary for business data, implemented with FastAPI, Pydantic, async SQLAlchemy, and Alembic.
- **Identity:** Supabase Auth may provide identity. The API validates tokens and makes all business authorization decisions.
- **Business data:** PostgreSQL is the single authoritative store for business and financial records. Direct client access to business tables is not part of the target architecture.
- **Launch configuration:** Rwanda, country code RW, RWF, and `Africa/Kigali` are the initial product defaults. Country rules belong in configurable jurisdiction modules, not shared transaction logic.
- **Expansion:** transaction currency, business base currency, reporting currency, exchange rate, source, and effective date must be represented without changing posted history.

## Current repository shape

The backend contains models and APIs for organizations, products, inventory, customers, suppliers, sales, purchases, expenses, and payments. Accounting services exist, but report and accounting-management APIs are incomplete. The Expo app has broader UI coverage than backend integration: selected transaction flows use FastAPI while expenses, invoices, payments, membership management, and generic table access still reference a separate Supabase `business_id` schema. That separate schema must not become a second business-data source.

The backend migration graph has one source head, `b7e9c2a15f30`, across 14 revisions. The live database revision and applied schema are unknown; no database was queried for this baseline.

## Target request flow

1. Client authenticates with the identity provider and obtains a short-lived access token.
2. Client sends the token and selected organization ID to a versioned HTTPS API.
3. API validates token, active membership, permission, entitlement, input, and tenant ownership of referenced records.
4. A transaction writes operational records, inventory movements, payments, and accounting effects atomically or through recoverable coordination.
5. PostgreSQL constraints enforce invariants; RLS is an additional control where the connection model supports safe tenant context.
6. Audit events and correlated operational telemetry record material outcomes without secrets.

## Boundary rules

- A client-supplied organization ID is a selector, never proof of access.
- Provider credentials and service-role keys stay server-side.
- The API owns money calculations, posting, allocation, entitlement, and report basis.
- Background jobs and files carry explicit tenant identity and recheck authorization at execution/download time.
- ML and AI read only through permission-checked business tools; no unrestricted SQL or shared tenant training by default.

See the ADRs in `docs/architecture/`, plus the database, API, security, integration, and deployment documents for decisions and open questions.
