# Global Notifications and Confirmation Dialog Update

## Scope
- Mounted one shared AgriLease dialog host at the application root so Farmer, Owner, Admin, and public/authentication pages can use the same branded modal.
- Replaced native browser `window.confirm`, `window.prompt`, and `alert` calls found in `frontend/src` with the shared modal API.
- Confirmation dialogs now cover logout, booking cancellation/approval, owner verification, equipment approval/archive/restore, payment verification, subscription free-trial activation, CMS deletion, account suspension/restoration, and report validation notices.
- Account suspension reason is collected through the branded prompt modal.
- Notification cards in Farmer, Owner, and Admin centers are clickable and keyboard accessible.
- Notification destinations prefer a safe relative `action_url`; role-aware fallback routing is used when older records have no action URL.
- Notification API queries now return `action_url`; notification creation service accepts an optional action URL.
- Service-worker cache name bumped to `agrilease-shell-v2` so deployed clients do not keep the older app shell.

## Database requirement
The existing migration `database/migrations/2026-11-20-account-security-and-notifications.sql` adds `notifications.action_url` idempotently. Run it against the same MySQL database configured for the Node backend before testing notification creation/listing. Existing notification rows remain valid; their action URL is NULL and frontend fallback routing applies.

## Verification
- Confirmed no `window.alert`, `window.confirm`, or `window.prompt` calls remain in frontend source.
- Ran `node --check` on all backend source JavaScript files successfully.
- Full Vite build was not completed in this environment because `npm ci` timed out; run `npm ci` and `npm run build` locally in `frontend`.
- Live notification navigation requires running the migration and testing against the actual MySQL database.
