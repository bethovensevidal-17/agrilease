# AgriLease full update notes (2026-11-20)

## Implemented in this package
- Backend and registration UI now enforce passwords of at least 8 characters containing letters, numbers, and a special character.
- Owner verification reads optional profile fields defensively, so missing `rejection_reason`, `reviewed_at`, and `trial_used` columns no longer break the owner list. The query keeps owner accounts visible even if a provider profile row is absent.
- Approving an owner starts an active 7-day trial immediately (uses a configured free/trial plan ID when present, otherwise a NULL plan ID).
- Approval/rejection sends an owner notification.
- Account suspension requires a reason, saves it when the `users.suspension_reason` column exists, and sends the exact reason as a notification. Restoring an account sends a restoration notification. Login returns the stored reason when available.
- Notification cards are keyboard-accessible clickable items and route to the related portal section based on notification contents; explicit `action_url` is supported after running the migration.
- Farmer booking details page now has a compact equipment summary and a two-column Rental Details / Payment Details form on wider screens, collapsing on mobile.
- Added a Back to Home link on Login.
- Search inputs and report filter controls receive responsive full-width sizing rules.
- Added an additive SQL migration for provider rejection reason, user suspension reason, and notification action URL.

## Must run
Run `database/migrations/2026-11-20-account-security-and-notifications.sql` against the SAME MySQL database configured in `backend/.env` before testing suspension reasons and explicit notification destinations.

## Not claimed as live-verified
This package has not been tested against the user's running MySQL database. Subscription administration CRUD, removal of the database plans UI, all-page custom confirmation modals, every requested filter alignment, and a full mobile audit still require review and integration testing against the live database and browser. Do not treat the remaining items as complete just because this package is built.
