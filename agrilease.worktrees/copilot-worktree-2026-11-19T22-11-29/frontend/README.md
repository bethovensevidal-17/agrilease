# AGRILEASE frontend (React + Vite)

## Patakbuhin
1. Sa folder na `backend`: `npm run dev` (dapat naka-on ang Laragon at MySQL).
2. Sa folder na `frontend`:
   ```
   npm install
   npm run dev
   ```
3. Buksan ang http://localhost:5173. Dapat lumabas ang Browse equipment. Ang `/api` at `/uploads` ay awtomatikong ipinapasa sa backend (port 3000).

## Paano magdagdag ng page (para sa lahat)
1. Gumawa ng file sa `src/pages`, halimbawa `Login.jsx`.
2. Magdagdag ng isang `<Route>` na linya sa `src/App.jsx`.
3. Magdagdag ng link sa `links` sa `src/components/Layout.jsx`, kung dapat may link sa sidebar.
4. Gamitin ang `api()` sa `src/api/client.js` para sa lahat ng tawag sa backend. Kusa nitong inilalagay ang JWT token.
