-- Prevents offline-queued equipment, booking, and chat requests from being saved twice
-- when the browser retries a request whose response was lost.
-- The API also creates this table automatically on first use; running this file is optional.
CREATE TABLE IF NOT EXISTS offline_sync_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  idem_key VARCHAR(100) NOT NULL,
  request_path VARCHAR(255) NOT NULL,
  state ENUM('processing','done') NOT NULL DEFAULT 'processing',
  status_code SMALLINT NULL,
  response_body MEDIUMTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY offline_sync_user_key (user_id, idem_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
