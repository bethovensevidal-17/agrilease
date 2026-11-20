# AgriLease – Detailed Requirements Implementation Guide

This file records how the detailed user-provided specification is to be applied to the Node.js + React version.

## Technology decision (latest user instruction)
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL
- File uploads: Node.js/Multer
- CMS: Native AgriLease CMS built with Express APIs, MySQL tables, and the React Administrator interface
- Directus: NOT USED. The Directus section in the legacy specification is treated as a description of the former Laravel implementation and is replaced by the native CMS requirement.

## Functional requirements baseline

Use the uploaded document “AGRILEASE – DETAILED USER ROLES AND SYSTEM MODULES” as the complete functional checklist. Preserve its three roles and its terminology:

### Farmer
- Registration: first/middle/last name, email, contact number, password/confirmation, complete address, barangay, municipality, province; validate required fields and unique email; hash password; assign Farmer role.
- Login/session and protected farmer pages.
- Profile: personal information, address, password change, account information, logout.
- Dashboard: welcome, total/pending/approved/completed bookings, recent booking references and quick actions.
- Browse equipment: approved/available listings, image/details/owner/rate/condition/location; search, category/price/rate/location/availability/condition filters; sorting by newest, price, and name.
- Booking: start/end dates and times, quantity, duration, server-calculated estimate, availability/quantity validation, booking reference, Pending status, owner notification.
- My Bookings: search, status filters, details, eligible cancellation.
- Notifications: booking lifecycle, read/unread, related booking links.

### Equipment Owner
- Registration: personal and business details plus business permit and government ID uploads; pending verification and administrator notification.
- Login restrictions based on verification/account status.
- Dashboard: equipment/booking statistics, verification and subscription status, recent activity, quick actions.
- Equipment CRUD, image upload, availability including Available/Unavailable/Maintenance, approval state, subscription listing-limit enforcement, search/filters/pagination.
- Booking management: owner-scoped list, details, search, filters, approve/reject and farmer notifications.
- Subscriptions: Free Trial 7 days/2 listings; Monthly ₱199/30 days/3; Quarterly ₱549/90 days/5; Semi-Annual ₱999/180 days/10; Annual ₱1,799/365 days/unlimited. Enforce limits server-side and monitor expiration/history.
- Owner rental transaction history and notifications.
- Owner profile and settings, including verification/account status.

### Administrator
- Dashboard statistics, recent system activities, charts, quick actions.
- User management, search/filter/details, activate/suspend and account history.
- Owner verification, document review, approve/reject with reason, verification dates and account history.
- Equipment review/approval/rejection, search and filters.
- Booking monitoring with search, owner/date filters, booking detail and status.
- Rental transactions with search/filter/detail; do not imply payment gateway settlement merely from a recorded rental transaction.
- Subscription and payment records, separate payment states and subscription states.
- Reports: users, equipment, bookings, transactions, subscriptions, revenue; date/category/owner/status filters; analytics, print and PDF export. Keep rental amounts and subscription payments separate unless explicitly combined.
- Notifications, read/unread, related records.
- Administrator profile/settings.
- Native CMS: homepage sections, announcements, categories, public published-content API, and admin CRUD. No Directus dependency.

### Public website
- Home, About Us, How It Works, public approved equipment, announcements, contact and footer.
- Public visitors see only content and equipment allowed by publication/approval rules.

### System-wide
- Password hashing, authentication, role-based access control, secure file uploads, search/filter/sort/pagination, notifications, reporting and PDF/print.
- Keep backend as the authority for permissions, availability, rental price calculations, subscription limits and status transitions.

## Current package observations / cautions
- The package already contains Express route/controller modules for authentication, equipment, rentals, owner bookings, admin, notifications, subscriptions, reports, payment settings and native CMS.
- Native CMS endpoints and React CMS page exist. The `/admin/content` page route was missing from React routing despite being present in the admin navigation; this package update adds that route.
- The CMS migration is additive and must be imported into a BACKED-UP development database before using the CMS endpoints.
- Existing booking and subscription/payment features require end-to-end verification against the actual MySQL schema and real user roles. Do not assume every detailed requirement is complete solely because a page or controller exists.
- The production frontend build could not be run in this packaging environment because frontend dependencies are not installed (`vite: not found`). Run `npm install` and `npm run build` on the target machine.

## Important safety rule
Do not overwrite the user's working project or production database. Test this package in a separate extracted folder and a database backup/copy first.

## Admin improvements in this update
- Rental Monitoring now supports server-side owner-name/owner-ID filtering and rental start-date range filtering, in addition to status filtering.
- The date range is validated by the API; invalid dates and reversed ranges return a clear 400 response.
- Rental Monitoring includes a Clear Filters action and responsive filter styling.
- Backend regression tests were run after this change: 10 passed, 0 failed. A live MySQL/browser test is still required against the user's local database.
