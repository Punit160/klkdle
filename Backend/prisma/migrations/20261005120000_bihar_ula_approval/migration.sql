ALTER TABLE `bihar_ula_site_survey`
  ADD COLUMN `approval_status` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `approval_date` TIMESTAMP(0) NULL,
  ADD COLUMN `approval_remarks` TEXT NULL,
  ADD COLUMN `approval_by` VARCHAR(255) NULL;
