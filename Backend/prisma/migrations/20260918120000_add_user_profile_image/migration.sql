-- MariaDB / MySQL: skip if column already exists (manual runs safe)
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `profile_image` VARCHAR(255) NULL
  AFTER `rent_agreement_electricity_bill`;
