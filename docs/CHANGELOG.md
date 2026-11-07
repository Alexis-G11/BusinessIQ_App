# BusinessIQ Changelog

## 2026-11-07 — Development foundation started

- Created the owner-requested `codex/businessiq-development` branch from the clean repository `main` commit; `main` was not modified.
- Added architecture and currency decision records, implementation roadmap, initial SRS traceability, security/database/API/test/deployment/integration documents, and development status.
- Added a backend `.env.example` containing placeholders only.
- Replaced the unused `python-jose` requirement with direct `PyJWT[crypto]` declaration to match `app/auth.py` imports.
- Added pure unit tests for current two-decimal money conversion and sale calculation behavior, plus initial backend and frontend CI jobs.
- Verification results and limitations are recorded in `DEVELOPMENT_STATUS.md`; no database or external provider was contacted.
