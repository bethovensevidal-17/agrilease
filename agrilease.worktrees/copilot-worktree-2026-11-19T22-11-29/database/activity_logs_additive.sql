-- Safe additive setup only. Creates the activity log table if it does not exist.
-- Does not delete, reset, or alter existing AGRILEASE data.
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_created_at (created_at),
  INDEX idx_activity_user_id (user_id)
) ENGINE=InnoDB;
