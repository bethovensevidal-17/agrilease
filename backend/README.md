# AGRILEASE backend

## Patakbuhin (Laragon)
1. Laragon: Start All, tapos patakbuhin ang `database/schema.sql` kung wala pa ang database na `agrilease`.
2. Sa folder na `backend`:
   ```
   copy .env.example .env
   npm install
   npm run dev
   ```
3. Buksan ang http://localhost:3000/api/health. Dapat lumabas ang `{"ok":true,...}`.
4. http://localhost:3000/api/categories ay dapat maglabas ng listahan ng categories.

## Equipment API (Sevidal)
| Method | Route | Sino | Gamit |
|---|---|---|---|
| GET | /api/equipment | lahat | Browse (approved, available, hindi archived). Query: `q`, `category_id`, `location`, `rate_type`, `page` (10 bawat page) |
| GET | /api/equipment/:id | lahat | Isang equipment |
| GET | /api/equipment/mine | owner | Sariling equipment. `?archived=1` para sa archived |
| POST | /api/equipment | owner | Add (multipart/form-data, field na `image` ay optional). Laging `pending` |
| PUT | /api/equipment/:id | owner | Edit |
| PATCH | /api/equipment/:id/archive | owner | Archive (soft delete) |
| PATCH | /api/equipment/:id/restore | owner | Restore |
| GET | /api/equipment/admin | admin | Lahat, `?status=pending` |
| PATCH | /api/equipment/:id/approval | admin | Body: `{"approval_status":"approved"}` o `"rejected"` |
| GET | /api/categories | lahat | Listahan ng categories |

## Para sa mga kasama
- Magdagdag ng sariling file sa `src/routes` at `src/controllers`, tapos isang `app.use(...)` na linya sa `src/app.js`.
- Ang `requireAuth` at `requireRole` sa `src/middleware/auth.js` ay gagana kapag ang login ay naglalabas ng JWT na may `{ id, role }` at ginamit ang parehong `JWT_SECRET`.
- Huwag i-commit ang `.env`.
