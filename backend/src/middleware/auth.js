const jwt = require('jsonwebtoken');
const db = require('../db');

// Binabasa ang JWT mula sa header na "Authorization: Bearer <token>".
// Ang user ay laging galing sa token, hindi sa request body.
// Ang login na gumagawa ng token ay trabaho ni Jenalyn (auth). Dapat ang payload ay { id, role }.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Kailangan mag-login.' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Expired o hindi valid ang session.' });
  }

  try {
    // Suspended o hindi na active na account: hindi na puwedeng gumamit ng API kahit may lumang token.
    const [rows] = await db.execute('SELECT status, suspension_reason FROM users WHERE id = ? LIMIT 1', [payload.id])
      .catch(async (error) => {
        if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;
        return db.execute('SELECT status, NULL AS suspension_reason FROM users WHERE id = ? LIMIT 1', [payload.id]);
      });
    if (!rows.length) return res.status(401).json({ error: 'Hindi na umiiral ang account na ito.' });
    if (rows[0].status === 'suspended') {
      const reason = rows[0].suspension_reason || 'Your account has been suspended.';
      return res.status(403).json({ success: false, suspended: true, error: reason, message: reason });
    }
    if (rows[0].status === 'rejected') {
      return res.status(403).json({ success: false, error: 'Your account registration was rejected.' });
    }
    req.user = { id: payload.id, role: payload.role };
  } catch (error) {
    return next(error);
  }

  // Log successful authenticated write actions throughout the API.
  // Successful logins are logged separately because they have no bearer token yet.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.once('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        db.execute(
          'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
          [payload.id, `${payload.role} ${req.method} ${req.originalUrl}`.slice(0, 255)]
        ).catch(error => console.error('Activity log insert failed:', error.message));
      }
    });
  }

  next();
}

// Check user role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Hindi ka pinapayagan sa gawaing ito.' });
    }
    next();
  };
}

// Check active and verified owner
async function requireVerifiedOwner(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access only.' });
    }

    const [rows] = await db.execute(
      `SELECT u.status, p.verification_status
       FROM users u
       INNER JOIN provider_profiles p
         ON p.user_id = u.id
       WHERE u.id = ? AND u.role = 'owner'
       LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Owner profile not found.' });
    }

    const owner = rows[0];

    if (owner.status !== 'active' || owner.verification_status !== 'verified') {
      return res.status(403).json({ error: 'Your owner account is not yet verified.' });
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth, requireRole, requireVerifiedOwner };
