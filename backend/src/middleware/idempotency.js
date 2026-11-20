const db = require('../db');

// Protects offline-queued writes from being applied twice.
// The browser sends the same X-Idempotency-Key every time it retries one queued action
// (for example when the server saved it but the response was lost). The first request
// is processed normally; later retries get the saved response instead of a duplicate row.
// If the table or database is unavailable, requests proceed normally (no protection).
const STALE_AFTER_SECONDS = 120;
let tableReady = null;

function ensureTable() {
  if (!tableReady) {
    tableReady = db.query(
      `CREATE TABLE IF NOT EXISTS offline_sync_requests (
         id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         user_id INT NOT NULL,
         idem_key VARCHAR(100) NOT NULL,
         request_path VARCHAR(255) NOT NULL,
         state ENUM('processing','done') NOT NULL DEFAULT 'processing',
         status_code SMALLINT NULL,
         response_body MEDIUMTEXT NULL,
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         UNIQUE KEY offline_sync_user_key (user_id, idem_key)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ).catch(error => { tableReady = null; throw error; });
  }
  return tableReady;
}

async function idempotency(req, res, next) {
  const key = String(req.headers['x-idempotency-key'] || '').trim();
  if (!key || key.length > 100 || !req.user?.id) return next();

  let claimed = false;
  try {
    await ensureTable();
    const [insert] = await db.execute(
      'INSERT IGNORE INTO offline_sync_requests (user_id, idem_key, request_path, state) VALUES (?, ?, ?, ?)',
      [req.user.id, key, String(req.originalUrl).slice(0, 255), 'processing']
    );
    claimed = insert.affectedRows === 1;

    if (!claimed) {
      const [rows] = await db.execute(
        `SELECT state, status_code, response_body,
                TIMESTAMPDIFF(SECOND, updated_at, NOW()) AS idle_seconds
           FROM offline_sync_requests WHERE user_id = ? AND idem_key = ? LIMIT 1`,
        [req.user.id, key]
      );
      const row = rows[0];
      if (row && row.state === 'done') {
        let body = {};
        try { body = JSON.parse(row.response_body || '{}'); } catch (_) { body = {}; }
        res.set('Idempotent-Replay', 'true');
        return res.status(row.status_code || 200).json(body);
      }
      if (row && Number(row.idle_seconds) < STALE_AFTER_SECONDS) {
        return res.status(409).json({ code: 'REQUEST_IN_PROGRESS', error: 'Pinoproseso pa ang request na ito. Susubukan ulit.' });
      }
      // Stale 'processing' row (server stopped mid-request): take it over and process again.
      await db.execute('UPDATE offline_sync_requests SET updated_at = NOW() WHERE user_id = ? AND idem_key = ?', [req.user.id, key]);
      claimed = true;
    }
  } catch (error) {
    console.error('Idempotency check skipped:', error.message);
    return next();
  }

  let payload;
  const originalJson = res.json.bind(res);
  res.json = (body) => { payload = body; return originalJson(body); };
  res.once('finish', () => {
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    const query = ok
      ? db.execute(
          "UPDATE offline_sync_requests SET state = 'done', status_code = ?, response_body = ? WHERE user_id = ? AND idem_key = ?",
          [res.statusCode, JSON.stringify(payload ?? {}), req.user.id, key]
        )
      : db.execute('DELETE FROM offline_sync_requests WHERE user_id = ? AND idem_key = ?', [req.user.id, key]);
    query.catch(error => console.error('Idempotency update failed:', error.message));
  });
  res.once('close', () => {
    if (!res.writableFinished) {
      db.execute("DELETE FROM offline_sync_requests WHERE user_id = ? AND idem_key = ? AND state = 'processing'", [req.user.id, key])
        .catch(() => {});
    }
  });
  next();
}

module.exports = { idempotency };
