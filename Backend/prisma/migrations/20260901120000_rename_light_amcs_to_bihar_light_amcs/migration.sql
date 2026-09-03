-- RenameTable
RENAME TABLE `light_amcs` TO `bihar_light_amcs`;

ALTER TABLE `bihar_light_amcs`
  DROP INDEX `light_amcs_ssl_id_idx`,
  ADD INDEX `bihar_light_amcs_ssl_id_idx`(`ssl_id`);

ALTER TABLE `bihar_light_amcs`
  DROP INDEX `light_amcs_company_id_idx`,
  ADD INDEX `bihar_light_amcs_company_id_idx`(`company_id`);
