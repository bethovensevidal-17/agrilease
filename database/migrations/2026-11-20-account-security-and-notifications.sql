-- Run once against the active AgriLease MySQL database.
-- Add optional fields without replacing existing account or notification data.
SET @db = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='provider_profiles' AND COLUMN_NAME='rejection_reason')=0,
 'ALTER TABLE provider_profiles ADD COLUMN rejection_reason TEXT NULL', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='suspension_reason')=0,
 'ALTER TABLE users ADD COLUMN suspension_reason TEXT NULL', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='notifications' AND COLUMN_NAME='action_url')=0,
 'ALTER TABLE notifications ADD COLUMN action_url VARCHAR(500) NULL', 'SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
