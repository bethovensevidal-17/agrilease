# Farmer Dashboard Update

## Changes
- Reworked the Farmer dashboard to use a compact welcome banner and only three summary cards: Available Equipment, Total Bookings, and Pending.
- Added a Nearby Equipment map using Leaflet and OpenStreetMap tiles. Equipment listings are grouped by saved municipality/location in the current database.
- Added dynamic six-month booking activity and booking-status doughnut charts using the farmer's `/api/rentals/mine` data.
- Added a compact recent bookings table with dates, quantity, total amount, and status.
- Fixed the desktop Farmer sidebar to the viewport (`position: fixed; height: 100vh`) so it does not grow or scroll with the main content. The mobile layout switches back to a normal stacked navigation.
- Kept existing Farmer routes, API authentication, and booking flows intact.

## Data note
The current equipment schema stores municipality/location text, not precise latitude/longitude coordinates. Therefore, map pins represent the municipality saved on the listing (Victoria or Socorro, Oriental Mindoro), not the exact equipment property. For exact nearby distances and individual equipment pins, add latitude/longitude fields and a location picker to the equipment create/edit forms.

## Dependencies
Chart.js and react-chartjs-2 were already declared in the frontend package. Leaflet is loaded from its public CDN at runtime; an internet connection is required for the map library and OpenStreetMap tiles.

## Verification
The updated FarmerDashboard.jsx passed a JSX syntax transpilation check. A full Vite production build could not be completed in this environment because `npm ci` did not finish installing dependencies. Run `npm install` and `npm run build` in the local `frontend` folder after applying this package.
