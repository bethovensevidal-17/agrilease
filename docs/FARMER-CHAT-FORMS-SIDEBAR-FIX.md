# Farmer Sidebar, Chat and Form Layout Update

## Farmer navigation
The Farmer sidebar now contains only Dashboard, Browse Equipment, My Bookings and Transactions. Messages and Notifications are accessed from the header icons; My Profile is accessed from the account/avatar control. Routes remain available.

## Chat troubleshooting
The message API detects either supported messages-table naming convention in this repository: `message` + `sent_at`, or `body` + `created_at`. Messages refresh every 2.5 seconds; contacts refresh every 15 seconds. This is near-real-time polling, not a WebSocket transport. Backend logs now include the failing endpoint and stack; development responses expose the underlying error detail for diagnosis.

Run `database/migrations/2026-11-20-add-message-read-tracking.sql` once in phpMyAdmin against the AgriLease database, then restart the backend. The migration checks for the `read_at` column and unread index before adding them.

If the chat still errors, check the backend terminal for `[API ERROR]` and the SQL error. Do not share passwords or `.env` values.

## Forms
Added consistent field, select, textarea, focus, label, and submit-button styling across Admin, Owner, Farmer and booking forms. Existing submit handlers and API payloads were not intentionally changed.
