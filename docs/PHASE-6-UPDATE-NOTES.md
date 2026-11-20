# AgriLease Phase 6 – Subscription Management and Reports

## Included
- Added owner subscription endpoints: list active plans, view latest subscription, request one-time trial, and submit paid subscription with payment proof.
- Added admin subscription payment verification/rejection. A verified payment activates its subscription and sets start/end dates; a rejected payment cancels the pending subscription.
- Added protected admin endpoint to view uploaded subscription payment proof.
- Enforced active subscription equipment limits in the Node.js equipment creation controller (server-side).
- Seeded the agreed plans using the supplied `agrilease_v2_db` table names: Free Trial 7 days / 2 listings; Monthly ₱199 / 30 days / 3; Quarterly ₱549 / 90 days / 5; Semi-Annual ₱999 / 180 days / 10; Annual ₱1,799 / 365 days / unlimited.
- Added Owner > Subscription page and admin Verify/Reject/View Proof actions.
- Aligned report date filtering to the actual schema date columns (`start_date`, `end_date`, `payment_date`).
- Corrected the admin subscription query to use `plan_name`, `start_date`, `end_date`, `payment_method`, `reference_number`, `proof_image`, and `payment_date` from the supplied database structure.

## Migration
Import `backend/database/migrations/20261119_subscription_foundation.sql` into `agrilease_v2_db` after taking a database backup. It seeds/updates plan records; it does not drop tables or delete existing records.

## Important setup
- Existing backend `.env` must point to `DB_NAME=agrilease_v2_db`.
- Paid subscription requests accept GCash, Bank Transfer, or Other and require a JPG/JPEG/PNG/WEBP proof image up to 5 MB.
- A paid subscription remains pending until an Admin verifies the payment.
- The Free Trial can be activated once per provider profile. The server checks `provider_profiles.trial_used`.
- Equipment listing limits count non-archived equipment. Server blocks new equipment if there is no active, unexpired subscription or the plan limit is reached.

## Verification performed in this environment
- `node --check` passed for modified backend files.
- Existing backend unit tests: 4/4 passed.
- Frontend production build was not verified because frontend dependencies were not installed; `npm ci` did not complete within the available execution window.
- Live MySQL/API integration was not run because the user's Laragon database is not available in this environment.
