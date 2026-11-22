# AgriLease

A farm equipment rental platform for Oriental Mindoro. Farmers browse and book equipment, owners list equipment and manage bookings, and an administrator verifies owners, reviews equipment and subscriptions, and manages the website content.

- **Backend:** Node.js, Express, MySQL (`mysql2`), JWT, `ws`, `web-push`
- **Frontend:** React (Vite), installable PWA
- **Database:** MySQL 8 (`agrilease_v2_db`)

## Features (course requirements)

| Requirement | Where it is implemented |
|---|---|
| Node.js backend API | `backend/src` (routes, controllers, middleware, services) |
| React frontend | `frontend/src` (farmer, owner and admin portals, public landing and browse pages) |
| PWA with selectable offline features and Background Sync | `frontend/public/sw.js`, `frontend/src/offline/`, page **Offline settings** in every portal |
| Push notifications | `backend/src/services/push.js`, `frontend/src/utils/push.js`, `push` handler in `sw.js` |
| Real-time chat (WebSocket) | `backend/src/realtime.js` (`/ws`), `frontend/src/pages/Messages.jsx` |
| Database | MySQL, structure in `database/agrilease_v2_db.structure.sql` |
| CRUD via Node.js API, soft delete / archiving | Equipment (`/api/equipment`, archive and restore), rentals, notifications, homepage content and announcements (`is_archived`) |

## Roles and main flow

- **Farmer:** browse equipment, book (cash, GCash, bank or other), pay, track rentals, chat with owners.
- **Owner:** register, get verified by the admin, choose a subscription plan, add equipment, approve or reject bookings, verify payments, start and complete rentals.
- **Admin:** verify owners, approve equipment, review subscription payments, view reports, manage website content.

Booking flow: `pending` → owner `approved` → payment (cash or proof) → owner marks payment verified → **Start rental** (`ongoing`) → **Mark completed**.

## Requirements

- Node.js 20 LTS or newer
- MySQL 8 (Laragon on Windows works)
- Git

## Quick start (fresh machine)

### 1. Database

1. Start MySQL (Laragon: **Start All**).
2. Create an empty database named `agrilease_v2_db` (utf8mb4).
3. Import `database/agrilease_v2_db.structure.sql`.
4. Import the files in `database/migrations/`, in this order:
   1. `2026-11-20-account-security-and-notifications.sql`
   2. `2026-11-20-add-message-read-tracking.sql`
   3. `2026-11-20-create-cms-content.sql`
   4. `2026-11-20-offline-sync-requests.sql`
   5. `2026-11-20-owner-verification-review-fields.sql`

Do these imports **before** the backend runs for the first time. The backend adds some of the same columns by itself on start, which would make the last migration fail with a duplicate column error.

Do not use any other SQL file. The booking tables, subscription plans and remaining columns are created by the backend on start (`backend/src/ensureSchema.js`).

### 2. Backend

```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `.env`: set `DB_PASSWORD` if your MySQL root has one, and set `JWT_SECRET` to a long random string.

```bash
npm install
npm run dev                 # starts the API on http://localhost:3000 and creates the remaining tables
```

In a second terminal, create the admin account and the equipment categories (safe to run again):

```bash
cd backend
npm run seed
```

Check `http://localhost:3000/api/health` and `http://localhost:3000/api/health/db`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api`, `/uploads` and `/ws` to the backend on port 3000.

### 4. Sign in

| Account | How to get it |
|---|---|
| Admin | Created by `npm run seed`. Default login: `adminagrilease@gmail.com` / `AgrileaseAdmin123!` (override with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`; change the password after the first login). |
| Farmer | Register on the site. |
| Owner | Register on the site, upload the documents, then sign in as admin and verify the owner. An owner needs an active subscription plan before listing equipment (a one-time 7-day Free Trial is available). |

## Push notifications (optional)

Push needs VAPID keys. Without them everything else works and in-app notifications still appear.

```bash
cd backend
npx web-push generate-vapid-keys
```

Put the keys in `backend/.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, restart the backend, then open **Offline settings** in the app, press the push notification button and allow notifications. Push works on `localhost` or HTTPS only.

## Offline mode (PWA)

1. Open the app once while online and sign in.
2. Open **Offline settings** and choose which features should work offline. Press **Save selected now** to store their data on the device.
3. While offline, selected pages show the saved data. Cash bookings, new equipment and chat messages are queued on the device.
4. When the connection returns, the queue is sent automatically (Background Sync, with a fallback when the page reopens).

## Tests

```bash
cd backend
npm test
```

## Project layout

```
backend/    Node.js API (src/routes, src/controllers, src/middleware, src/services, src/realtime.js)
frontend/   React app (src/pages, src/components, src/offline, public/sw.js, public/manifest.webmanifest)
database/   agrilease_v2_db.structure.sql and migrations/
docs/       Setup guide and development notes
```

More detail is in `docs/SETUP_GUIDE.md` and `backend/README.md`. The Markdown files in the repository root are development notes from earlier phases.
