-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `district` VARCHAR(255) NULL,
    `block` VARCHAR(255) NULL,
    `panchayat` VARCHAR(255) NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP(0) NULL,
    `password` VARCHAR(255) NULL,
    `contact_no` VARCHAR(20) NULL,
    `emergency_contact_no` VARCHAR(20) NULL,
    `police_verification_validity` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `educational_document` VARCHAR(255) NULL,
    `aadhaar_voter_id` VARCHAR(255) NULL,
    `pan_card` VARCHAR(255) NULL,
    `driving_license` VARCHAR(255) NULL,
    `police_verification` VARCHAR(255) NULL,
    `cancelled_cheque` VARCHAR(255) NULL,
    `rent_agreement_electricity_bill` VARCHAR(255) NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `admin_remark` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bihar_ssl_amc_documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `block` VARCHAR(100) NULL,
    `panchayat` VARCHAR(100) NULL,
    `created_by` VARCHAR(100) NULL,
    `updated_by` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bihar_ssl_amc_upload_documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` VARCHAR(50) NOT NULL,
    `bihar_ssl_amc_id` BIGINT UNSIGNED NOT NULL,
    `ssl_id` TEXT NULL,
    `pole_no` TEXT NULL,
    `start_month_year` VARCHAR(7) NOT NULL,
    `end_month_year` VARCHAR(7) NULL,
    `remarks` VARCHAR(255) NULL,
    `amc_document` VARCHAR(255) NULL,
    `amc_doc_status` TINYINT NOT NULL DEFAULT 0,
    `invoice_document` VARCHAR(255) NULL,
    `invoice_status` TINYINT NOT NULL DEFAULT 0,
    `validation_status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bihar_ssl_amc_upload_documents` ADD CONSTRAINT `bihar_ssl_amc_upload_documents_bihar_ssl_amc_id_fkey` FOREIGN KEY (`bihar_ssl_amc_id`) REFERENCES `bihar_ssl_amc_documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
