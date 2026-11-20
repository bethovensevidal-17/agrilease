# AgriLease Owner Dashboard Update

Updated the Owner Overview to use a compact, analytics-first dashboard instead of a wall of statistic cards.

## Included
- Preserved the existing Owner top header/topbar and navigation.
- Owner sidebar remains fixed to the viewport; the main content scrolls independently.
- Three compact summary metrics: approved equipment, total rental bookings, and pending requests needing review.
- Six-month rental booking activity line chart.
- Booking status doughnut chart.
- Recent rental bookings table with farmer, equipment, schedule, amount, and status.
- Equipment listing status summary and quick links.
- Responsive layout for tablet and mobile.

## Data sources
- `GET /api/equipment/mine` via `api('/equipment/mine')`
- `GET /api/owner/bookings` via `api('/owner/bookings')`

Charts are derived from returned API records. Empty states are shown when no booking data exists; no fabricated chart records are inserted.
