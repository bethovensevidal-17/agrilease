// Mock-DB tests: owner starts a rental and marks it completed. Hindi kailangan ng MySQL.
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

const { updateStatus } = require('../src/controllers/rentalController');

function mockRes() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}
const booking = over => ({ id: 12, status: 'approved', farmer_id: 7, owner_id: 9, payment_status: 'verified', ...over });
const reqFor = status => ({ params: { id: '12' }, body: { status }, user: { id: 9, role: 'owner' } });
const run = async (status, row, update = { affectedRows: 1 }) => {
  notified.length = 0; calls.length = 0;
  responder = sql => sql.startsWith('SELECT') ? [[row]] : [update];
  const res = mockRes();
  await updateStatus(reqFor(status), res);
  return res;
};

test('owner starts an approved rental and the farmer is notified', async () => {
  const res = await run('ongoing', booking());
  assert.equal(res.body.success, true);
  assert.deepEqual(calls[1].params, ['ongoing', 12, 'approved']);
  assert.equal(notified[0][0], 7);
});

test('only an approved booking can be started', async () => {
  const res = await run('ongoing', booking({ status: 'pending' }));
  assert.equal(res.statusCode, 409);
  assert.equal(notified.length, 0);
});

test('owner marks a paid ongoing rental as completed', async () => {
  const res = await run('completed', booking({ status: 'ongoing' }));
  assert.equal(res.body.success, true);
  assert.deepEqual(calls[1].params, ['completed', 12, 'ongoing']);
  assert.match(notified[0][1], /completed/i);
});

test('cannot complete a rental that is not paid yet', async () => {
  const res = await run('completed', booking({ status: 'ongoing', payment_status: 'pending' }));
  assert.equal(res.statusCode, 409);
  assert.match(res.body.error, /payment/i);
});

test('cannot complete a rental that was never started', async () => {
  const res = await run('completed', booking({ status: 'approved' }));
  assert.equal(res.statusCode, 409);
});

test('another owner cannot progress the booking', async () => {
  const res = await run('ongoing', booking({ owner_id: 99 }));
  assert.equal(res.statusCode, 404);
});

test('double click returns 409 and sends no second notification', async () => {
  const res = await run('ongoing', booking(), { affectedRows: 0 });
  assert.equal(res.statusCode, 409);
  assert.equal(notified.length, 0);
});
