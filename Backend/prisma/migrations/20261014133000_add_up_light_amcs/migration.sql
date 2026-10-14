CREATE TABLE `up_light_amcs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `district` VARCHAR(255) NULL,
    `block` VARCHAR(255) NULL,
    `panchayat` VARCHAR(255) NULL,
    `ward_no` VARCHAR(50) NULL,
    `volume` VARCHAR(100) NULL,
    `ssl_id` VARCHAR(100) NOT NULL,
    `unique_id` VARCHAR(255) NULL,
    `pole_no` VARCHAR(255) NULL,
    `amc_date` DATE NOT NULL,
    `next_amc_date` DATE NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `quarter_no` INTEGER NOT NULL DEFAULT 1,
    `beneficiary_name` VARCHAR(255) NOT NULL,
    `beneficiary_contact` VARCHAR(20) NOT NULL,
    `light_working` VARCHAR(10) NOT NULL,
    `complaint_raised` TINYINT NOT NULL DEFAULT 0,
    `complaint_ref` VARCHAR(255) NULL,
    `image_1` VARCHAR(255) NULL,
    `image_2` VARCHAR(255) NULL,
    `latitude` VARCHAR(50) NULL,
    `longitude` VARCHAR(50) NULL,
    `remarks` TEXT NULL,
    `approval_status` TINYINT NOT NULL DEFAULT 0,
    `approval_date` TIMESTAMP(0) NULL,
    `approval_remarks` TEXT NULL,
    `approval_by` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `up_light_amcs_ssl_id_idx`(`ssl_id`),
    INDEX `up_light_amcs_company_id_idx`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `up_light_amcs` (
    `id`, `company_id`, `user_id`, `state`, `district`, `block`, `panchayat`,
    `ward_no`, `volume`, `ssl_id`, `unique_id`, `pole_no`, `amc_date`,
    `next_amc_date`, `period_start`, `period_end`, `quarter_no`,
    `beneficiary_name`, `beneficiary_contact`, `light_working`, `complaint_raised`,
    `complaint_ref`, `image_1`, `image_2`, `latitude`, `longitude`, `remarks`,
    `approval_status`, `approval_date`, `approval_remarks`, `approval_by`,
    `created_at`, `updated_at`
)
SELECT
    `id`, `company_id`, `user_id`, `state`, `district`, `block`, `panchayat`,
    `ward_no`, `volume`, `ssl_id`, `unique_id`, `pole_no`, `amc_date`,
    `next_amc_date`, `period_start`, `period_end`, `quarter_no`,
    `beneficiary_name`, `beneficiary_contact`, `light_working`, `complaint_raised`,
    `complaint_ref`, `image_1`, `image_2`, `latitude`, `longitude`, `remarks`,
    `approval_status`, `approval_date`, `approval_remarks`, `approval_by`,
    `created_at`, `updated_at`
FROM `bihar_light_amcs`
WHERE LOWER(TRIM(`state`)) IN ('uttar pradesh', 'up')
   OR LOWER(`state`) LIKE '%uttar%';

DELETE FROM `bihar_light_amcs`
WHERE LOWER(TRIM(`state`)) IN ('uttar pradesh', 'up')
   OR LOWER(`state`) LIKE '%uttar%';
