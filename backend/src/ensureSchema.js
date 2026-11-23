const db = require('./db');

// Awtomatikong nagdadagdag ng mga kulang na column tuwing magsta-start ang backend.
// Safe ito i-run ulit-ulit: ang mayroon na ay hindi ginagalaw.
const REQUIRED_COLUMNS = [
  { table: 'provider_profiles', column: 'rejection_reason', ddl: 'TEXT NULL' },
  { table: 'provider_profiles', column: 'reviewed_by', ddl: 'INT NULL' },
  { table: 'provider_profiles', column: 'reviewed_at', ddl: 'DATETIME NULL' },
  { table: 'provider_profiles', column: 'trial_used', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'users', column: 'suspension_reason', ddl: 'TEXT NULL' },
  // Farmer verification (RSBSA / Farmer ID). Existing farmers are backfilled as 'verified' by the column default.
  { table: 'farmer_profiles', column: 'farmer_id_number', ddl: 'VARCHAR(30) NULL' },
  { table: 'farmer_profiles', column: 'farmer_id_path', ddl: 'VARCHAR(255) NULL' },
  { table: 'farmer_profiles', column: 'verification_status', ddl: "ENUM('pending','verified','rejected') NOT NULL DEFAULT 'verified'" },
  { table: 'farmer_profiles', column: 'rejection_reason', ddl: 'TEXT NULL' },
  { table: 'farmer_profiles', column: 'reviewed_by', ddl: 'INT NULL' },
  { table: 'farmer_profiles', column: 'reviewed_at', ddl: 'DATETIME NULL' },
  { table: 'notifications', column: 'action_url', ddl: 'VARCHAR(500) NULL' },
];

// Mga index na kailangan ng code. Pinipigilan nito na magamit ang parehong Farmer ID number sa dalawang account.
const REQUIRED_INDEXES = [
  {
    table: 'farmer_profiles',
    name: 'farmer_profiles_farmer_id_number_unique',
    ddl: 'ADD UNIQUE KEY `farmer_profiles_farmer_id_number_unique` (`farmer_id_number`)',
  },
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

  for (const { table, name, ddl } of REQUIRED_INDEXES) {
    try {
      const [tables] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
        [table]
      );
      if (!tables.length) continue;
      const [found] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
        [table, name]
      );
      if (found.length) continue;
      await db.query(`ALTER TABLE \`${table}\` ${ddl}`);
      console.log(`[ensureSchema] Added index ${table}.${name}`);
    } catch (error) {
      console.error(`[ensureSchema] Hindi nadagdag ang index ${table}.${name}:`, error.message);
    }
  }
}

module.exports = { ensureSchema };