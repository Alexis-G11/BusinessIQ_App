# BusinessIQ Security Model

## Security objectives

Protect identity, business data, financial integrity, billing entitlement, files, and model outputs. Prevent a member of one business from reading or changing another business's data, including through nested IDs, exports, background work, or AI tools.

## Trust boundaries

- Browser/mobile client and all client-supplied IDs/roles are untrusted.
- Supabase Auth establishes identity; the FastAPI service validates the token and resolves BusinessIQ membership.
- PostgreSQL and the API service role hold authoritative business data.
- Billing, email/SMS, AI, storage, cloud, and device services are external trust boundaries.
- Background workers and scanner devices are separate principals; they require scoped credentials and tenant context.

## Current controls found in source

- JWT signature/algorithm, issuer, audience, and expiry validation.
- Organization selection through `X-Organization-Id` followed by membership lookup.
- Permission dependencies and owner handling.
- Feature permission dependencies require a verified phone and either an active subscription or an unexpired seven-day trial. Owners do not bypass this entitlement check.
- Tenant filters and same-organization checks in many operational routes.
- Generic error response for unhandled server exceptions; bearer-token auth rather than cookies in the API.

These controls are source observations and remain unverified in an integrated environment.

## Gaps and risks

- No rate limiting, MFA, general audit log, file controls, support-access workflow, or complete membership lifecycle.
- Signup now creates organizations in `pending_verification`; the trial starts after Supabase phone verification. Signup still administratively confirms email, so the required email-verification gate remains missing.
- Additional business creation records a per-business trial decision and requires a verified owner. Multi-signal trial-abuse detection is not implemented; the initial decision currently records an empty observed-signal list.
- Trial and phone enforcement have pure unit tests but lack API/database integration tests; the existing data migration and RLS behavior have not been exercised against an isolated database in this workspace.
- Direct Expo business-table requests bypass the intended API boundary.
- Membership lifecycle status is not represented in the backend membership model.
- Schema-level tenant consistency and comprehensive RLS behavior are unverified. The frontend SQL schema is distinct from backend migrations.
- No security scanning, CI policy, penetration test, restore drill, or production IAM/network configuration is present.
- Avoid logging raw tokens, passwords, service credentials, personal financial payloads, or payment secrets. Review exception/telemetry redaction before production.

## Required request authorization sequence

Validate token → load local user → resolve active organization membership → check resource permission → check business entitlement → validate every referenced record belongs to the same tenant → execute bounded transaction → record security/financial audit outcome.

RLS, where adopted, must use a verified transaction-scoped tenant identity and least-privilege database role. RLS policies must be tested both through the API role and direct authenticated access; a restrictive policy alone does not establish intended read access.

## Security acceptance

Automate denial tests for unauthenticated, expired, wrong-audience, wrong-business, guessed nested-resource ID, disabled membership, insufficient role, expired subscription, cross-tenant cache/export/file/job/AI access, and invalid webhook/device credentials. Broad release requires independent security assessment as required by the SRS.
