// Real-time chat gamit ang WebSocket (library: ws).
// Paano gumagana:
//   1. Ang browser ay kumokonekta sa ws://<server>/ws
//   2. Ang unang message ng browser ay { type: 'auth', token } (ang parehong JWT ng REST API).
//   3. Kapag may bagong message na na-save sa database (sa REST POST /api/messages),
//      tinatawag ang broadcastMessage() para ipadala agad ito sa receiver at sa sender (ibang tab/device).
// Ang pagse-send at pag-save ay nananatili sa REST API para gumana pa rin ang offline queue at idempotency.
const jwt = require('jsonwebtoken');
const { WebSocketServer, WebSocket } = require('ws');
const db = require('./db');

const AUTH_TIMEOUT_MS = 5000;
const HEARTBEAT_MS = 30000;

// userId -> Set ng mga bukas na socket (puwedeng maraming tab o device ang isang user)
const clients = new Map();
let wss = null;
let heartbeat = null;

function addClient(userId, socket) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(socket);
}

function removeClient(userId, socket) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) clients.delete(userId);
}

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

// Parehong patakaran ng requireAuth: valid ang token at hindi suspended/rejected ang account.
async function authenticate(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const [rows] = await db.execute('SELECT status, role FROM users WHERE id = ? LIMIT 1', [payload.id]);
  if (!rows.length || ['suspended', 'rejected'].includes(rows[0].status)) throw new Error('Account not allowed.');
  if (!['farmer', 'owner'].includes(rows[0].role)) throw new Error('Chat is for farmers and owners only.');
  return { id: Number(payload.id), role: rows[0].role };
}

function attachWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: 4096 });

  wss.on('connection', socket => {
    socket.isAlive = true;
    socket.userId = null;
    socket.on('pong', () => { socket.isAlive = true; });

    // Kailangan mag-auth sa loob ng 5 segundo, kung hindi ay isasara ang koneksyon.
    const authTimer = setTimeout(() => {
      if (!socket.userId) socket.close(4401, 'Auth timeout');
    }, AUTH_TIMEOUT_MS);

    socket.on('message', async raw => {
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return; }
      if (data?.type === 'auth' && !socket.userId) {
        try {
          const user = await authenticate(String(data.token || ''));
          socket.userId = user.id;
          clearTimeout(authTimer);
          addClient(user.id, socket);
          sendJson(socket, { type: 'ready' });
        } catch {
          sendJson(socket, { type: 'error', error: 'Unauthorized' });
          socket.close(4401, 'Unauthorized');
        }
      }
      // Ang 'ping' ng client ay sinasagot ng 'pong' (pang-check ng koneksyon).
      if (data?.type === 'ping') sendJson(socket, { type: 'pong' });
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      if (socket.userId) removeClient(socket.userId, socket);
    });
    socket.on('error', () => socket.terminate());
  });

  // Heartbeat: tinatanggal ang mga patay nang koneksyon (nawalan ng internet, atbp.).
  heartbeat = setInterval(() => {
    wss.clients.forEach(socket => {
      if (!socket.isAlive) return socket.terminate();
      socket.isAlive = false;
      socket.ping();
    });
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}

// Ipinapadala ang bagong message sa receiver at sa sender (para sa ibang bukas nilang tab/device).
function broadcastMessage(message) {
  const payload = { type: 'message', data: message };
  [Number(message.receiver_id), Number(message.sender_id)].forEach(userId => {
    (clients.get(userId) || new Set()).forEach(socket => sendJson(socket, payload));
  });
}

function isOnline(userId) {
  return (clients.get(Number(userId))?.size || 0) > 0;
}

module.exports = { attachWebSocket, broadcastMessage, isOnline };
