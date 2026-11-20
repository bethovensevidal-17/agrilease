# Phase 8 – Native CMS and Farmer Profile

## Changes
- Added protected Farmer profile GET/PATCH endpoints using the existing users and farmer_profiles tables.
- Added Farmer Profile page for name, email, phone, address, and barangay.
- Added native Node.js/MySQL CMS APIs for homepage sections and announcements.
- Added Administrator CMS interface to create, edit, publish/unpublish, and delete homepage sections and announcements.
- Added public content API and rendered published content on the public Browse Equipment page.
- Added an additive SQL migration creating homepage_contents and announcements.
- No Directus dependency or Directus API is used.
- Preserved existing role-based JWT authentication and existing API route patterns.

## Database step required
Back up `agrilease_v2_db`, then import `database/migrations/2026-11-20-create-cms-content.sql` using phpMyAdmin. This step is required for the new CMS module. Existing system tables are not altered.

## Verification
- All backend source `.js` files passed `node --check`.
- Backend automated tests: 10/10 passed.
- A production Vite build was attempted but could not run in this Linux packaging environment because the supplied frontend `node_modules` does not contain `@rollup/rollup-linux-x64-gnu`. Run `npm install` and `npm run build` on the target Windows machine.
- Database-backed endpoint tests could not be run because no live user MySQL database was available in the packaging environment.

## Detailed specification follow-up
- Added `AdminContent` to the protected `/admin/content` React route; the navigation link and page now resolve to the same path.
- See `DETAILED-REQUIREMENTS-IMPLEMENTATION-GUIDE.md` for the complete detailed requirements baseline and the explicit decision to replace the legacy Directus section with native Node.js/React/MySQL CMS.

## Admin portal reference reconstruction (November 20, 2026)
- Replaced the Admin sidebar navigation with the six entries shown in the user's reference screenshots: Dashboard, User Management, Owner Verification, Equipment Management, Subscription Management, and Reports.
- Reworked the Admin dashboard composition to follow the supplied screenshot: breadcrumb/page heading, green welcome banner, four summary cards (Total Equipment, Total Reservations, Pending Reservations, Approved Reservations), Booking Activity chart, and Booking Status doughnut chart.
- Extended the admin dashboard API summary with approved, rejected, and cancelled rental counts and extended monthly analytics with monthly rental request totals.
- Kept notification and profile destinations available from the top-right header, not as extra sidebar entries.
- Backend syntax checks and the existing 10 backend tests pass. Frontend production build is not yet verified because frontend dependencies are not installed in this workspace. Live MySQL/browser validation remains required.
