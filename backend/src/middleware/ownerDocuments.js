const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDirectory = path.join(
  __dirname,
  '../../private_uploads'
);

// Private folder: hindi ito naka-expose bilang public static folder.
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = allowedTypes[file.mimetype];

    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!allowedTypes[file.mimetype]) {
    return cb(
      new Error('PDF, JPG, at PNG files lamang ang pinapayagan.')
    );
  }

  cb(null, true);
};

const ownerDocumentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 2,
  },
}).fields([
  { name: 'business_permit', maxCount: 1 },
  { name: 'government_id', maxCount: 1 },
  { name: 'farmer_id', maxCount: 1 },
]);

module.exports = {
  ownerDocumentUpload,
  uploadDirectory,
};
