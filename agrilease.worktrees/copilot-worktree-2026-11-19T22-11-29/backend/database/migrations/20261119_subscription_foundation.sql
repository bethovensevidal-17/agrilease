-- AgriLease subscription plans seed. Backup first; safe to run repeatedly.
INSERT INTO subscription_plans (plan_name, price, duration_days, equipment_limit, description, is_active)
VALUES
 ('Free Trial', 0.00, 7, 2, 'One-time 7-day trial for verified equipment owners', 1),
 ('Monthly', 199.00, 30, 3, 'Monthly equipment owner subscription', 1),
 ('Quarterly', 549.00, 90, 5, 'Quarterly equipment owner subscription', 1),
 ('Semi-Annual', 999.00, 180, 10, 'Semi-annual equipment owner subscription', 1),
 ('Annual', 1799.00, 365, NULL, 'Annual equipment owner subscription with unlimited listings', 1)
ON DUPLICATE KEY UPDATE
 price = VALUES(price), duration_days = VALUES(duration_days),
 equipment_limit = VALUES(equipment_limit), description = VALUES(description), is_active = 1;

-- Ensure plan table has a stable primary/unique key as defined in the supplied schema.
