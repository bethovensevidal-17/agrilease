# Setup guide (Windows + Laragon)

## 1. Tools
Install Git, Node.js 20 LTS, and Laragon (it provides MySQL). Start Laragon and press **Start All**.

## 2. Create the database
1. Open Laragon > Database (HeidiSQL), or run `mysql -u root` in the Laragon terminal.
2. Run `database/schema.sql`. It creates the `agrilease` database, all tables from the docx, the 4 subscription plans, and the starter categories.
3. If MySQL shows an error, copy the exact message to the team chat and fix that line in the file.

## 3. Create the GitHub repository (one member, once)
1. GitHub > New repository > `agrilease` (private), add `.gitignore` for Node.
2. Settings > Collaborators: add `noeldimailig` and your two teammates.
3. In this folder: `git init`, `git add .`, `git commit -m "chore: starter kit"`, `git branch -M main`, `git remote add origin <repo-url>`, `git push -u origin main`, then `git checkout -b develop` and `git push -u origin develop`.
4. Teammates run `git clone <repo-url>` and `git checkout develop`.

## 4. Project layout to build (matches the instructor's checklist)
```
agrilease/
  backend/   Node.js API: src/routes, src/controllers, src/middleware (JWT, role guard), src/services, src/sockets, migrations/
  frontend/  React (Vite): src/pages, src/components, src/api, public/manifest.webmanifest, public/sw.js
  database/  schema.sql
  docs/
  prototype/ the working clickable prototype
  assets/    official-qr-placeholder.png
```
Environment variables go in `backend/.env` (never commit it): `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=agrilease`, `JWT_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
Generate VAPID keys with `npx web-push generate-vapid-keys`.

## 5. Rules to copy from the prototype into the real code
- Price: hourly = rate × hours (rounded up). Daily = full days × rate + extra hours × rate/24. Per hectare = rate × hectares.
- Late fee: after a 15-minute grace period, each late hour (rounded up) × late rate; default 1.5× hourly rate; computed when the owner marks the rental completed.
- Status transitions, conflict check (half-open interval, checked again on approve and on offline sync), payment must not exceed the balance.
- Subscription plans: Monthly ₱199/30 days/3 equipment, Quarterly ₱549/90/5, Semi-Annual ₱999/180/10, Annual ₱1,799/365/unlimited.
- Locations: Victoria or Socorro, Oriental Mindoro only.
- Backend must hash passwords with bcrypt, use JWT, take the user from the token (never from the request body), use parameterized SQL, and validate uploads.

## 6. Replace the placeholder QR
The prototype and `assets/official-qr-placeholder.png` use a placeholder QR. Open GCash > Receive Money / QR, save your real QR, then upload it in Admin > Subscriptions (prototype) or replace the file in `/uploads` (real system).
