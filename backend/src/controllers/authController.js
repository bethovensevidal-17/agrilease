const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const { notifyAdmins } = require('../services/notifications');

// Remove uploaded files if registration fails or validation rejects them.
async function removeUploadedFiles(files) {
  if (!files) return;

  const uploadedFiles = Object.values(files).flat();

  await Promise.all(
    uploadedFiles.map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('File cleanup error:', error);
        }
      }
    })
  );
}

// REGISTER
async function register(req, res) {
  let connection;
  let transactionStarted = false;

  const {
    business_permit,
    government_id
  } = req.files || {};

  const permitFile = business_permit?.[0];
  const governmentIdFile = government_id?.[0];

  try {
    const {
      full_name,
      email,
      password,
      phone,
      role,
      address,
      barangay,
      business_name
    } = req.body || {};

    // Basic validation
    if (!full_name || !email || !password || !role) {
      await removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: 'Full name, email, password, at role ay required.'
      });
    }

    if (!['farmer', 'owner'].includes(role)) {
      await removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: 'Invalid registration role.'
      });
    }

    if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      await removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include letters, numbers, and at least one special character.'
      });
    }

    // Owner must submit both documents.
    if (role === 'owner' && (!permitFile || !governmentIdFile)) {
      await removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: 'Equipment Owners must upload a Business Permit and Government ID.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    connection = await db.getConnection();

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      await removeUploadedFiles(req.files);

      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await connection.beginTransaction();
    transactionStarted = true;

    // Farmer is active; owner waits for verification.
    const userStatus = role === 'farmer' ? 'active' : 'pending';

    const [userResult] = await connection.execute(
      `INSERT INTO users
       (full_name, email, password, phone, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        normalizedEmail,
        passwordHash,
        phone || null,
        role,
        userStatus
      ]
    );

    const userId = userResult.insertId;

    if (role === 'farmer') {
      await connection.execute(
        `INSERT INTO farmer_profiles
         (user_id, address, barangay)
         VALUES (?, ?, ?)`,
        [userId, address || null, barangay || null]
      );
    }

    if (role === 'owner') {
      await connection.execute(
        `INSERT INTO provider_profiles
         (
           user_id,
           business_name,
           address,
           verification_status,
           business_permit_path,
           government_id_path
         )
         VALUES (?, ?, ?, 'pending', ?, ?)`,
        [
          userId,
          null,
          null,
          permitFile.filename,
          governmentIdFile.filename
        ]
      );
    }

    try {
      await connection.execute(
        'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
        [userId, `${role} account registered`]
      );
    } catch (logError) {
      console.error('Activity log insert failed:', logError.message);
    }

    await connection.commit();
    transactionStarted = false;

    // Alert administrators when a new equipment owner submits an application.
    // Notification delivery must not roll back a successful registration.
    if (role === 'owner') {
      try {
        await notifyAdmins(
          'New owner registration',
          `${full_name.trim()} submitted a new equipment owner registration and is awaiting verification.`,
          '/admin/owners'
        );
      } catch (notificationError) {
        console.error('Admin owner-registration notification failed:', notificationError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: role === 'owner'
        ? 'Registration successful. Your account is awaiting verification.'
        : 'Farmer registration successful.',
      user: {
        id: userId,
        full_name: full_name.trim(),
        email: normalizedEmail,
        role,
        status: userStatus
      }
    });

  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }

    await removeUploadedFiles(req.files);

    console.error('Register error:', error);

    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    console.log('\n========== LOGIN DEBUG ==========');
    console.log('Email received:', email);
    console.log('Password received:', typeof password === 'string' && password.length > 0);

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      console.log('Result: Missing or invalid login fields.');

      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [[database]] = await db.query(
      'SELECT DATABASE() AS db_name'
    );

    console.log('Database:', database.db_name);
    console.log('Searching email:', normalizedEmail);

    const [userColumns] = await db.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const userColumnSet = new Set(userColumns.map(column => column.COLUMN_NAME));
    const suspensionField = ['suspension_reason', 'status_reason'].find(column => userColumnSet.has(column));
    const [users] = await db.execute(
      `SELECT id, full_name, email, password, phone, role, status, ${suspensionField ? `\`${suspensionField}\`` : 'NULL'} AS suspension_reason
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    console.log('Matching accounts:', users.length);

    if (users.length === 0) {
      console.log('Result: Account not found.');
      console.log('================================\n');

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    console.log('Account ID:', user.id);
    console.log('Role:', user.role);
    console.log('Status:', user.status);

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    console.log('Password match:', passwordMatch);

    if (!passwordMatch) {
      console.log('Result: Password does not match.');
      console.log('================================\n');

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status !== 'active') {
      console.log('Result: Account is not active.');
      console.log('================================\n');

      const messages = {
        pending: 'Your account is still pending approval.',
        suspended: 'Your account has been suspended. Please contact the administrator for the reason.',
        rejected: 'Your account registration was rejected.'
      };

      return res.status(403).json({
        success: false,
        message: user.status === 'suspended' && user.suspension_reason
          ? user.suspension_reason
          : (messages[user.status] || 'Your account is not active.')
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      }
    );

    try {
      await db.execute(
        'INSERT INTO activity_logs (user_id, action) VALUES (?, ?)',
        [user.id, `${user.role} logged in`]
      );
    } catch (logError) {
      console.error('Activity log insert failed:', logError.message);
    }

    console.log('Result: Login successful.');
    console.log('================================\n');

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
}

module.exports = {
  register,
  login
};