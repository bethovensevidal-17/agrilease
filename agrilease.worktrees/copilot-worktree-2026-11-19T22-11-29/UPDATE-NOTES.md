# AgriLease Node.js + React – Update Notes

## Applied in this package
- Added pagination to the Admin Dashboard's Recent System Activity list (10 records per page).
- Preserved the existing Express API, React routes/layouts, MySQL schema, booking/payment workflows, and subscription implementation.
- Confirmed the free-trial plan logic in the included backend source enforces the 7-day / 2-equipment limit.

## Validation performed
- Backend automated tests: 10 passed (`cd backend && node --test`).
- Frontend source syntax: 36 JavaScript/JSX files parsed successfully.
- A production Vite build could not be completed in the packaging environment because the uploaded Windows `node_modules` did not contain Rollup's Linux optional binary; `npm ci` also timed out in this environment. Reinstall dependencies on the target Windows machine before running the build.

## Safety / setup
- No `.env`, Git metadata, or `node_modules` are included. This avoids shipping machine-specific credentials or dependencies.
- `backend/.env.example` is included. Copy it to `backend/.env` and set your local MySQL/JWT values there. Do not share the real `.env` file.
- Keep your existing project folder and database backup. Extract this ZIP to a separate folder first, compare it, then test locally before replacing anything.
- No database migration or destructive SQL was executed as part of this package update.

## Admin Equipment Management update
- Expanded the existing Admin Equipment Management screen with category, availability, archive, approval, and keyword filters.
- Added a listing details dialog with image, owner, category, rental rate, quantity, condition, location, approval state, description, and submission date.
- Extended the existing admin equipment API query to support keyword, category, availability, owner, and archive filters.
- Kept the existing approval endpoint and role-protected route; did not add a new project or nested project folder.
- Validation performed: backend syntax checks and existing backend tests. Live MySQL/browser behavior still requires local verification.
