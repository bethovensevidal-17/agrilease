// Creates the starting data a fresh AgriLease database needs: one admin account and the equipment categories.
// Safe to run more than once: anything that already exists is skipped.
//
//   cd backend
//   npm run seed
//
// Optional: ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_NAME in backend/.env override the defaults below.
// Change the default password after the first login.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/db');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'adminagrilease@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AgrileaseAdmin123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'AgriLease Admin';

const CATEGORIES = [
  ['Tractor', 'Tractors for plowing, hauling and land preparation'],
  ['Harvester', 'Rice and crop harvesters'],
  ['Tiller', 'Hand tractors and power tillers'],
  ['Planter', 'Transplanters and seeders'],
  ['Sprayer', 'Knapsack and boom sprayers'],
  ['Trailer', 'Trailers for hauling produce'],
  ['Water Pump', 'Pumps for irrigation'],
];

async function seedAdmin() {
  const [existing] = await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [ADMIN_EMAIL]);
  if (existing.length) {
    console.log(`Admin ${ADMIN_EMAIL} already exists. Skipped.`);
    return;
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.execute(
    "INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active')",
    [ADMIN_NAME, ADMIN_EMAIL, hash]
  );
  console.log(`Created admin ${ADMIN_EMAIL}.`);
}

async function seedCategories() {
  let added = 0;
  for (const [name, description] of CATEGORIES) {
    const [found] = await db.execute('SELECT id FROM equipment_categories WHERE category_name = ? LIMIT 1', [name]);
    if (found.length) continue;
    await db.execute('INSERT INTO equipment_categories (category_name, description) VALUES (?, ?)', [name, description]);
    added += 1;
  }
  console.log(added ? `Added ${added} equipment categories.` : 'Equipment categories already exist. Skipped.');
}

(async () => {
  try {
    const [[info]] = await db.query('SELECT DATABASE() AS db_name');
    console.log('Database:', info.db_name);
    await seedAdmin();
    await seedCategories();
    console.log('Done.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    console.error('Check backend/.env, that MySQL is running, and that database/agrilease_v2_db.structure.sql was imported.');
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
