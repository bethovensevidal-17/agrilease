# AGRILEASE backend

## Patakbuhin (Laragon)
1. Laragon: Start All, tapos patakbuhin ang `database/schema.sql` kung wala pa ang database na `agrilease`.
2. Sa folder na `backend`:
   ```
   copy .env.example .env
   npm install
   npm run dev
   ```
3. Buksan ang http://localhost:3000/api/health. Dapat lumabas ang `{"ok":true,...}`.
4. http://localhost:3000/api/categories ay dapat maglabas ng listahan ng categories.

## Equipment API (Sevidal)
| Method | Route | Sino | Gamit |
|---|---|---|---|
| GET | /api/equipment | lahat | Browse (approved, available, hindi archived). Query: `q`, `category_id`, `location`, `rate_type`, `page` (10 bawat page) |
| GET | /api/equipment/:id | lahat | Isang equipment |
| GET | /api/equipment/mine | owner | Sariling equipment. `?archived=1` para sa archived |
| POST | /api/equipment | owner | Add (multipart/form-data, field na `image` ay optional). Laging `pending` |
| PUT | /api/equipment/:id | owner | Edit |
| PATCH | /api/equipment/:id/archive | owner | Archive (soft delete) |
| PATCH | /api/equipment/:id/restore | owner | Restore |
| GET | /api/equipment/admin | admin | Lahat, `?status=pending` |
| PATCH | /api/equipment/:id/approval | admin | Body: `{"approval_status":"approved"}` o `"rejected"` |
| GET | /api/categories | lahat | Listahan ng categories |

## Para sa mga kasama
- Magdagdag ng sariling file sa `src/routes` at `src/controllers`, tapos isang `app.use(...)` na linya sa `src/app.js`.
- Ang `requireAuth` at `requireRole` sa `src/middleware/auth.js` ay gagana kapag ang login ay naglalabas ng JWT na may `{ id, role }` at ginamit ang parehong `JWT_SECRET`.
- Huwag i-commit ang `.env`.


## Existing AgriLease V2 database

The configured database is `agrilease_v2_db`. Its existing tables were inspected and the additive booking changes have already been applied manually: `equipment.quantity`, the booking snapshot fields on `rental_requests`, the `booking_payments` table, and the Free Trial plan. **Do not re-import the Phase 2 or Phase 6 SQL migration files** into this database.

Copy `.env.example` to `.env` and set the local MySQL credentials and a private `JWT_SECRET`. Then run `npm install` and `npm run dev` from this folder.

Booking endpoints:
- `POST /api/rentals` (Farmer; multipart form; online payments require reference and proof)
- `GET /api/rentals/mine` and `GET /api/rentals` (role-scoped bookings)
- `GET /api/rentals/:id`
- `PATCH /api/rentals/:id/cancel` (Farmer; pending only)
- `GET /api/owner/bookings`, `PATCH /api/owner/bookings/:id/status`, `GET /api/owner/bookings/:id/proof` (Owner)
- `GET /api/admin/bookings`, `GET /api/admin/payments`, `PATCH /api/admin/payments/:id/verify` (Admin)

The backend calculates booking totals from database rates, dates/times, farm area, and quantity. Frontend totals are previews only. Payment proof files are served only through authenticated endpoints.

## Phase 7 – Integration smoke checks

- `GET /api/health` checks that the Express API process is responding.
- `GET /api/health/db` checks whether the configured MySQL database is reachable.
- Run `npm test` to execute the backend pricing and schema-contract tests.

A successful API health response does not by itself prove that every feature workflow
works against the user's local database. Verify the database health endpoint and then
exercise Farmer, Owner, and Admin workflows in the local Laragon environment.
