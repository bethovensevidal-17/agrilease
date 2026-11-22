const db = require('../db');

async function getFarmerProfile(req, res, next) {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.created_at,
              fp.address, fp.barangay
       FROM users u LEFT JOIN farmer_profiles fp ON fp.user_id = u.id
       WHERE u.id = ? AND u.role = 'farmer' LIMIT 1`, [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Farmer profile not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
}

async function updateFarmerProfile(req, res, next) {
  const fullName = typeof req.body.full_name === 'string' ? req.body.full_name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';
  const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
  const barangay = typeof req.body.barangay === 'string' ? req.body.barangay.trim() : '';
  if (fullName.length < 2 || fullName.length > 120) return res.status(400).json({ success: false, message: 'Full name must be 2 to 120 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  if (phone.length > 30 || address.length > 1000 || barangay.length > 100) return res.status(400).json({ success: false, message: 'One or more profile fields are too long.' });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [dupes] = await connection.execute('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, req.user.id]);
    if (dupes.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'Email is already used by another account.' }); }
    const [update] = await connection.execute("UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ? AND role = 'farmer'", [fullName, email, phone || null, req.user.id]);
    if (!update.affectedRows) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Farmer profile not found.' }); }
    const [profileRows] = await connection.execute('SELECT id FROM farmer_profiles WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (profileRows.length) {
      await connection.execute('UPDATE farmer_profiles SET address = ?, barangay = ? WHERE user_id = ?', [address || null, barangay || null, req.user.id]);
    } else {
      await connection.execute('INSERT INTO farmer_profiles (user_id, address, barangay) VALUES (?, ?, ?)', [req.user.id, address || null, barangay || null]);
    }
    await connection.commit();
    const [rows] = await connection.execute(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.created_at, fp.address, fp.barangay
       FROM users u LEFT JOIN farmer_profiles fp ON fp.user_id = u.id WHERE u.id = ? LIMIT 1`, [req.user.id]
    );
    return res.json({ success: true, message: 'Profile updated successfully.', data: rows[0] });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    next(error);
  } finally { if (connection) connection.release(); }
}

const OWNER_SELECT = `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.created_at,
              pp.business_name, pp.address, pp.verification_status
       FROM users u LEFT JOIN provider_profiles pp ON pp.user_id = u.id
       WHERE u.id = ? AND u.role = 'owner' LIMIT 1`;

async function getOwnerProfile(req, res, next) {
  try {
    const [rows] = await db.execute(OWNER_SELECT, [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Owner profile not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
}

async function updateOwnerProfile(req, res, next) {
  const text = value => (typeof value === 'string' ? value.trim() : '');
  const fullName = text(req.body.full_name);
  const email = text(req.body.email).toLowerCase();
  const phone = text(req.body.phone);
  const businessName = text(req.body.business_name);
  const address = text(req.body.address);
  if (fullName.length < 2 || fullName.length > 120) return res.status(400).json({ success: false, message: 'Full name must be 2 to 120 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  if (phone.length > 30 || businessName.length > 150 || address.length > 1000) return res.status(400).json({ success: false, message: 'One or more profile fields are too long.' });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [dupes] = await connection.execute('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, req.user.id]);
    if (dupes.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'Email is already used by another account.' }); }
    const [update] = await connection.execute("UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ? AND role = 'owner'", [fullName, email, phone || null, req.user.id]);
    if (!update.affectedRows) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Owner profile not found.' }); }
    const [profileRows] = await connection.execute('SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1', [req.user.id]);
    if (profileRows.length) {
      await connection.execute('UPDATE provider_profiles SET business_name = ?, address = ? WHERE user_id = ?', [businessName || null, address || null, req.user.id]);
    } else {
      await connection.execute("INSERT INTO provider_profiles (user_id, business_name, address, verification_status) VALUES (?, ?, ?, 'pending')", [req.user.id, businessName || null, address || null]);
    }
    await connection.commit();
    const [rows] = await connection.execute(OWNER_SELECT, [req.user.id]);
    return res.json({ success: true, message: 'Profile updated successfully.', data: rows[0] });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    next(error);
  } finally { if (connection) connection.release(); }
}

module.exports = { getFarmerProfile, updateFarmerProfile, getOwnerProfile, updateOwnerProfile };
