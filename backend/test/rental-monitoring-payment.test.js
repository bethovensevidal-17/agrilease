// Mock-DB test: kasama na ang payment method/status sa Rental Monitoring ng admin.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const queries = [];
const tableColumns = {
  rental_requests: ['id', 'status', 'total_amount', 'created_at', 'start_date', 'end_date', 'farmer_id', 'equipment_id'],
  users: ['id', 'full_name'],
  equipment: ['id', 'equipment_name', 'owner_id'],
  booking_payments: ['id', 'booking_id', 'payment_method', 'payment_status'],
};
const fakeDb = {
  execute: async (sql, params) => [(tableColumns[params[0]] || []).map(COLUMN_NAME => ({ COLUMN_NAME }))],
  query: async (sql, params) => { queries.push(sql); return [[{ id: 1, payment_method: 'cash', payment_status: 'pending' }]]; },
};
const file = require.resolve(path.join('..', 'src/db.js'));
require.cache[file] = { id: file, filename: file, loaded: true, exports: fakeDb };

const { getRentals } = require('../src/controllers/adminExtraController');

test('admin rental list reads the payment method and status from booking_payments', async () => {
  const res = { body: null, json(b) { this.body = b; return this; }, status() { return this; } };
  await getRentals({ query: {} }, res, e => { throw e; });
  assert.match(queries[0], /LEFT JOIN booking_payments bp/);
  assert.match(queries[0], /bp\.payment_method AS payment_method/);
  assert.match(queries[0], /bp\.payment_status AS payment_status/);
  assert.equal(res.body.data[0].payment_method, 'cash');
});
