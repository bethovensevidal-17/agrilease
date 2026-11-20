const db = require('./db');

// Awtomatikong nagdadagdag ng mga kulang na column tuwing magsta-start ang backend.
// Safe ito i-run ulit-ulit: ang mayroon na ay hindi ginagalaw.
const REQUIRED_COLUMNS = [
  { table: 'provider_profiles', column: 'rejection_reason', ddl: 'TEXT NULL' },
  { table: 'provider_profiles', column: 'reviewed_by', ddl: 'INT NULL' },
  { table: 'provider_profiles', column: 'reviewed_at', ddl: 'DATETIME NULL' },
  { table: 'provider_profiles', column: 'trial_used', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'users', column: 'suspension_reason', ddl: 'TEXT NULL' },
  { table: 'notifications', column: 'action_url', ddl: 'VARCHAR(500) NULL' },
];

async function ensureSchema() {
  for (const { table, column, ddl } of REQUIRED_COLUMNS) {
    try {
      const [tables] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
        [table]
      );
      if (!tables.length) continue;
      const [found] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
        [table, column]
      );
      if (found.length) continue;
      await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
      console.log(`[ensureSchema] Added ${table}.${column}`);
    } catch (error) {
      console.error(`[ensureSchema] Hindi nadagdag ang ${table}.${column}:`, error.message);
    }
  }
}

module.exports = { ensureSchema };
