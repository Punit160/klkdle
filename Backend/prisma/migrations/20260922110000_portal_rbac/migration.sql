CREATE TABLE `portal_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `portal_permissions_key_key` (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `portal_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `portal_roles_company_id_name_key` (`company_id`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `portal_role_permissions` (
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `portal_role_permissions_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `portal_roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `portal_role_permissions_permission_id_fkey`
    FOREIGN KEY (`permission_id`) REFERENCES `portal_permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_portal_roles` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `company_id` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `user_portal_roles_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `portal_roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
