# Admin Sidebar and Chat Server Error Fix

## Sidebar cleanup
- Admin sidebar retains only Dashboard, User Management, Owner Verification, Equipment Management, Subscription Management, and Reports.
- Owner sidebar no longer repeats Messages and Notifications; those remain available from the header icons. Payment Settings remains as an owner-specific operational page.
- Farmer sidebar remains limited to Dashboard, Browse Equipment, My Bookings, and Transactions; Messages, Notifications, and Profile remain accessible from the header.

## Chat and admin messaging
- Admin is not an eligible participant in the farmer-owner rental chat. Removed the misleading Admin Messages page route and Admin header message icon, which previously called an API that explicitly rejects admin roles.
- Farmer-owner chat remains API-backed with polling (not WebSocket). The message controller supports both schema variants: `message`/`sent_at` and `body`/`created_at`.
- The unread tracking SQL migration now detects either timestamp column before adding `read_at`, so it works with both supplied database snapshots.

## Verification
- Node syntax checks passed for backend message controller and app.
- TypeScript JSX transpile checks passed for AdminLayout, OwnerLayout, and App.
- Live chat must still be tested against the user's local MySQL database; no local database credentials or running database were available in this packaging environment.
