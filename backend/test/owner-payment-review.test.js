// Mock-DB tests: owner verifies or rejects GCash/bank/other proof. Hindi kailangan ng MySQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const calls = [];
let responder = () => [[]];
const fakeDb = {
  execute: async (sql, params) => { calls.push({ sql, params }); return responder(sql, params); },
  query: async (sql, params) => { calls.push({ sql, params }); return responder(sql, params); },
};
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('src/db.js', fakeDb);
const notified = [];
stub('src/services/notifications.js', { notifyUser: async (...args) => { notified.push(args); }, notifyAdmins: async () => {} });

const { updateOwnerPayment } = require('../src/controllers/paymentController');

function mockRes() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const record = over => ({ payment_id: 5, payment_method: 'gcash', payment_status: 'pending', proof_image: 'payment-proofs/a.png', reference_number: '123', booking_id: 12, booking_status: 'approved', farmer_id: 7, owner_id: 9, ...over });
const reqFor = action => ({ params: { id: '12' }, body: { action }, user: { id: 9, role: 'owner' } });

test('owner verifies a GCash proof and the farmer is notified', async () => {
  notified.length = 0; calls.length = 0;
  responder = sql => sql.startsWith('SELECT') ? [[record()]] : [{ affectedRows: 1 }];
  const res = mockRes();
  await updateOwnerPayment(reqFor('verify'), res);
  assert.equal(res.body.success, true);
  assert.deepEqual(calls[1].params.slice(0, 2), ['verified', 9]);
  assert.equal(notified[0][0], 7);
});

test('owner rejects a proof', async () => {
  notified.length = 0; calls.length = 0;
  responder = sql => sql.startsWith('SELECT') ? [[record({ payment_method: 'bank' })]] : [{ affectedRows: 1 }];
  const res = mockRes();
  await updateOwnerPayment(reqFor('reject'), res);
  assert.equal(res.body.success, true);
  assert.equal(calls[1].params[0], 'rejected');
  assert.match(notified[0][1], /rejected/i);
});

test('another owner cannot review the payment', async () => {
  responder = () => [[record({ owner_id: 99 })]];
  const res = mockRes();
  await updateOwnerPayment(reqFor('verify'), res);
  assert.equal(res.statusCode, 404);
});

test('cash payments cannot be reviewed as proof', async () => {
  responder = () => [[record({ payment_method: 'cash' })]];
  const res = mockRes();
  await updateOwnerPayment(reqFor('verify'), res);
  assert.equal(res.statusCode, 400);
});

test('cannot verify without any proof or reference', async () => {
  responder = () => [[record({ proof_image: null, reference_number: null })]];
  const res = mockRes();
  await updateOwnerPayment(reqFor('verify'), res);
  assert.equal(res.statusCode, 409);
});

test('rejected or cancelled bookings have no payment to review', async () => {
  responder = () => [[record({ booking_status: 'cancelled' })]];
  const res = mockRes();
  await updateOwnerPayment(reqFor('verify'), res);
  assert.equal(res.statusCode, 409);
});

test('already reviewed payment returns 409 and sends no notification', async () => {
  notified.length = 0;
  responder = sql => sql.startsWith('SELECT') ? [[record()]] : [{ affectedRows: 0 }];
  const res = mockRes();
  await updateOwnerPayment(reqFor('verify'), res);
  assert.equal(res.statusCode, 409);
  assert.equal(notified.length, 0);
});

test('without an online action it falls back to cash confirmation', async () => {
  responder = () => [[record({ payment_method: 'gcash' })]];
  const res = mockRes();
  await updateOwnerPayment({ params: { id: '12' }, body: { action: 'cash_received' }, user: { id: 9 } }, res);
  assert.equal(res.statusCode, 400);
});
