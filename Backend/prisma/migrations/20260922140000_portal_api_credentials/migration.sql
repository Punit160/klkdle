CREATE TABLE `portal_api_credentials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` VARCHAR(100) NOT NULL,
  `label` VARCHAR(255) NULL,
  `api_key` VARCHAR(64) NOT NULL,
  `secret_hash` VARCHAR(255) NOT NULL,
  `scopes` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `portal_api_credentials_api_key_key` (`api_key`),
  INDEX `portal_api_credentials_company_id_idx` (`company_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
