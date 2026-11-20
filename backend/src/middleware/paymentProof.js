const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const multer = require('multer');

const dir = path.join(__dirname, '..', '..', 'uploads', 'payment-proofs');

fs.mkdirSync(dir, { recursive: true });

const mimeExt = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = mimeExt[file.mimetype];
      const name = `payment_${Date.now()}_${Math.round(Math.random() * 1e8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!mimeExt[file.mimetype]) {
      return cb(new Error('Payment proof must be JPG, JPEG, PNG, or WEBP.'));
    }
    cb(null, true);
  },
}).single('payment_proof');

async function isValidImage(file) {
  const handle = await fsp.open(file.path, 'r');

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    const data = buffer.subarray(0, bytesRead);

    if (file.mimetype === 'image/jpeg') {
      return data.length >= 3 &&
        data[0] === 0xff &&
        data[1] === 0xd8 &&
        data[2] === 0xff;
    }

    if (file.mimetype === 'image/png') {
      return data.length >= 8 &&
        data.subarray(0, 8).equals(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );
    }

    if (file.mimetype === 'image/webp') {
      return data.length >= 12 &&
        data.toString('ascii', 0, 4) === 'RIFF' &&
        data.toString('ascii', 8, 12) === 'WEBP';
    }

    return false;
  } finally {
    await handle.close();
  }
}

function handlePaymentProof(req, res, next) {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) return next();

    try {
      const valid = await isValidImage(req.file);

      if (!valid) {
        await fsp.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          error: 'Invalid image content. Upload a genuine JPG, PNG, or WEBP image.',
        });
      }

      next();
    } catch (error) {
      await fsp.unlink(req.file.path).catch(() => {});
      console.error('Payment proof validation error:', error);
      res.status(500).json({ error: 'Unable to validate payment proof.' });
    }
  });
}

module.exports = { handlePaymentProof };
