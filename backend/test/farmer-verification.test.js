// Mock-DB tests para sa Farmer ID (RSBSA) verification ng admin. Hindi kailangan ng MySQL.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const executed = [];
let rowsFor = () => [[]];
const connection = {
  execute: async (sql, params) => { executed.push({ sql, params }); return rowsFor(sql, params); },
  beginTransaction: async () => { executed.push({ sql: 'BEGIN' }); },
  commit: async () => { executed.push({ sql: 'COMMIT' }); },
  rollback: async () => { executed.push({ sql: 'ROLLBACK' }); },
  release: () => {},
};
const fakeDb = {
  execute: async (sql, params) => { executed.push({ sql, params }); return rowsFor(sql, params); },
  getConnection: async () => connection,
};
const stub = (rel, exports) => {
  const file = require.resolve(path.join('..', rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};
stub('src/db.js', fakeDb);
const notified = [];
stub('src/services/notifications.js', { notifyUser: async (...a) => { notified.push(a); }, notifyAdmins: async () => {} });
stub('src/middleware/ownerDocuments.js', { uploadDirectory: path.join(__dirname, 'no-such-dir') });

const { getFarmers, verifyFarmer, viewFarmerDocument } = require('../src/controllers/farmerVerificationController');

const mockRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } });
const adminReq = body => ({ params: { id: '15' }, body, user: { id: 1, role: 'admin' }, query: {} });

test('list rejects an unknown verification status', async () => {
  const res = mockRes();
  await getFarmers({ query: { status: 'weird' } }, res, e => { throw e; });
  assert.equal(res.statusCode, 400);
});

test('list returns farmers with their RSBSA number', async () => {
  rowsFor = () => [[{ id: 15, full_name: 'Jenalyn Mendoza', farmer_id_number: '17-52-08-012-000101', verification_status: 'pending' }]];
  const res = mockRes();
  await getFarmers({ query: { status: 'pending' } }, res, e => { throw e; });
  assert.equal(res.body.total, 1);
  assert.match(executed.at(-1).sql, /farmer_profiles/);
});

test('rejecting needs a reason of at least 5 characters', async () => {
  const res = mockRes();
  await verifyFarmer(adminReq({ status: 'rejected', rejection_reason: 'no' }), res, e => { throw e; });
  assert.equal(res.statusCode, 400);
});

test('approving activates the account, marks the profile verified and notifies the farmer', async () => {
  executed.length = 0; notified.length = 0;
  rowsFor = sql => sql.includes('FROM users') ? [[{ id: 15 }]] : sql.includes('FROM farmer_profiles') ? [[{ id: 4, farmer_id_path: 'abc.png' }]] : [{ affectedRows: 1 }];
  const res = mockRes();
  await verifyFarmer(adminReq({ status: 'verified' }), res, e => { throw e; });
  assert.equal(res.body.success, true);
  assert.ok(executed.some(e => /UPDATE users SET status/.test(e.sql || '') && e.params[0] === 'active'));
  assert.ok(executed.some(e => /UPDATE farmer_profiles/.test(e.sql || '') && e.params[0] === 'verified'));
  assert.ok(executed.some(e => e.sql === 'COMMIT'));
  assert.equal(notified[0][0], 15);
});

test('cannot approve a farmer who has no uploaded ID', async () => {
  executed.length = 0;
  rowsFor = sql => sql.includes('FROM users') ? [[{ id: 15 }]] : [[{ id: 4, farmer_id_path: null }]];
  const res = mockRes();
  await verifyFarmer(adminReq({ status: 'verified' }), res, e => { throw e; });
  assert.equal(res.statusCode, 409);
  assert.ok(executed.some(e => e.sql === 'ROLLBACK'));
});

test('rejecting stores the reason and marks the account rejected', async () => {
  executed.length = 0; notified.length = 0;
  rowsFor = sql => sql.includes('FROM users') ? [[{ id: 15 }]] : sql.includes('FROM farmer_profiles') ? [[{ id: 4, farmer_id_path: 'abc.png' }]] : [{ affectedRows: 1 }];
  const res = mockRes();
  await verifyFarmer(adminReq({ status: 'rejected', rejection_reason: 'ID is blurry' }), res, e => { throw e; });
  assert.equal(res.body.success, true);
  assert.ok(executed.some(e => /UPDATE users SET status/.test(e.sql || '') && e.params[0] === 'rejected'));
  assert.match(notified[0][2], /ID is blurry/);
});

test('unknown farmer returns 404', async () => {
  rowsFor = () => [[]];
  const res = mockRes();
  await verifyFarmer(adminReq({ status: 'verified' }), res, e => { throw e; });
  assert.equal(res.statusCode, 404);
});

test('document view returns 404 when no file is on record', async () => {
  rowsFor = () => [[{ farmer_id_path: null }]];
  const res = mockRes();
  await viewFarmerDocument({ params: { id: '15' } }, res, e => { throw e; });
  assert.equal(res.statusCode, 404);
});
