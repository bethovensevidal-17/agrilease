# AgriLease Phase 4 – Notifications and Booking Updates

## Included
- Added authenticated notification API for all signed-in roles:
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/read-all`
- Added Farmer and Owner notification pages using the existing `notifications` table.
- Added Owner sidebar navigation for Notifications.
- Notification page refreshes every 30 seconds (polling; no WebSocket server required).
- Booking submission creates notifications for the equipment owner and active admins.
- Owner approval/rejection notifies the farmer.
- Farmer cancellation notifies the equipment owner.
- Admin payment verification/rejection notifies the farmer.
- Existing Admin Notifications endpoint and page are retained.

## Database
No new SQL migration is required for this phase. It uses the existing `notifications` table in `agrilease_v2_db` (`user_id`, `title`, `message`, `is_read`, `created_at`).

## Verification performed
- `node --check` passed for every backend JavaScript source file.
- `npm test` passed: 4 pricing tests.
- Frontend production build was not run because `frontend/node_modules` is not present in this environment. Run `npm install` then `npm run build` locally.
- MySQL integration and browser testing remain to be performed against the user's Laragon database.

## Notes / limitations
- Notification refresh is polling every 30 seconds, not WebSocket push.
- Browser push notifications are not enabled in this phase; `push_subscriptions` remains available for a later PWA/push implementation.
- Notifications are best-effort after the main booking/payment transaction so a notification insert failure does not invalidate a successfully saved booking or verification.
