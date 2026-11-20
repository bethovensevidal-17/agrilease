# AgriLease Phase 2 Update Notes

## Included in this package

- Updated backend default database name to `agrilease_v2_db`.
- Added additive MySQL migration for equipment quantity, booking quantity/farm area/rate snapshots/idempotency, and `booking_payments`.
- Reworked rental booking API to use the supplied MySQL column names (`rental_rate`, `rate_type`, `availability_status`, `is_archived`, `start_date`, `end_date`, `total_amount`).
- Added server-side pricing for `hour`, `day`, and `hectare`; hourly billing uses exact elapsed hours and hectare pricing uses area × quantity.
- Added quantity availability checks, overlap checks against approved/ongoing rentals, owner self-rental prevention, and server-side date/payment validation.
- Added Cash, GCash, Bank Transfer, and Other payment-method handling. Non-cash submissions require a reference and proof upload (JPG/JPEG/PNG/WEBP, max 5 MB).
- Added private payment-proof download authorization; payment proof files are not served by the public static upload route.
- Added owner booking list/status endpoints and admin payment verification endpoints.
- Added React equipment details + booking form, live estimate preview, and Farmer My Bookings page.
- Added Available Quantity to Owner Add/Edit Equipment forms.
- Removed duplicate route registration from Express app.

## Apply the database migration

1. Back up `agrilease_v2_db` in phpMyAdmin first.
2. Select database `agrilease_v2_db`.
3. Open Import and select `backend/database/migrations/20261119_booking_foundation.sql`.
4. Run the import once. Do not re-run the same ALTER migration after it succeeds.

This migration does not drop or truncate existing tables or records.

## Configure backend

Copy `backend/.env.example` to `backend/.env`, then set:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=agrilease_v2_db
JWT_SECRET=use_a_long_random_secret_here
CLIENT_ORIGIN=http://localhost:5173
```

Use the actual MySQL password configured in Laragon. Never publish `.env` or use the example JWT secret for a deployed system.

## Run locally

Terminal 1:

```powershell
cd backend
npm install
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

## Verification performed in this update

- All backend source JavaScript files passed `node --check`.
- Pricing unit tests passed: hourly exact-duration calculation, per-hectare calculation, invalid duration, and invalid quantity.
- Frontend production build could not be run in this environment because package installation did not complete; run `npm install` and `npm run build` locally.
- Live MySQL/API integration has not yet been run against the user's Laragon database. Apply the migration and test with local credentials before treating the feature as production-ready.

## Key endpoints

- `POST /api/rentals`
- `GET /api/rentals/mine`
- `GET /api/rentals`
- `GET /api/rentals/:id`
- `PATCH /api/rentals/:id/cancel`
- `GET /api/owner/bookings`
- `PATCH /api/owner/bookings/:id/status`
- `GET /api/admin/bookings`
- `GET /api/admin/payments`
- `PATCH /api/admin/payments/:id/verify`
- `GET /api/rentals/payments/:id/proof`

Payment account details and QR codes are intentionally not fabricated. Configure verified payment instructions before accepting actual transfers.
