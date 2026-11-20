AGRILEASE PHASE 5

This update adds the PWA app-shell foundation and farmer/owner messaging.

SETUP
1. Keep a backup of your current project.
2. Extract this ZIP over a separate copy of your existing project (the archive has no extra outer project folder).
3. No database migration is needed for Phase 5.
4. In backend, run: npm install
5. In frontend, run: npm ci (or npm install if npm ci cannot resolve the lockfile), then npm run build.
6. Start backend and frontend using the existing project instructions.
7. PWA service worker is registered only in production build; test it through the production preview/server, not Vite dev mode.

Chat requires an existing rental request between the farmer and owner. It uses HTTP polling every five seconds; it is not WebSocket yet.
Offline mode caches only the app shell/static assets. Booking, payment, chat sending, and private API data still require an internet connection.
