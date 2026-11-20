# Phase 11 — Deployment-ready API URL configuration

## Changes
- Removed hardcoded `http://localhost:3000` references from React source.
- Centralized API endpoint and uploaded asset URL construction in `frontend/src/api/config.js`.
- `VITE_API_URL` controls the API base URL. It defaults to `/api`, which works with the existing Vite development proxy and with a same-origin reverse proxy in production.
- `VITE_API_ORIGIN` optionally controls the backend origin for uploaded images and QR assets when the API is hosted on a different domain.
- Added `frontend/.env.example` with local and separately hosted backend examples.

## Production configuration
If frontend and backend are served from the same domain behind a reverse proxy:

```env
VITE_API_URL=/api
VITE_API_ORIGIN=
```

If they are hosted separately:

```env
VITE_API_URL=https://YOUR-API-DOMAIN/api
VITE_API_ORIGIN=https://YOUR-API-DOMAIN
```

Replace the example host with the real deployed API domain. Do not deploy with `localhost` values.

## Backend CORS
Set `CLIENT_ORIGIN` in `backend/.env` to the exact deployed frontend origin, including scheme and port if applicable. The Express app currently accepts one configured origin.

## Verification status
- Static scan: no `localhost:3000` references remain under `frontend/src`.
- Backend test suite: see the package test results; no database/browser test is implied.
- Frontend production build is not claimed as passed because frontend dependencies were not installed in this isolated environment.
- MySQL integration and deployment hosting remain to be tested using the user's actual environment and domains.
