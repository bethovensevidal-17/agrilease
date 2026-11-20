const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'provider-payment');
fs.mkdirSync(uploadDir, { recursive: true });

const extensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const safeName = `provider_qr_${Date.now()}_${Math.round(Math.random() * 1e8)}${extensions[file.mimetype]}`;
      callback(null, safeName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!extensions[file.mimetype]) {
      return callback(new Error('GCash QR must be JPG, PNG, or WEBP.'));
    }
    callback(null, true);
  },
}).single('gcash_qr');

function handleProviderPaymentQr(req, res, next) {
  upload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.code === 'LIMIT_FILE_SIZE'
          ? 'GCash QR image must not exceed 5 MB.'
          : error.message,
      });
    }
    next();
  });
}

module.exports = { handleProviderPaymentQr };
