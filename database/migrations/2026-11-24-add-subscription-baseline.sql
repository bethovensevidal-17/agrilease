-- Fresh equipment quota per plan.
-- Existing subscriptions keep baseline 0 (current behavior) until a new plan is activated.
ALTER TABLE subscriptions
  ADD COLUMN baseline_count INT NOT NULL DEFAULT 0;
