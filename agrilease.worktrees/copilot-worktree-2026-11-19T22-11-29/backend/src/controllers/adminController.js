const db = require('../db');
const fs = require('fs');
const path = require('path');
const { uploadDirectory } = require('../middleware/ownerDocuments');

// GET /api/admin/owners?status=pending
const getOwners = async (req, res, next) => {
  try {
    const { status } = req.query;

    const allowedStatuses = ['pending', 'verified', 'rejected'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status.'
      });
    }

    let sql = `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.status AS account_status,
        u.created_at,
        p.id AS profile_id,
        p.business_name,
        p.address,
        p.verification_status,
        p.rejection_reason,
        p.reviewed_at,
        p.trial_used
      FROM users u
      INNER JOIN provider_profiles p ON p.user_id = u.id
      WHERE u.role = 'owner'
    `;

    const params = [];

    if (status) {
      sql += ` AND p.verification_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY u.created_at DESC`;

    const [owners] = await db.execute(sql, params);

    return res.json({
      success: true,
      total: owners.length,
      data: owners
    });

  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/owners/:id/verify
const verifyOwner = async (req, res, next) => {
  let connection;

  try {
    const ownerId = Number(req.params.id);
    const { status } = req.body;
    const rejectionReason = typeof req.body.rejection_reason === 'string'
      ? req.body.rejection_reason.trim()
      : '';

    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid owner ID.'
      });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be verified or rejected.'
      });
    }

    if (status === 'rejected' && rejectionReason.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason (at least 5 characters).'
      });
    }

    if (rejectionReason.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must not exceed 1000 characters.'
      });
    }

    const accountStatus = status === 'verified' ? 'active' : 'rejected';

    connection = await db.getConnection();

    await connection.beginTransaction();

    const [owners] = await connection.execute(
      `SELECT id FROM users
       WHERE id = ? AND role = 'owner'
       FOR UPDATE`,
      [ownerId]
    );

    if (owners.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: 'Owner account not found.'
      });
    }

    const [profiles] = await connection.execute(
      `SELECT id FROM provider_profiles
       WHERE user_id = ?
       FOR UPDATE`,
      [ownerId]
    );

    if (profiles.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: 'Provider profile not found.'
      });
    }

    await connection.execute(
      `UPDATE users
       SET status = ?
       WHERE id = ? AND role = 'owner'`,
      [accountStatus, ownerId]
    );

    await connection.execute(
      `UPDATE provider_profiles
       SET verification_status = ?,
           rejection_reason = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE user_id = ?`,
      [status, status === 'rejected' ? rejectionReason : null, req.user.id, ownerId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: `Owner ${status} successfully.`,
      data: {
        owner_id: ownerId,
        account_status: accountStatus,
        verification_status: status,
        rejection_reason: status === 'rejected' ? rejectionReason : null
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    next(error);

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// GET /api/admin/owners/:id/documents/:type
const viewOwnerDocument = async (req, res, next) => {
  try {
    const ownerId = Number(req.params.id);
    const documentType = req.params.type;

    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid owner ID.'
      });
    }

    if (!['business_permit', 'government_id'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type.'
      });
    }

    const [rows] = await db.execute(
      `SELECT business_permit_path, government_id_path
       FROM provider_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [ownerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Owner profile not found.'
      });
    }

    const filename = rows[0][`${documentType}_path`];

    if (!filename || typeof filename !== 'string') {
      return res.status(404).json({
        success: false,
        message: 'Document not found.'
      });
    }

    const safeFileName = path.basename(filename);
    const resolvedPath = path.resolve(uploadDirectory, safeFileName);
    const allowedRoot = path.resolve(uploadDirectory);

    if (!resolvedPath.startsWith(allowedRoot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document path.'
      });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found.'
      });
    }

    const extension = path.extname(safeFileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    res.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeFileName}"`);

    return res.sendFile(resolvedPath);
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/dashboard
const getDashboardSummary = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,

        (SELECT COUNT(*) FROM users
         WHERE role = 'admin') AS total_admins,

        (SELECT COUNT(*) FROM users
         WHERE role = 'farmer') AS total_farmers,

        (SELECT COUNT(*) FROM users
         WHERE role = 'owner') AS total_owners,

        (SELECT COUNT(*) FROM users
         WHERE status = 'active') AS active_users,

        (SELECT COUNT(*) FROM provider_profiles
         WHERE verification_status = 'pending') AS pending_owners,

        (SELECT COUNT(*) FROM equipment
         WHERE is_archived = 0) AS total_equipment,

        (SELECT COUNT(*) FROM equipment
         WHERE approval_status = 'pending'
         AND is_archived = 0) AS pending_equipment,

        (SELECT COUNT(*) FROM equipment
         WHERE approval_status = 'approved'
         AND is_archived = 0) AS approved_equipment,

        (SELECT COUNT(*) FROM rental_requests)
          AS total_rentals,

        (SELECT COUNT(*) FROM rental_requests
         WHERE status = 'pending') AS pending_rentals,

        (SELECT COUNT(*) FROM rental_requests
         WHERE status = 'approved') AS approved_rentals,

        (SELECT COUNT(*) FROM rental_requests
         WHERE status = 'rejected') AS rejected_rentals,

        (SELECT COUNT(*) FROM rental_requests
         WHERE status = 'cancelled') AS cancelled_rentals,

        (SELECT COUNT(*) FROM rental_requests
         WHERE status = 'ongoing') AS ongoing_rentals,

        (SELECT COUNT(*) FROM rental_requests
         WHERE status = 'completed') AS completed_rentals,

        (SELECT COUNT(*) FROM subscriptions
         WHERE status = 'active') AS active_subscriptions,

        (SELECT COUNT(*) FROM subscriptions
         WHERE status = 'pending') AS pending_subscriptions,

        (SELECT COUNT(*) FROM subscription_payments
         WHERE payment_status = 'pending') AS pending_payments
    `);

    return res.json({
      success: true,
      message: 'Admin dashboard summary retrieved successfully.',
      data: rows[0]
    });

  } catch (error) {
    console.error('Admin dashboard summary error:', error);
    next(error);
  }
};

// GET /api/admin/analytics/monthly
const getMonthlyAnalytics = async (req, res, next) => {
  try {
    const [userRows] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month_key,
        COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(
        DATE_FORMAT(CURDATE(), '%Y-%m-01'),
        INTERVAL 5 MONTH
      )
      AND created_at < DATE_ADD(
        DATE_FORMAT(CURDATE(), '%Y-%m-01'),
        INTERVAL 1 MONTH
      )
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    `);

    const [rentalRows] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month_key,
        COUNT(*) AS total
      FROM rental_requests
      WHERE created_at >= DATE_SUB(
        DATE_FORMAT(CURDATE(), '%Y-%m-01'),
        INTERVAL 5 MONTH
      )
      AND created_at < DATE_ADD(
        DATE_FORMAT(CURDATE(), '%Y-%m-01'),
        INTERVAL 1 MONTH
      )
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    `);

    const [equipmentRows] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month_key,
        COUNT(*) AS total
      FROM equipment
      WHERE created_at >= DATE_SUB(
        DATE_FORMAT(CURDATE(), '%Y-%m-01'),
        INTERVAL 5 MONTH
      )
      AND created_at < DATE_ADD(
        DATE_FORMAT(CURDATE(), '%Y-%m-01'),
        INTERVAL 1 MONTH
      )
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    `);

    const usersMap = {};
    const equipmentMap = {};
    const rentalsMap = {};

    userRows.forEach(row => {
      usersMap[row.month_key] = Number(row.total);
    });

    equipmentRows.forEach(row => {
      equipmentMap[row.month_key] = Number(row.total);
    });

    rentalRows.forEach(row => {
      rentalsMap[row.month_key] = Number(row.total);
    });

    const now = new Date();
    const data = [];

    // Generate the last 6 months, including months with zero records.
    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const monthKey =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}`;

      data.push({
        month: date.toLocaleString('en-US', {
          month: 'short'
        }),
        users: usersMap[monthKey] || 0,
        equipment: equipmentMap[monthKey] || 0,
        rentals: rentalsMap[monthKey] || 0
      });
    }

    return res.json({
      success: true,
      message: 'Monthly analytics retrieved successfully.',
      data
    });

  } catch (error) {
    console.error('Monthly analytics error:', error);
    next(error);
  }
};

// GET /api/admin/users?search=&role=&status=
const getUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;

    const allowedRoles = ['admin', 'farmer', 'owner'];
    const allowedStatuses = [
      'pending',
      'active',
      'suspended',
      'rejected'
    ];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role.'
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account status.'
      });
    }

    let sql = `
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status,
        created_at
      FROM users
      WHERE 1 = 1
    `;

    const params = [];

    if (search) {
      sql += ` AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      sql += ` AND role = ?`;
      params.push(role);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC`;

    const [users] = await db.execute(sql, params);
    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active') AS active,
        SUM(status = 'pending') AS pending,
        SUM(status = 'suspended') AS suspended,
        SUM(role = 'farmer') AS farmers,
        SUM(role = 'owner') AS owners
      FROM users
      WHERE role <> 'admin'
    `);

    const summary = Object.fromEntries(
      Object.entries(summaryRows[0] || {}).map(([key, value]) => [key, Number(value || 0)])
    );

    return res.json({
      success: true,
      total: users.length,
      summary,
      data: users
    });

  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/status
const updateUserStatus = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      });
    }

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be active or suspended.'
      });
    }

    // Prevent an administrator from changing their own account status.
    if (userId === Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own account status.'
      });
    }

    const [result] = await db.execute(
      `UPDATE users
       SET status = ?
       WHERE id = ? AND role != 'admin'`,
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or cannot be modified.'
      });
    }

    return res.json({
      success: true,
      message: `User ${status} successfully.`
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOwners,
  verifyOwner,
  viewOwnerDocument,
  getDashboardSummary,
  getMonthlyAnalytics,
  getUsers,
  updateUserStatus
};
