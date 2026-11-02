ALTER TABLE `bihar_ula_site_inspections`
  DROP INDEX `bihar_ula_site_inspections_ca_no_key`,
  ADD COLUMN `approval_status` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `approval_date` TIMESTAMP NULL,
  ADD COLUMN `approval_remarks` TEXT NULL,
  ADD COLUMN `approval_by` VARCHAR(255) NULL,
  ADD INDEX `bihar_ula_site_inspections_ca_no_inspection_date_idx` (`ca_no`, `inspection_date`);
