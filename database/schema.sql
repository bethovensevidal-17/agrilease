-- ============================================================================
-- LEGACY / STARTER SCHEMA — HUWAG I-IMPORT SA AGRILEASE V2.
-- Ibang disenyo ito (hal. equipment.name, rate, archived_at) kaysa sa ginagamit ng code ngayon
-- (equipment_name, rental_rate, is_archived, availability_status).
-- Ang tunay na database ng app ay `agrilease_v2_db`; ang structure nito ay nasa
-- database/agrilease_v2_db.structure.sql, at ang mga dagdag na migration ay nasa
-- database/migrations/ at backend/database/migrations/.
-- ============================================================================

-- AGRILEASE_V2 - MySQL 8 / MariaDB (Laragon). Run: mysql -u root < schema.sql
-- NOTE: written to match AGRILEASE.docx section 10, but not yet executed on a real MySQL server. Run it once and report any error.
CREATE DATABASE IF NOT EXISTS agrilease CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agrilease;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  phone VARCHAR(16) NOT NULL,
  role ENUM('farmer','owner','admin') NOT NULL,
  status ENUM('active','pending','rejected','deactivated') NOT NULL DEFAULT 'active',
  gcash_qr_path VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role_status (role, status),
  INDEX idx_users_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE farmer_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  address VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE provider_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  address VARCHAR(255) NOT NULL,
  gov_id_path VARCHAR(255) NOT NULL,
  business_permit_path VARCHAR(255) NOT NULL,
  trial_ends_at DATETIME NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE trial_phones (
  phone VARCHAR(16) PRIMARY KEY,
  used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE equipment_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE equipment (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  brand_model VARCHAR(120) NULL,
  description TEXT NULL,
  rate DECIMAL(10,2) NOT NULL,
  rate_type ENUM('hourly','daily','hectare') NOT NULL,
  late_fee_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  condition_status ENUM('excellent','good','fair') NOT NULL,
  location ENUM('Victoria, Oriental Mindoro','Socorro, Oriental Mindoro') NOT NULL,
  availability ENUM('available','unavailable') NOT NULL DEFAULT 'available',
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  image_path VARCHAR(255) NULL,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES equipment_categories(id),
  INDEX idx_eq_browse (approval_status, availability, archived_at),
  INDEX idx_eq_owner (owner_id)
) ENGINE=InnoDB;

CREATE TABLE rental_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT UNSIGNED NOT NULL,
  equipment_id INT UNSIGNED NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  hectares DECIMAL(10,2) NULL,
  base_amount DECIMAL(12,2) NOT NULL,
  late_hours INT UNSIGNED NOT NULL DEFAULT 0,
  late_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash','gcash') NOT NULL DEFAULT 'cash',
  gcash_ref CHAR(13) NULL,
  status ENUM('pending','approved','rejected','ongoing','completed','cancelled') NOT NULL DEFAULT 'pending',
  client_key VARCHAR(64) NULL UNIQUE,
  started_at DATETIME NULL,
  returned_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  INDEX idx_rental_conflict (equipment_id, status, start_at, end_at),
  INDEX idx_rental_farmer (farmer_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rental_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method ENUM('cash','gcash','bank') NOT NULL,
  recorded_by INT UNSIGNED NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rental_id) REFERENCES rental_requests(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_pay_rental (rental_id)
) ENGINE=InnoDB;

CREATE TABLE subscription_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(40) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_days INT UNSIGNED NOT NULL,
  equipment_limit INT UNSIGNED NULL
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id INT UNSIGNED NOT NULL,
  plan_id INT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  method ENUM('card','gcash') NOT NULL,
  card_last4 CHAR(4) NULL,
  gcash_ref CHAR(13) NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
  INDEX idx_sub_owner (owner_id, ends_at)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

CREATE TABLE push_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL UNIQUE,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_push_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  body VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  INDEX idx_msg_pair (sender_id, receiver_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE app_settings (
  setting_key VARCHAR(40) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT INTO subscription_plans (code,name,price,duration_days,equipment_limit) VALUES
 ('monthly','Monthly Plan',199,30,3),('quarterly','Quarterly Plan',549,90,5),
 ('semi','Semi-Annual Plan',999,180,10),('annual','Annual Plan',1799,365,NULL);
INSERT INTO equipment_categories (name) VALUES ('Tractor'),('Harvester'),('Tiller'),('Planter'),('Sprayer'),('Trailer'),('Water Pump');
INSERT INTO app_settings VALUES ('gcash_qr_path','/uploads/official-qr-placeholder.png');
