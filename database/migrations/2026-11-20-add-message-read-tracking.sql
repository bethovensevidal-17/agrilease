-- Idempotent unread-message tracking migration. Supports both project schemas:
-- legacy: messages.message + messages.sent_at; newer: messages.body + messages.created_at.
SET @has_read_at = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'read_at'
);
SET @time_column = (
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'sent_at') THEN 'sent_at'
    WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'created_at') THEN 'created_at'
    ELSE NULL END
);
SET @add_read_at_sql = IF(@has_read_at = 0 AND @time_column IS NOT NULL,
  CONCAT('ALTER TABLE messages ADD COLUMN read_at TIMESTAMP NULL DEFAULT NULL AFTER `', @time_column, '`'),
  'SELECT 1');
PREPARE add_read_at_stmt FROM @add_read_at_sql;
EXECUTE add_read_at_stmt;
DEALLOCATE PREPARE add_read_at_stmt;

SET @has_unread_index = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_unread_receiver'
);
SET @add_unread_index_sql = IF(@has_unread_index = 0 AND EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'read_at'
), 'CREATE INDEX idx_messages_unread_receiver ON messages (receiver_id, read_at)', 'SELECT 1');
PREPARE add_unread_index_stmt FROM @add_unread_index_sql;
EXECUTE add_unread_index_stmt;
DEALLOCATE PREPARE add_unread_index_stmt;
