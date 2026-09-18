-- AlterTable
ALTER TABLE `bihar_ula_site_survey`
    ADD COLUMN `second_visit_at` TIMESTAMP(0) NULL AFTER `user_id2`;

-- Backfill 2nd visits saved before this column existed
UPDATE `bihar_ula_site_survey`
SET `second_visit_at` = COALESCE(`updated_at`, `created_at`, CURRENT_TIMESTAMP(0))
WHERE `system_img2` IS NOT NULL
  AND `system_img2` != ''
  AND `solar_meter_img2` IS NOT NULL
  AND `solar_meter_img2` != ''
  AND `second_visit_at` IS NULL;
