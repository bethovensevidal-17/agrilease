# AgriLease Phase 1 – Role Navigation and Transactions

## Changes
- Farmer primary navigation now follows the reference: Dashboard, Browse Equipment, My Bookings, Transactions.
- Farmer Messages, Notifications, and My Profile remain accessible under Communication & Account.
- Equipment Owner navigation follows the reference: Dashboard, My Equipment, Rental Bookings, Transactions, Subscription Plans.
- Owner Messages, Notifications, and Payment Settings remain accessible.
- Administrator navigation retains the six reference sections and exposes existing Rental Monitoring, Booking Payments, Content Management, Notifications, and Profile & Settings routes.
- Added a shared role-aware Rental Transactions page for Farmer and Owner. It reads the authenticated user's records from `GET /api/rentals`, supports search and payment-status filtering, and provides access to uploaded booking proof where available.
- Updated Farmer navigation icon layout and responsive sidebar scrolling.

## Routes added
- `/farmer/transactions`
- `/owner/transactions`

## Existing routes reused
- Farmer bookings: `/farmer/rentals`
- Owner equipment: `/owner/equipment`
- Owner bookings: `/owner/bookings`
- Owner subscription: `/owner/subscription`
- Owner payment settings: `/owner/payment-settings`
- Admin modules: `/admin/users`, `/admin/owners`, `/admin/equipment`, `/admin/subscriptions`, `/admin/reports`, `/admin/content`, `/admin/notifications`, `/admin/profile`

## Notes
- No database schema changes were made in this phase.
- No `.env` files, `.git` metadata, `node_modules`, or build output are included in this source package.
- JSX syntax was checked for all modified React files. Run `npm run build` in `frontend` on the local development machine for the full Vite production build.
