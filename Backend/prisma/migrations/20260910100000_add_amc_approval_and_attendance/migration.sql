-- User approval fields
ALTER TABLE `users`
  ADD COLUMN `approval_status` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `approval_remarks` TEXT NULL;

-- AMC document approval fields (Bihar)
ALTER TABLE `bihar_ssl_amc_upload_documents`
  ADD COLUMN `approval_status` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `approval_date` TIMESTAMP NULL,
  ADD COLUMN `approval_remarks` TEXT NULL,
  ADD COLUMN `approval_by` VARCHAR(255) NULL;

-- AMC document approval fields (UP)
ALTER TABLE `up_ssl_amc_upload_documents`
  ADD COLUMN `approval_status` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `approval_date` TIMESTAMP NULL,
  ADD COLUMN `approval_remarks` TEXT NULL,
  ADD COLUMN `approval_by` VARCHAR(255) NULL;

-- Attendance records
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `company_id` VARCHAR(100) NULL,
  `attendance_date` DATE NOT NULL,
  `punch_in_at` DATETIME NOT NULL,
  `punch_in_latitude` VARCHAR(50) NULL,
  `punch_in_longitude` VARCHAR(50) NULL,
  `punch_out_at` DATETIME NULL,
  `punch_out_latitude` VARCHAR(50) NULL,
  `punch_out_longitude` VARCHAR(50) NULL,
  `punch_out_auto` TINYINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `attendance_records_user_id_attendance_date_key` (`user_id`, `attendance_date`),
  INDEX `attendance_records_user_id_idx` (`user_id`),
  INDEX `attendance_records_attendance_date_idx` (`attendance_date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
