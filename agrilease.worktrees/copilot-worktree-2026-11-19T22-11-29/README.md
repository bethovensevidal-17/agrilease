# AgriLease – Node.js + React

This package keeps the project folders at the ZIP root (`backend/`, `frontend/`, `database/`, `docs/`, etc.). It does not add an extra enclosing `agrilease/` folder.

See `docs/SETUP_GUIDE.md` for setup, `PHASE-2-UPDATE-NOTES.md`, `PHASE-3-UPDATE-NOTES.md`, and `PHASE-4-UPDATE-NOTES.md` for implementation notes.

Database: `agrilease_v2_db` (configure locally in `backend/.env`; do not commit credentials).

## Native CMS and Farmer Profile additions

The website content module is built into this application (Express + MySQL + React); no Directus or other external CMS is required.

1. Back up `agrilease_v2_db` before applying database changes.
2. In phpMyAdmin, select `agrilease_v2_db` and import `database/migrations/2026-11-20-create-cms-content.sql`.
3. Start the backend and frontend using the existing `docs/SETUP_GUIDE.md` instructions.
4. Sign in as Administrator and open **CMS / Website Content** to manage homepage sections and announcements.
5. Published content is served by `GET /api/content/public` and displayed above the public equipment browse list.
6. Farmers can manage their name, email, phone, address, and barangay under **My Profile**.

The SQL migration is additive and creates only `homepage_contents` and `announcements`. It does not alter existing tables. Back up the database first and apply it only to the intended AgriLease database.

## Verification status for this package

- Backend JavaScript syntax checks: passed.
- Backend automated tests: 10 passed.
- React/JSX source parsing: see update notes.
- Vite production build could not be completed in the packaging environment because the uploaded `node_modules` is missing the Linux Rollup optional dependency. On Windows, run `npm install` in `frontend` and then `npm run build`.
