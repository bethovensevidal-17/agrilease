const db = require('./src/db');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const email = 'adminagrilease@gmail.com';
  const newPassword = 'AgrileaseAdmin123!';

  try {
    const [[database]] = await db.query('SELECT DATABASE() AS db_name');
    console.log('Database:', database.db_name);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.execute(
      `UPDATE users
       SET password = ?
       WHERE email = ? AND role = 'admin'`,
      [hashedPassword, email]
    );

    console.log('Updated rows:', result.affectedRows);

    const [users] = await db.execute(
      `SELECT id, full_name, email, role, status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      console.log('Admin account not found.');
      return;
    }

    const match = await bcrypt.compare(newPassword, users[0].password);

    console.log('Account ID:', users[0].id);
    console.log('Full name:', users[0].full_name);
    console.log('Role:', users[0].role);
    console.log('Status:', users[0].status);
    console.log('Password verification:', match);
    console.log('Use this admin login:');
    console.log('Email:', email);
    console.log('Password:', newPassword);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

resetAdminPassword();
