# Merge notes (2026-11-20)

Included in this package: the full AgriLease update (password rules, owner verification, trial start, suspension reason and restore, clickable notifications, shared confirmation modal, admin subscription Add/Edit, My Bookings filters, two-column booking form, uniform buttons and search bars, hamburger sidebars, Back to Home on Login) plus the offline sync fix. See `docs/OFFLINE-SYNC-FIX.md`.

Run once after copying:
1. `cd backend && npm install` (adds `web-push`), then restart the backend. On start it adds any missing columns automatically (`rejection_reason`, `suspension_reason`, `action_url`, ...).
2. `cd frontend && npm install && npm run dev`, then unregister the old service worker once.

Left out of this zip: `backend/.env` (keep your own), `*.bak*`, `*.tmp`, `*.before-layout-fix`, `*patch*.txt`, `backup-before-admin-patch/`, the stray `frontend/App.jsx` and `frontend/Register.jsx`, and the nested duplicate `agrilease/agrilease/` folder.
