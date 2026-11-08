const jwt = require('jsonwebtoken');

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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Hindi ka pinapayagan sa gawaing ito.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
