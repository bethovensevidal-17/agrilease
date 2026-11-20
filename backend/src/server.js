const app = require('./app');
const db = require('./db');
<<<<<<< HEAD
=======
const { ensureSchema } = require('./ensureSchema');
>>>>>>> master

const port = process.env.PORT || 3000;

(async () => {
  try {
    await db.query('SELECT 1');
    console.log('MySQL connected.');
<<<<<<< HEAD
=======
    await ensureSchema();
>>>>>>> master
  } catch (err) {
    console.error('Hindi makakonekta sa MySQL. I-check ang .env at kung naka-Start All ang Laragon.', err.message);
  }
  app.listen(port, () => console.log(`AGRILEASE API running at http://localhost:${port}`));
})();
