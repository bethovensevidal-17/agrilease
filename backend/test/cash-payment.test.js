// Mock-DB tests para sa cash payment confirmation ng owner. Hindi kailangan ng MySQL.
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

const { confirmCashReceived } = require('../src/controllers/paymentController');

function mockRes() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const record = over => ({ payment_id: 3, payment_method: 'cash', payment_status: 'pending', booking_id: 12, booking_status: 'approved', farmer_id: 7, owner_id: 9, ...over });
const req = { params: { id: '12' }, user: { id: 9, role: 'owner' } };

test('owner can mark an approved cash booking as received and the farmer is notified', async () => {
  notified.length = 0; calls.length = 0;
  responder = sql => sql.startsWith('SELECT') ? [[record()]] : [{ affectedRows: 1 }];
  const res = mockRes();
  await confirmCashReceived(req, res);
  assert.equal(res.body.success, true);
  assert.match(calls[1].sql, /payment_status = 'verified'/);
  assert.equal(notified[0][0], 7);
});

test('another owner cannot confirm the payment', async () => {
  responder = () => [[record({ owner_id: 99 })]];
  const res = mockRes();
  await confirmCashReceived(req, res);
  assert.equal(res.statusCode, 404);
});

test('online payments are not confirmed by the owner', async () => {
  responder = () => [[record({ payment_method: 'gcash' })]];
  const res = mockRes();
  await confirmCashReceived(req, res);
  assert.equal(res.statusCode, 400);
});

test('booking must be approved first', async () => {
  responder = () => [[record({ booking_status: 'pending' })]];
  const res = mockRes();
  await confirmCashReceived(req, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /Approve the booking first/);
});

test('rejected and cancelled bookings cannot be marked paid', async () => {
  for (const status of ['rejected', 'cancelled']) {
    responder = () => [[record({ booking_status: status })]];
    const res = mockRes();
    await confirmCashReceived(req, res);
    assert.equal(res.statusCode, 409);
  }
});

test('already confirmed cash payment returns 409 and sends no second notification', async () => {
  notified.length = 0;
  responder = sql => sql.startsWith('SELECT') ? [[record()]] : [{ affectedRows: 0 }];
  const res = mockRes();
  await confirmCashReceived(req, res);
  assert.equal(res.statusCode, 409);
  assert.equal(notified.length, 0);
});
