# Farmer Sidebar Correction

The Farmer sidebar is intentionally limited to these primary navigation links:
- Dashboard (`/farmer`)
- Browse Equipment (`/farmer/equipment`)
- My Bookings (`/farmer/rentals`)
- Transactions (`/farmer/transactions`)

Messages, Notifications, and My Profile are NOT sidebar navigation items. They remain available from the top header: Messages and Notifications as icon buttons with unread-count badges, and My Profile through the account/avatar control.

The active sidebar component is `frontend/src/pages/FarmerDashboard.jsx`, imported by `frontend/src/App.jsx` as the Farmer layout.
