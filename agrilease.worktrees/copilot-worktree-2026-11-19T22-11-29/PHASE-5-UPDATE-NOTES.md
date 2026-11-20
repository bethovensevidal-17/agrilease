# AgriLease Phase 5 – PWA Foundation and Farmer/Owner Messaging

## Included
- Added a web app manifest and service worker for installable PWA behavior.
- Service worker caches the app shell and same-origin static GET assets.
- API requests (`/api/*`), uploads (`/uploads/*`), and non-GET requests are never cached. Booking/payment writes therefore still require a connection.
- Service worker registration is enabled in production builds only.
- Replaced the Farmer Messages placeholder with a working messaging screen and added the same screen to the Owner route.
- Added authenticated message endpoints:
  - `GET /api/messages/contacts`
  - `GET /api/messages/conversations`
  - `GET /api/messages/:userId`
  - `POST /api/messages`
- Chat is limited to farmer/owner pairs connected through an existing rental request. SQL uses parameterized queries and does not expose admin conversations.
- Chat refreshes every five seconds (HTTP polling).

## Database
- Uses the existing `messages` table from `agrilease_v2_db` (`sender_id`, `receiver_id`, `message`, `sent_at`).
- No new SQL migration is required.

## Verification
- `node --check` passed for every backend JavaScript source file.
- `npm test` passed: 4/4 existing rental pricing tests.
- Frontend dependency installation/build could not be completed in this environment (npm install timed out); run `npm ci` and `npm run build` in `frontend` on the Laragon machine.
- MySQL integration and browser/PWA installation tests remain pending against the user's local database/browser.

## Current limitations (not claimed as implemented)
- Chat uses five-second HTTP polling, not WebSocket yet.
- Browser push notifications are not configured; VAPID keys and a push delivery service are still required. The existing `push_subscriptions` table is not modified.
- Offline support is limited to the cached app shell/static assets. Authenticated data, booking submissions, payments, and chat sends require internet connectivity. No background queue/sync for transactions is enabled.
