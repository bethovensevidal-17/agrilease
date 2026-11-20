// Pagsubok sa WebSocket chat. Run: npm test
// Ang database ay pinalitan ng fake para hindi kailangan ng MySQL.
process.env.JWT_SECRET = 'test-secret';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

const users = {
  1: { status: 'active', role: 'farmer' },
  2: { status: 'active', role: 'owner' },
  3: { status: 'suspended', role: 'farmer' },
  4: { status: 'active', role: 'admin' },
};
const dbPath = require.resolve(path.join(__dirname, '..', 'src', 'db.js'), { paths: [__dirname] });
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { execute: async (_sql, params) => (users[params[0]] ? [[users[params[0]]]] : [[]]) },
};
const { attachWebSocket, broadcastMessage } = require('../src/realtime');

const token = id => jwt.sign({ id, role: users[id].role }, process.env.JWT_SECRET);

function open(port) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const inbox = [];
  const waiters = [];
  socket.on('message', raw => {
    const data = JSON.parse(raw.toString());
    const waiter = waiters.shift();
    if (waiter) waiter(data); else inbox.push(data);
  });
  socket.next = () => new Promise(resolve => { const queued = inbox.shift(); if (queued) resolve(queued); else waiters.push(resolve); });
  socket.closed = new Promise(resolve => socket.on('close', code => resolve(code)));
  return new Promise((resolve, reject) => { socket.on('open', () => resolve(socket)); socket.on('error', reject); });
}

test('WebSocket chat', async t => {
  const server = http.createServer();
  const wss = attachWebSocket(server);
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  t.after(() => { wss.clients.forEach(c => c.terminate()); wss.close(); server.close(); });

  await t.test('valid token -> ready, at natatanggap ang bagong message ng receiver at sender', async () => {
    const farmer = await open(port);
    const owner = await open(port);
    farmer.send(JSON.stringify({ type: 'auth', token: token(1) }));
    owner.send(JSON.stringify({ type: 'auth', token: token(2) }));
    assert.equal((await farmer.next()).type, 'ready');
    assert.equal((await owner.next()).type, 'ready');

    broadcastMessage({ id: 10, sender_id: 1, receiver_id: 2, message: 'Hello', sent_at: '2026-11-20 10:00:00' });
    const toOwner = await owner.next();
    const toFarmer = await farmer.next();
    assert.equal(toOwner.type, 'message');
    assert.equal(toOwner.data.message, 'Hello');
    assert.equal(toFarmer.data.id, 10); // kopya rin para sa sender (ibang tab)
    farmer.close(); owner.close();
  });

  await t.test('hindi nakakatanggap ang ibang user na hindi kasali sa usapan', async () => {
    const farmer = await open(port);
    farmer.send(JSON.stringify({ type: 'auth', token: token(1) }));
    await farmer.next();
    broadcastMessage({ id: 11, sender_id: 2, receiver_id: 99, message: 'Hindi para sa iyo', sent_at: 'x' });
    broadcastMessage({ id: 12, sender_id: 2, receiver_id: 1, message: 'Para sa iyo', sent_at: 'x' });
    assert.equal((await farmer.next()).data.id, 12);
    farmer.close();
  });

  await t.test('mali ang token -> isinasara ang koneksyon', async () => {
    const socket = await open(port);
    socket.send(JSON.stringify({ type: 'auth', token: 'mali' }));
    assert.equal(await socket.closed, 4401);
  });

  await t.test('suspended na account at admin ay hindi pinapayagan', async () => {
    for (const id of [3, 4]) {
      const socket = await open(port);
      socket.send(JSON.stringify({ type: 'auth', token: token(id) }));
      assert.equal(await socket.closed, 4401);
    }
  });

  await t.test('ping -> pong', async () => {
    const socket = await open(port);
    socket.send(JSON.stringify({ type: 'auth', token: token(1) }));
    await socket.next();
    socket.send(JSON.stringify({ type: 'ping' }));
    assert.equal((await socket.next()).type, 'pong');
    socket.close();
  });
});
