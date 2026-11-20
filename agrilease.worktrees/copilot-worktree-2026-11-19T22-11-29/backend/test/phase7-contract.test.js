const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pricing = require('../src/utils/pricing');

const schemaPath = path.join(__dirname, '..', '..', 'database', 'agrilease_v2_db.structure.sql');
const schema = fs.readFileSync(schemaPath, 'utf8').toLowerCase();

test('reference schema contains the actual AgriLease V2 core tables', () => {
  for (const table of [
    'users', 'equipment', 'equipment_categories', 'equipment_images',
    'farmer_profiles', 'provider_profiles', 'rental_requests', 'subscriptions',
    'subscription_plans', 'subscription_payments', 'notifications', 'messages',
    'push_subscriptions', 'activity_logs'
  ]) {
    assert.match(schema, new RegExp('create\\s+table\\s+`?' + table + '`?'));
  }
});

test('reference schema uses the real V2 column and enum names', () => {
  assert.match(schema, /`equipment_name`/);
  assert.match(schema, /`rental_rate`/);
  assert.match(schema, /`rate_type` enum\('hour','day','hectare'\)/);
  assert.match(schema, /`start_date` datetime/);
  assert.match(schema, /`end_date` datetime/);
  assert.match(schema, /`total_amount` decimal/);
});

test('booking pricing module exposes the expected server-side calculation', () => {
  assert.equal(typeof pricing.calculateRentalTotal, 'function');
  assert.equal(typeof pricing.calcBase, 'function');
});

const equipmentController = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'equipmentController.js'), 'utf8');
const rentalController = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'rentalController.js'), 'utf8');
const paymentController = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'paymentController.js'), 'utf8');

test('equipment API maps its quantity field to the actual V2 equipment.quantity column', () => {
  assert.match(equipmentController, /e\.quantity AS available_quantity/);
  assert.match(equipmentController, /quantity = \?/);
  assert.match(equipmentController, /INSERT INTO equipment\s*\([\s\S]*?\bquantity,\s*rate_type/);
});

test('booking API writes actual V2 rental request and payment columns', () => {
  assert.match(rentalController, /rental_requests[\s\S]*?quantity, start_date, end_date, farm_area, total_amount, rental_rate_snapshot, rate_type_snapshot/);
  assert.match(rentalController, /booking_payments[\s\S]*?reference_number, proof_image, payment_status/);
  assert.doesNotMatch(rentalController, /client_key|rental_quantity, start_date|rate_snapshot, rate_type_snapshot, client_key/);
});

test('booking payment verification uses the existing payment_date and proof_image columns', () => {
  assert.match(paymentController, /payment_date = NOW\(\)/);
  assert.match(paymentController, /p\.proof_image/);
  assert.doesNotMatch(paymentController, /verified_at|p\.payment_proof/);
});
