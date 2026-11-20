-- Run once against agrilease_v2_db after backing up the database.
-- Adds audit/rejection fields used by the Admin Owner Verification screen.
ALTER TABLE provider_profiles
  ADD COLUMN rejection_reason TEXT NULL,
  ADD COLUMN reviewed_by INT NULL,
  ADD COLUMN reviewed_at DATETIME NULL;

CREATE INDEX idx_provider_profiles_verification_status
  ON provider_profiles (verification_status);
