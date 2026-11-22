// Mock-DB tests para sa subscription rules. Hindi kailangan ng MySQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const calls = [];
let responder = () => [[]];
const fakeDb = {
  execute: async (sql, params) => { calls.push({ sql, params }); return responder(sql, params); },
  query: async (sql, params) => { calls.push({ sql, params }); return responder(sql, params); },
  getConnection: async () => ({ ...fakeDb, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} })
};
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('src/db.js', fakeDb);
const notified = [];
stub('src/services/notifications.js', { notifyUser: async (...args) => { notified.push(args); }, notifyAdmins: async () => {} });

const controller = require('../src/controllers/subscriptionController');
const { checkListingAllowance, coverageCondition } = require('../src/services/subscriptionAccess');

function mockRes() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('pending request cannot be approved through Adjust (must use Review Payment)', async () => {
  responder = () => [[{ id: 5, owner_id: 9, plan_id: 2, status: 'pending', start_date: null, end_date: null }]];
  const res = mockRes();
  await controller.adminUpdateSubscription({ params: { id: '5' }, body: { status: 'active', reason: 'test' } }, res, e => { throw e; });
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /Review Payment/);
});

test('adjusting an active subscription requires a reason', async () => {
  responder = () => [[{ id: 5, owner_id: 9, plan_id: 2, status: 'active', start_date: new Date(), end_date: new Date(Date.now() + 864e5) }]];
  const res = mockRes();
  await controller.adminUpdateSubscription({ params: { id: '5' }, body: { plan_id: 2 } }, res, e => { throw e; });
  assert.equal(res.statusCode, 400);
});

test('cancel notifies the owner with the reason', async () => {
  notified.length = 0;
  responder = sql => sql.startsWith('SELECT id, owner_id') ? [[{ id: 5, owner_id: 9, plan_id: 2, status: 'active', start_date: new Date(), end_date: new Date(Date.now() + 864e5) }]] : [{ affectedRows: 1 }];
  const res = mockRes();
  await controller.adminUpdateSubscription({ params: { id: '5' }, body: { status: 'cancelled', reason: 'Duplicate account' } }, res, e => { throw e; });
  assert.equal(res.body.success, true);
  assert.match(notified[0][2], /Duplicate account/);
});

test('past expiry date is rejected when adjusting', async () => {
  responder = () => [[{ id: 5, owner_id: 9, plan_id: 2, status: 'active', start_date: new Date('2026-01-01'), end_date: new Date(Date.now() + 864e5), price: 199, plan_name: 'Monthly', duration_days: 30 }]];
  const res = mockRes();
  await controller.adminUpdateSubscription({ params: { id: '5' }, body: { plan_id: 2, end_date: '2020-01-01', reason: 'fix' } }, res, e => { throw e; });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /today or later/);
});

test('rejecting a payment needs a reason', async () => {
  const res = mockRes();
  await controller.verifyPayment({ params: { id: '3' }, body: { status: 'rejected' }, user: { id: 1 } }, res, e => { throw e; });
  assert.equal(res.statusCode, 400);
});

test('listing allowance: blocks when at plan limit, allows unlimited and below limit', async () => {
  responder = sql => sql.includes('FROM subscriptions') ? [[{ id: 1, equipment_limit: 3 }]] : [[{ total: 3 }]];
  assert.equal((await checkListingAllowance(9)).ok, false);
  responder = sql => sql.includes('FROM subscriptions') ? [[{ id: 1, equipment_limit: 3 }]] : [[{ total: 2 }]];
  assert.equal((await checkListingAllowance(9)).ok, true);
  responder = sql => sql.includes('FROM subscriptions') ? [[{ id: 1, equipment_limit: null }]] : [[{ total: 99 }]];
  assert.equal((await checkListingAllowance(9)).ok, true);
  responder = () => [[]];
  const none = await checkListingAllowance(9);
  assert.equal(none.ok, false);
  assert.equal(none.status, 403);
});

test('browse coverage condition includes a grace period and ignores cancelled plans', () => {
  const sql = coverageCondition('e');
  assert.match(sql, /status IN \('active', 'expired'\)/);
  assert.match(sql, /INTERVAL \d+ DAY/);
});
