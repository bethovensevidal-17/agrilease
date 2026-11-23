const db = require('./db');

// Awtomatikong nagdadagdag ng mga kulang na column/table tuwing magsta-start ang backend.
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
  { table: 'notifications', column: 'is_archived', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
  // Payment Settings ng owner (ownerPaymentSettingsController)
  { table: 'provider_profiles', column: 'gcash_number', ddl: 'VARCHAR(30) NULL' },
  { table: 'provider_profiles', column: 'gcash_account_name', ddl: 'VARCHAR(150) NULL' },
  { table: 'provider_profiles', column: 'gcash_qr_path', ddl: 'VARCHAR(255) NULL' },
  { table: 'provider_profiles', column: 'bank_name', ddl: 'VARCHAR(100) NULL' },
  { table: 'provider_profiles', column: 'bank_account_name', ddl: 'VARCHAR(150) NULL' },
  { table: 'provider_profiles', column: 'bank_account_number', ddl: 'VARCHAR(50) NULL' },
  { table: 'provider_profiles', column: 'other_payment_instructions', ddl: 'TEXT NULL' },
  // Booking fields na ginagamit ng equipmentController at rentalController
  { table: 'equipment', column: 'quantity', ddl: 'INT NOT NULL DEFAULT 1' },
  { table: 'rental_requests', column: 'quantity', ddl: 'INT NOT NULL DEFAULT 1' },
  { table: 'rental_requests', column: 'farm_area', ddl: 'DECIMAL(10,2) NULL' },
  { table: 'rental_requests', column: 'rental_rate_snapshot', ddl: 'DECIMAL(10,2) NULL' },
  { table: 'rental_requests', column: 'rate_type_snapshot', ddl: "ENUM('hour','day','hectare') NULL" },
    { table: 'rental_requests', column: 'is_archived_by_farmer', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
  // Soft delete (archive) ng Homepage Content at Announcements
  { table: 'homepage_contents', column: 'is_archived', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'homepage_contents', column: 'archived_at', ddl: 'DATETIME NULL' },
  { table: 'announcements', column: 'is_archived', ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { table: 'announcements', column: 'archived_at', ddl: 'DATETIME NULL' },
  // Push notification: services/push.js ay nagsusulat sa endpoint_hash
  { table: 'push_subscriptions', column: 'endpoint_hash', ddl: 'CHAR(64) NULL' },
  // Subscription: paalala bago mag-expire, tala ng admin, at dahilan ng pag-reject ng bayad
  { table: 'subscriptions', column: 'reminder_7d_sent_at', ddl: 'DATETIME NULL' },
  { table: 'subscriptions', column: 'reminder_1d_sent_at', ddl: 'DATETIME NULL' },
  { table: 'subscriptions', column: 'admin_note', ddl: 'VARCHAR(255) NULL' },
  { table: 'subscription_payments', column: 'rejection_reason', ddl: 'VARCHAR(255) NULL' },
  // Equipment: dahilan ng pag-reject o pag-take down ng admin
  { table: 'equipment', column: 'rejection_reason', ddl: 'VARCHAR(255) NULL' },
];

// Mga index na kailangan ng code. May optional na `backfill` na tumatakbo bago gawin ang index.
const REQUIRED_INDEXES = [
  {
    table: 'farmer_profiles',
    name: 'farmer_profiles_farmer_id_number_unique',
    ddl: 'ADD UNIQUE KEY `farmer_profiles_farmer_id_number_unique` (`farmer_id_number`)',
  },
  {
    table: 'push_subscriptions',
    name: 'push_subscriptions_endpoint_hash_unique',
    ddl: 'ADD UNIQUE KEY `push_subscriptions_endpoint_hash_unique` (`endpoint_hash`)',
    backfill: 'UPDATE push_subscriptions SET endpoint_hash = SHA2(endpoint, 256) WHERE endpoint_hash IS NULL',
  },
];

const REQUIRED_TABLES = [
  {
    name: 'booking_payments',
    ddl: `CREATE TABLE IF NOT EXISTS booking_payments (
      id INT NOT NULL AUTO_INCREMENT,
      booking_id INT NOT NULL,
      payment_method VARCHAR(50) DEFAULT NULL,
      reference_number VARCHAR(100) DEFAULT NULL,
      proof_image VARCHAR(255) DEFAULT NULL,
      payment_status ENUM('pending','verified','rejected') DEFAULT 'pending',
      verified_by INT DEFAULT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_booking_payment (booking_id),
      KEY idx_booking_payment_status (payment_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
];

// plan_name ay may UNIQUE key kaya safe i-run ulit.
const PLAN_SEED = `INSERT INTO subscription_plans (plan_name, price, duration_days, equipment_limit, description, is_active)
VALUES
 ('Free Trial', 0.00, 7, 2, 'One-time 7-day trial for verified equipment owners', 1),
 ('Monthly', 199.00, 30, 3, 'Monthly equipment owner subscription', 1),
 ('Quarterly', 549.00, 90, 5, 'Quarterly equipment owner subscription', 1),
 ('Semi-Annual', 999.00, 180, 10, 'Semi-annual equipment owner subscription', 1),
 ('Annual', 1799.00, 365, NULL, 'Annual equipment owner subscription with unlimited listings', 1)
ON DUPLICATE KEY UPDATE
 price = VALUES(price), duration_days = VALUES(duration_days),
 equipment_limit = VALUES(equipment_limit), description = VALUES(description), is_active = 1`;

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
      console.error(`[ensureSchema] Could not add ${table}.${column}:`, error.message);
    }
  }

  for (const { table, name, ddl, backfill } of REQUIRED_INDEXES) {
    try {
      const [tables] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
        [table]
      );
      if (!tables.length) continue;
      if (backfill) await db.query(backfill);
      const [found] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1',
        [table, name]
      );
      if (found.length) continue;
      await db.query(`ALTER TABLE \`${table}\` ${ddl}`);
      console.log(`[ensureSchema] Added index ${table}.${name}`);
    } catch (error) {
      console.error(`[ensureSchema] Could not add index ${table}.${name}:`, error.message);
    }
  }

  for (const { name, ddl } of REQUIRED_TABLES) {
    try {
      const [found] = await db.execute(
        'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
        [name]
      );
      if (found.length) continue;
      await db.query(ddl);
      console.log(`[ensureSchema] Created table ${name}`);
    } catch (error) {
      console.error(`[ensureSchema] Could not create table ${name}:`, error.message);
    }
  }

  try {
    await db.query(PLAN_SEED);
  } catch (error) {
    console.error('[ensureSchema] Could not seed subscription plans:', error.message);
  }
}

module.exports = { ensureSchema };