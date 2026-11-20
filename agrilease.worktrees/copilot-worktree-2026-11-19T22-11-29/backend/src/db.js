require('dotenv').config();
const mysql = require('mysql2/promise');

// Isang connection pool para sa buong app. Laging gumamit ng ? placeholders (parameterized SQL).
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agrilease_v2_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

module.exports = pool;
