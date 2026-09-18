-- MySQL-compatible (no ADD COLUMN IF NOT EXISTS — MariaDB-only syntax)
ALTER TABLE `users`
  ADD COLUMN `profile_image` VARCHAR(255) NULL
  AFTER `rent_agreement_electricity_bill`;
