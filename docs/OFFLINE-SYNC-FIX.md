# Offline Sync Fix (2026-11-20)

## Bugs found
1. **Owner Add Equipment was never queued.** The form called the API directly, so offline it failed and nothing was saved.
2. **Offline Farmer bookings were sent too early.** The service worker flushed the queue right after the booking was saved, even though the page was offline, so the Owner already saw the request. (This happens when only the page is offline, for example the DevTools Network "Offline" test, or wifi off while the API runs on localhost.)
3. A retry after a lost response could create duplicates; an expired login (1 day) marked queued items as permanently failed; Background Sync was never retried; chat push opened a non-existent `/messages` route; every push replaced the previous one (same tag); a push subscription stayed tied to the previous account after logout/login.

## What changed
- Owner Add Equipment (text + image) is stored in IndexedDB when offline or when the server is unreachable, and synced automatically.
- Items saved while offline are held and only sent after the browser's `online` event (or the next app open while online).
- `X-Idempotency-Key` on equipment, booking and chat requests + `backend/src/middleware/idempotency.js` (auto-creates `offline_sync_requests`; migration file included) so a retry never creates a duplicate.
- Expired session: item waits (status "Sign in required") and syncs after the user logs in again. Validation errors from the server are shown on Offline Access.
- Pending/rejected items are shown on My Bookings (Farmer) and Equipment Management (Owner).
- Push: unique tag per notification, role-correct chat link, in-app navigation on click, `pushsubscriptionchange` handling, subscription re-registered on login and removed on logout.

## Tested
- Real Chromium (Playwright) against a mock API: held items not sent early; multipart image + JSON booking sync; no duplicate on retry; network/5xx stay pending; 401 waits for login; 4xx marked failed with message. All passed.
- Idempotency middleware with a fake DB: 8/8 passed. Backend tests: 15/15 passed. esbuild bundle of the frontend: OK.
- NOT tested: live MySQL, a real browser push delivery, and `npm run build` (no network here). Please run them on your machine.

## How to test on your machine
1. `cd frontend && npm run dev` and `cd backend && npm run dev`. Hard refresh once (DevTools > Application > Service Workers > Update/Unregister) so the new `sw.js` (cache v5) is used.
2. Owner: open Add Equipment online once (caches categories), go offline, submit. It shows PENDING SYNC. Go online: it appears in Equipment Management (pending Admin approval).
3. Farmer: go offline, submit a Cash booking. The Owner must NOT see it until you go online again.

---

## Merged into the full project (2026-11-20)

- Offline queue, idempotency, service worker v5 and the Offline Access page are now part of this project. Offline Access is in the sidebar of Farmer, Owner and Admin (`/farmer/offline`, `/owner/offline`, `/admin/offline`).
- **Modals:** every confirmation in the offline files (remove pending action, add equipment, submit booking) uses the shared AgriLease modal (`window.agrileaseDialog`). No native browser dialogs remain.
- **Chat:** this project's chat uses polling, so Messages keeps polling and only gains the offline queue (messages written offline are sent when the connection returns). A WebSocket server is not part of this project.
- **Push:** added `backend/src/services/push.js` and `routes/push.js` (`/api/push/public-key`, `/subscribe`). Push is optional: run `npm install` in `backend`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in `.env` (generate with `npx web-push generate-vapid-keys`). Without keys, in-app notifications still work and push is skipped. Each user turns it on from Offline Access > "Turn on push notifications".
- The service worker is now registered in dev too (`npm run dev`), so offline sync can be tested without a production build. After updating, unregister the old service worker once (DevTools > Application > Service Workers).
- `offline_sync_requests` is created automatically by the API on first use; `database/migrations/2026-11-20-offline-sync-requests.sql` is optional.
