# AgriLease Phase 7 – Integration Readiness and QA

## Changes in this batch
- Added `GET /api/health/db` so local setup can separately verify MySQL connectivity.
- Added the user-supplied `agrilease_v2_db` structure-only export as a read-only schema reference and added contract tests against its actual table/column names.
- Kept existing route definitions, authentication, frontend routes, and migrations intact.
- Added operational test guidance to `backend/README.md`.

## Checks performed in the build environment
- `node --check` passed for every backend JavaScript source file.
- Backend test suite passed (7/7), including the four existing rental pricing tests and three schema/pricing contract checks.
- Frontend build could not be verified: Vite was not installed because dependency installation did not complete in this environment (`vite: not found`).
- Live MySQL integration could not be run because the user's Laragon MySQL instance is not available here.

## Local verification after extraction
1. Back up the existing `agrilease_v2_db` database.
2. Do not re-import Phase 2 or Phase 6 migrations if they were already applied successfully.
3. Confirm `backend/.env` has `DB_NAME=agrilease_v2_db` and correct local credentials.
4. In backend: `npm ci`, then `npm test` (expected: 7 tests), then `npm run dev`.
5. Open `http://localhost:5000/api/health` and `http://localhost:5000/api/health/db` (adjust port if configured differently).
6. In frontend: `npm ci`, `npm run build`, then `npm run dev`.
7. Test booking, payment verification, subscription activation/limits, notifications, messaging, and reports using test accounts.

## Important
This is an integration-readiness/QA batch, not a claim that live end-to-end tests have passed. The frontend build and live database/API workflows still require verification on the user's machine.
