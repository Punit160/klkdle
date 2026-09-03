/*
  Warnings:

  - You are about to drop the column `pole_no` on the `up_ssl_amc_upload_documents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `up_ssl_amc_upload_documents` DROP COLUMN `pole_no`,
    ADD COLUMN `unique_id` TEXT NULL;
