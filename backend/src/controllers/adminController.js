const db = require('../db');

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
       SET verification_status = ?
       WHERE user_id = ?`,
      [status, ownerId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: `Owner ${status} successfully.`,
      data: {
        owner_id: ownerId,
        account_status: accountStatus,
        verification_status: status
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

module.exports = {
  getOwners,
  verifyOwner,
  getDashboardSummary
};
