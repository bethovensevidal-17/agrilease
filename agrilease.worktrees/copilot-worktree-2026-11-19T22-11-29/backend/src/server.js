const app = require('./app');
const db = require('./db');

const port = process.env.PORT || 3000;

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('MySQL connected.');
  } catch (err) {
    console.error('Hindi makakonekta sa MySQL. I-check ang .env at kung naka-Start All ang Laragon.', err.message);
  }
  app.listen(port, () => console.log(`AGRILEASE API running at http://localhost:${port}`));
})();
