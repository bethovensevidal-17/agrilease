const path = require('path');
const fs = require('fs');
const multer = require('multer');

const dir = path.join(__dirname, '..', '..', 'uploads', 'equipment');
fs.mkdirSync(dir, { recursive: true });

const allowed = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = allowed[file.mimetype];
    cb(null, `eq_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

// Hanggang 1MB, JPG/PNG/WEBP lang. Ang pangalan ng file ay ginagawa ng server, hindi galing sa user.
const uploadEquipmentImage = multer({
  storage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowed[file.mimetype]) return cb(new Error('JPG, PNG, o WEBP lang ang tinatanggap.'));
    cb(null, true);
  },
}).single('image');

// Wrapper para maayos ang error message sa halip na mag-crash.
function handleUpload(req, res, next) {
  uploadEquipmentImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

module.exports = { handleUpload };
