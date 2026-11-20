const path = require('path');
const fs = require('fs/promises');
const db = require('../db');

const fields = [
  'gcash_number',
  'gcash_account_name',
  'bank_name',
  'bank_account_name',
  'bank_account_number',
  'other_payment_instructions',
];

function clean(value, maxLength, label) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new Error(`${label} is too long.`);
  return trimmed || null;
}

async function getPaymentSettings(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT gcash_number, gcash_account_name, gcash_qr_path,
              bank_name, bank_account_name, bank_account_number,
              other_payment_instructions
       FROM provider_profiles WHERE user_id = ? LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Owner profile not found.' });
    }

    const data = rows[0];
    res.json({
      success: true,
      data: {
        ...data,
        gcash_qr_url: data.gcash_qr_path
          ? `/uploads/provider-payment/${encodeURIComponent(path.basename(data.gcash_qr_path))}`
          : null,
      },
    });
  } catch (error) {
    console.error('Get owner payment settings:', error);
    res.status(500).json({ success: false, error: 'Unable to load payment settings.' });
  }
}

async function updatePaymentSettings(req, res) {
  let newQrPath = req.file ? req.file.filename : null;
  try {
    const values = {
      gcash_number: clean(req.body.gcash_number, 30, 'GCash number'),
      gcash_account_name: clean(req.body.gcash_account_name, 150, 'GCash account name'),
      bank_name: clean(req.body.bank_name, 100, 'Bank name'),
      bank_account_name: clean(req.body.bank_account_name, 150, 'Bank account name'),
      bank_account_number: clean(req.body.bank_account_number, 50, 'Bank account number'),
      other_payment_instructions: clean(req.body.other_payment_instructions, 5000, 'Other payment instructions'),
    };

    const [profiles] = await db.execute(
      'SELECT gcash_qr_path FROM provider_profiles WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    if (!profiles.length) {
      if (newQrPath) await fs.unlink(path.join(__dirname, '..', '..', 'uploads', 'provider-payment', newQrPath)).catch(() => {});
      return res.status(404).json({ success: false, error: 'Owner profile not found.' });
    }

    const oldQrPath = profiles[0].gcash_qr_path;
    const qrPath = newQrPath || oldQrPath || null;

    await db.execute(
      `UPDATE provider_profiles
       SET gcash_number = ?, gcash_account_name = ?, gcash_qr_path = ?,
           bank_name = ?, bank_account_name = ?, bank_account_number = ?,
           other_payment_instructions = ?
       WHERE user_id = ?`,
      [
        values.gcash_number,
        values.gcash_account_name,
        qrPath,
        values.bank_name,
        values.bank_account_name,
        values.bank_account_number,
        values.other_payment_instructions,
        req.user.id,
      ]
    );

    if (newQrPath && oldQrPath && oldQrPath !== newQrPath) {
      const oldFile = path.resolve(__dirname, '..', '..', 'uploads', 'provider-payment', path.basename(oldQrPath));
      const root = path.resolve(__dirname, '..', '..', 'uploads', 'provider-payment') + path.sep;
      if (oldFile.startsWith(root)) await fs.unlink(oldFile).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Payment settings saved successfully.',
      data: { ...values, gcash_qr_path: qrPath, gcash_qr_url: qrPath ? `/uploads/provider-payment/${encodeURIComponent(path.basename(qrPath))}` : null },
    });
  } catch (error) {
    if (newQrPath) {
      await fs.unlink(path.join(__dirname, '..', '..', 'uploads', 'provider-payment', newQrPath)).catch(() => {});
    }
    if (error.message && /must be text|too long/.test(error.message)) {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error('Update owner payment settings:', error);
    res.status(500).json({ success: false, error: 'Unable to save payment settings.' });
  }
}

module.exports = { getPaymentSettings, updatePaymentSettings };
