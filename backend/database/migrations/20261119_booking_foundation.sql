-- AgriLease V2 additive booking foundation migration
-- Backup agrilease_v2_db before applying. This migration preserves existing records/tables.

ALTER TABLE equipment
  ADD COLUMN available_quantity INT UNSIGNED NOT NULL DEFAULT 1 AFTER rental_rate;

ALTER TABLE rental_requests
  ADD COLUMN rental_quantity INT UNSIGNED NOT NULL DEFAULT 1 AFTER equipment_id,
  ADD COLUMN farm_area DECIMAL(10,2) DEFAULT NULL AFTER rental_quantity,
  ADD COLUMN rate_snapshot DECIMAL(10,2) DEFAULT NULL AFTER total_amount,
  ADD COLUMN rate_type_snapshot ENUM('hour','day','hectare') DEFAULT NULL AFTER rate_snapshot,
  ADD COLUMN client_key VARCHAR(100) DEFAULT NULL AFTER rate_type_snapshot,
  ADD UNIQUE KEY uq_rental_client_key_farmer (farmer_id, client_key),
  ADD KEY idx_rental_equipment_dates_status (equipment_id, start_date, end_date, status);

CREATE TABLE booking_payments (
  id INT NOT NULL AUTO_INCREMENT,
  booking_id INT NOT NULL,
  payment_method ENUM('cash','gcash','bank_transfer','other') NOT NULL,
  payment_reference VARCHAR(100) DEFAULT NULL,
  payment_proof VARCHAR(255) DEFAULT NULL,
  payment_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  verified_by INT DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_payment (booking_id),
  KEY idx_booking_payment_status (payment_status),
  CONSTRAINT booking_payments_booking_fk FOREIGN KEY (booking_id) REFERENCES rental_requests(id) ON DELETE CASCADE,
  CONSTRAINT booking_payments_verifier_fk FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
