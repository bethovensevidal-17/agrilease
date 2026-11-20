AGRILEASE ADMIN UI IMPROVEMENTS

Included files (copy/merge into the matching paths in your project):
- frontend/src/pages/OwnerVerification.jsx
- frontend/src/pages/SubscriptionsPayments.jsx
- frontend/src/pages/Reports.jsx
- frontend/src/admin-modules.css

Changes:
1. Owner Verification: removed the bottom Close button; the top X remains.
2. Subscriptions & Payments: shows database-backed subscription plan cards, plus GCash QR and COD payment method panels.
3. Reports: replaces statistic cards with two charts (monthly platform activity and registered accounts by role).
4. CSS: adds responsive styling for the plan cards, payment panels, and charts.

Important:
- The GCash QR area is intentionally a placeholder. Add the official merchant QR image before accepting payments; no fake QR code was generated.
- The payment panels are UI only. They do not process, verify, or save a payment.
- Reports use the existing /api/admin/dashboard and /api/admin/analytics/monthly endpoints.
- Chart.js and react-chartjs-2 are already listed in the supplied frontend package.json.
- This ZIP does not include database changes, .env files, node_modules, or unrelated project files.
