# AgriLease Phase 3 – Owner Booking Management & Admin Payment Verification

## Included

- Owner Booking Requests page at `/owner/bookings`.
- Owner can filter booking status, review farmer/equipment/rental/payment details, view uploaded proof, and approve/reject pending bookings.
- Admin Booking Payment Verification page at `/admin/booking-payments`.
- Admin can filter pending/verified/rejected payments, inspect payment reference and proof, and verify/reject pending payment records.
- Protected payment-proof download endpoints enforce farmer/owner/admin access.
- Owner and Admin navigation entries are included.

## API endpoints used

- `GET /api/owner/bookings`
- `PATCH /api/owner/bookings/:id/status`
- `GET /api/owner/bookings/:id/proof`
- `GET /api/admin/payments`
- `GET /api/admin/payments/:id/proof`
- `PATCH /api/admin/payments/:id/verify`

## Important setup

This phase depends on the Phase 2 additive database migration:

`backend/database/migrations/20261119_booking_foundation.sql`

If that migration has not yet been applied, back up `agrilease_v2_db` first, then import it once through phpMyAdmin. Do not re-import it if it already succeeded.

Configure `backend/.env` from `backend/.env.example` and set the actual Laragon MySQL credentials. Do not share the `.env` file.

## Verification status

- Backend JavaScript syntax checks: passed.
- Backend pricing unit tests: 4/4 passed.
- Frontend production build: not verified in this environment because dependency installation did not complete.
- Live MySQL/API integration: not verified against the user's local Laragon database.

Payment instructions, account names/numbers, and QR codes are not fabricated. Use only verified payment account details before accepting actual transfers.
