CREATE TABLE IF NOT EXISTS `bihar_ula_site_payments` (
  `survey_id` BIGINT UNSIGNED NOT NULL,
  `central_received` TINYINT NOT NULL DEFAULT 0,
  `state_received` TINYINT NOT NULL DEFAULT 0,
  `updated_by` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`survey_id`)
);

CREATE TABLE IF NOT EXISTS `bihar_ula_site_expenses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `survey_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `remarks` TEXT NOT NULL,
  `created_by` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bihar_ula_site_expenses_survey_idx` (`survey_id`)
);
