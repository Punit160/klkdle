ALTER TABLE `bihar_light_amcs`
  ADD COLUMN `approval_status` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `approval_date` TIMESTAMP NULL,
  ADD COLUMN `approval_remarks` TEXT NULL,
  ADD COLUMN `approval_by` VARCHAR(255) NULL;
