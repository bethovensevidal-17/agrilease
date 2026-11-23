-- Farmer verification (RSBSA / Farmer ID). Optional: the backend ensureSchema.js adds these automatically on start.
ALTER TABLE farmer_profiles
  ADD COLUMN farmer_id_number VARCHAR(30) NULL,
  ADD COLUMN farmer_id_path VARCHAR(255) NULL,
  ADD COLUMN verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'verified',
  ADD COLUMN rejection_reason TEXT NULL,
  ADD COLUMN reviewed_by INT NULL,
  ADD COLUMN reviewed_at DATETIME NULL,
  ADD UNIQUE KEY farmer_profiles_farmer_id_number_unique (farmer_id_number);
-- Existing farmers keep working: the DEFAULT 'verified' backfills them. New registrations are inserted as 'pending'.
