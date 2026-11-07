# BusinessIQ Changelog

## 2026-11-07 — Development foundation started

- Created the owner-requested `codex/businessiq-development` branch from the clean repository `main` commit; `main` was not modified.
- Added architecture and currency decision records, implementation roadmap, initial SRS traceability, security/database/API/test/deployment/integration documents, and development status.
- Added a backend `.env.example` containing placeholders only.
- Replaced the unused `python-jose` requirement with direct `PyJWT[crypto]` declaration to match `app/auth.py` imports.
- Added pure unit tests for current two-decimal money conversion and sale calculation behavior, plus initial backend and frontend CI jobs.
- Verification results and limitations are recorded in `DEVELOPMENT_STATUS.md`; no database or external provider was contacted.

## 2026-11-07 — Frontend verification and dependency hardening

- Fixed Expo inventory screens to use existing design tokens and corrected billing UI types.
- Removed fabricated subscription plan/status values from the client summary; plan is now nullable where the API does not return it, and status is derived from `/auth/me`.
- Updated the Expo lockfile's vulnerable transitive `shell-quote` and `ws` versions while keeping major-version compatibility.
- Updated the preserved legacy web app's Vite patch version to 6.4.5.
- Expo TypeScript check and web export passed; legacy typecheck and production build passed. Expo dependency audit still reports 27 noncritical findings (9 high, 17 moderate, 1 low). See `DEVELOPMENT_STATUS.md`.

## 2026-11-07 — Trial entitlement enforcement

- New organizations now remain pending until phone verification; phone numbers are stored as pending contact data and the seven-day trial starts only after Supabase confirms the phone.
- Account setup now routes users with an unverified phone to the existing verification flow.
- Backend business permission dependencies require phone verification and an active subscription or unexpired trial. The owner role does not bypass subscription entitlement.
- Updated signup copy to describe phone verification and the trial accurately.
- Added five deterministic entitlement tests. The complete pure backend suite passes (11 tests); API/database integration and email verification remain outstanding.
