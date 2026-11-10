
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
async function register(req, res) {
  const connection = await db.getConnection();

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
    } = req.body;

    // Basic validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, password, at role ay required.'
      });
    }

    if (!['farmer', 'owner'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration role.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await connection.beginTransaction();

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
         (user_id, business_name, address, verification_status)
         VALUES (?, ?, ?, 'pending')`,
        [
          userId,
          business_name || null,
          address || null
        ]
      );
    }

    await connection.commit();

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
    await connection.rollback();
    console.error('Register error:', error);

    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });

  } finally {
    connection.release();
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

    // Check which database the backend is using.
    const [[database]] = await db.query(
      'SELECT DATABASE() AS db_name'
    );

    console.log('Database:', database.db_name);
    console.log('Searching email:', normalizedEmail);

    const [users] = await db.execute(
      `SELECT id, full_name, email, password, phone, role, status
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
        suspended: 'Your account has been suspended.',
        rejected: 'Your account registration was rejected.'
      };

      return res.status(403).json({
        success: false,
        message: messages[user.status] || 'Your account is not active.'
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