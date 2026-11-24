const db = require('../db');
const fs = require('fs');
const path = require('path');
const { notifyUser } = require('../services/notifications');
const { uploadDirectory } = require('../middleware/ownerDocuments');

// GET /api/admin/farmers?status=pending
const getFarmers = async (req, res, next) => {
  try {
    const { status } = req.query;

    if (status && !['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status.' });
    }

    let sql = `SELECT u.id, u.full_name, u.email, u.phone, u.status AS account_status, u.created_at,
        f.address, f.barangay, f.farmer_id_number, f.farmer_id_path, f.verification_status, f.rejection_reason, f.reviewed_at
      FROM users u
      LEFT JOIN farmer_profiles f ON f.user_id = u.id
      WHERE u.role = 'farmer'`;
    const params = [];

    if (status === 'pending') {
      sql += ` AND (f.verification_status = 'pending' OR f.verification_status IS NULL)`;
    } else if (status) {
      sql += ` AND f.verification_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.created_at DESC`;

    const [farmers] = await db.execute(sql, params);

    const resolvedUploadRoot = path.resolve(uploadDirectory);

    // Senyas sa admin UI kung may aktuwal na file na mabubuksan. Ang mga legacy
    // account ay 'verified' pero walang farmer_id_path kaya walang maipapakitang dokumento.
    const data = farmers.map(farmer => {
      let has_document = false;

      if (typeof farmer.farmer_id_path === 'string' && farmer.farmer_id_path) {
        try {
          const resolvedPath = path.resolve(uploadDirectory, path.basename(farmer.farmer_id_path));
          has_document = resolvedPath.startsWith(resolvedUploadRoot) && fs.existsSync(resolvedPath);
        } catch (_) {
          has_document = false;
        }
      }

      const { farmer_id_path, ...rest } = farmer;
      return { ...rest, has_document };
    });

    return res.json({ success: true, total: data.length, data });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/farmers/:id/verify
const verifyFarmer = async (req, res, next) => {
  let connection;

  try {
    const farmerId = Number(req.params.id);
    const { status } = req.body;
    const rejectionReason = typeof req.body.rejection_reason === 'string' ? req.body.rejection_reason.trim() : '';

    if (!Number.isInteger(farmerId) || farmerId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid farmer ID.' });
    }
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be verified or rejected.' });
    }
    if (status === 'rejected' && rejectionReason.length < 5) {
      return res.status(400).json({ success: false, message: 'Please provide a rejection reason (at least 5 characters).' });
    }
    if (rejectionReason.length > 1000) {
      return res.status(400).json({ success: false, message: 'Rejection reason must not exceed 1000 characters.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [farmers] = await connection.execute(
      `SELECT id FROM users WHERE id = ? AND role = 'farmer' FOR UPDATE`,
      [farmerId]
    );
    if (farmers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Farmer account not found.' });
    }

    const [profiles] = await connection.execute('SELECT id, farmer_id_path FROM farmer_profiles WHERE user_id = ? FOR UPDATE', [farmerId]);
    if (profiles.length === 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'This farmer has no profile or Farmer ID on file.' });
    }
    if (status === 'verified' && !profiles[0].farmer_id_path) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Cannot approve: no Farmer ID was uploaded.' });
    }

    await connection.execute(
      `UPDATE users SET status = ? WHERE id = ? AND role = 'farmer'`,
      [status === 'verified' ? 'active' : 'rejected', farmerId]
    );
    await connection.execute(
      `UPDATE farmer_profiles
       SET verification_status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE user_id = ?`,
      [status, status === 'rejected' ? rejectionReason : null, req.user.id, farmerId]
    );

    await connection.commit();

    try {
      await notifyUser(
        farmerId,
        status === 'verified' ? 'Farmer account approved' : 'Farmer registration rejected',
        status === 'verified'
          ? 'Your Farmer ID was verified. You can now sign in and rent equipment.'
          : `Your farmer registration was rejected. Reason: ${rejectionReason}`,
        '/login'
      );
    } catch (notificationError) {
      console.error('Farmer decision notification failed:', notificationError.message);
    }

    return res.json({
      success: true,
      message: `Farmer ${status} successfully.`,
      data: { farmer_id: farmerId, verification_status: status }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

// GET /api/admin/farmers/:id/documents/farmer_id
const viewFarmerDocument = async (req, res, next) => {
  try {
    const farmerId = Number(req.params.id);
    if (!Number.isInteger(farmerId) || farmerId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid farmer ID.' });
    }

    const [rows] = await db.execute('SELECT farmer_id_path FROM farmer_profiles WHERE user_id = ? LIMIT 1', [farmerId]);
    const filename = rows[0]?.farmer_id_path;
    if (!filename || typeof filename !== 'string') {
      return res.status(404).json({ success: false, message: 'Farmer ID document not found.' });
    }

    const safeFileName = path.basename(filename);
    const resolvedPath = path.resolve(uploadDirectory, safeFileName);
    if (!resolvedPath.startsWith(path.resolve(uploadDirectory)) || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: 'Document file not found.' });
    }

    const mimeTypes = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
    res.setHeader('Content-Type', mimeTypes[path.extname(safeFileName).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);
    return res.sendFile(resolvedPath);
  } catch (error) {
    next(error);
  }
};

module.exports = { getFarmers, verifyFarmer, viewFarmerDocument };
