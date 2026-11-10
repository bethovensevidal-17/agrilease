const jwt = require('jsonwebtoken');
const db = require('../db');

// Binabasa ang JWT mula sa header na "Authorization: Bearer <token>".
// Ang user ay laging galing sa token, hindi sa request body.
// Ang login na gumagawa ng token ay trabaho ni Jenalyn (auth). Dapat ang payload ay { id, role }.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Kailangan mag-login.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Expired o hindi valid ang session.' });
  }
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
