
const db = require('./src/db');
const bcrypt = require('bcryptjs');

async function resetAndVerify() {
  // Gumawa ng bagong password. Huwag gamitin ang dating naibahagi mo.
  const newPassword = 'counterclock123!';

  try {
    const [[database]] = await db.query(
      'SELECT DATABASE() AS db_name'
    );

    console.log('Database:', database.db_name);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [result] = await db.execute(
      `UPDATE users
       SET password = ?
       WHERE email = ? AND role = 'farmer'`,
      [hashedPassword, 'juanfarmer@gmail.com']
    );

    console.log('Updated rows:', result.affectedRows);

    const [users] = await db.execute(
      `SELECT id, email, password, role, status
       FROM users
       WHERE email = ?
       LIMIT 1`,
      ['juanfarmer@gmail.com']
    );

    if (users.length === 0) {
      console.log('Account not found.');
      return;
    }

    const match = await bcrypt.compare(
      newPassword,
      users[0].password
    );

    console.log('Account ID:', users[0].id);
    console.log('Role:', users[0].role);
    console.log('Status:', users[0].status);
    console.log('Password verification:', match);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.end();
  }
}

resetAndVerify();
