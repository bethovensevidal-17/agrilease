# Farmer ID (RSBSA) verification — 2026-11-23

Same logic as the Equipment Owner (Business Permit + Government ID), now for farmers.

- Register (Farmer): RSBSA / Farmer ID number + photo/scan of the ID (PDF/JPG/PNG, max 5MB) are required.
- Account is created as `pending`; the farmer cannot log in until the admin approves.
- The same Farmer ID number cannot be used by two accounts (unique key).
- Admin > Farmer Verification (`/admin/farmers`): view the ID, compare with the number and name, Approve or Reject (reason required).
- Approve -> `users.status = active`; Reject -> `rejected`, and the farmer sees the reason on the login page.
- Admin gets a notification for every new farmer registration (links to /admin/farmers).
- Existing farmers are backfilled as `verified` so current accounts are not locked out.

Files: backend `authController.js`, `ownerDocuments.js`, `ensureSchema.js`, `routes/admin.js`, `farmerVerificationController.js` (new), `adminController.js` (dashboard count);
frontend `Register.jsx`, `FarmerVerification.jsx` (new), `App.jsx`, `AdminLayout.jsx`.
