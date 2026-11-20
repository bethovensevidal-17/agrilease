# Owner dashboard refinement

- Removed the two bottom dashboard panels (Equipment Listing Summary and Quick Actions).
- Kept the existing top header, fixed sidebar, three summary metrics, two charts, and recent rental bookings.
- Added unread count badges beside Messages and Notifications in the Owner sidebar.
- Navigation indicators refresh every 20 seconds. Notifications use the existing unread_count response.
- Message unread tracking uses `messages.read_at`; run `database/migrations/2026-11-20-add-message-read-tracking.sql` once before using the new message badge. Opening a conversation marks incoming messages as read.

## Apply database migration

Run the SQL migration once in the AgriLease MySQL database (phpMyAdmin SQL tab or MySQL client). Do not run it twice; the column/index will already exist after the first successful run.
