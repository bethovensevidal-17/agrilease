const app = require('./app');
const db = require('./db');
const { ensureSchema } = require('./ensureSchema');
const { attachWebSocket } = require('./realtime');

const port = process.env.PORT || 3000;

// Para hindi mamatay ang buong server dahil sa isang bumagsak na query (lalo na habang nagde-defense).
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err));
process.on('uncaughtException', err => console.error('[uncaughtException]', err));

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('MySQL connected.');
    await ensureSchema();
  } catch (err) {
    console.error('Hindi makakonekta sa MySQL. I-check ang .env at kung naka-Start All ang Laragon.', err.message);
  }
  // http server ang ginagamit (hindi app.listen) para masalo rin ang WebSocket sa parehong port.
  const server = app.listen(port, () => console.log(`AGRILEASE API running at http://localhost:${port} (WebSocket: /ws)`));
  attachWebSocket(server);
})();