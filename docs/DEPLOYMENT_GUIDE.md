# BusinessIQ Deployment Guide

## Current status

No deployment topology, container definition, CI/CD release workflow, cloud project setup, or operational runbook was found. Google Cloud is the target direction in the SRS, not a verified deployment. This guide is an initial setup baseline, not a production procedure.

## Local configuration

Copy `apps/backend/.env.example` to an ignored local `apps/backend/.env` and fill values through a local secret manager or secure environment. Never commit `.env` or paste secrets in chat. Expo uses `apps/frontend/.env.example`; the legacy web app has its own placeholder template. Public Supabase URL/anon keys are client configuration; service-role, database, billing, webhook, and AI credentials are server-only.

## Planned environments

Separate development, test, staging, and production identities, databases, credentials, storage, and provider accounts. Initial GCP candidates are Cloud Run, Cloud SQL for PostgreSQL, Secret Manager, Artifact Registry, Logging, Monitoring, and KMS where required. Keep application services portable and document network/IAM decisions before provisioning.

## Release controls required

- Build immutable reviewed artifacts; run unit, integration, contract, migration, frontend, security, and dependency checks.
- Apply backward-compatible migrations in a reviewed order to staging first; verify backups and restore before production data changes.
- Use least-privilege service accounts and restricted database connectivity; enforce HTTPS and explicit production CORS.
- Separate liveness from dependency readiness; add structured logs, metrics, traces, correlation IDs, and actionable alerts.
- Define rollback/forward-fix, incident, backup, restore, retention, and RPO/RTO procedures, then rehearse them.
- Keep debug docs and development access disabled in production unless explicitly reviewed.

Do not deploy until provider, jurisdiction, data, recovery, security, and acceptance decisions are approved and evidenced.
