ALTER TABLE `up_light_amcs`
  ADD COLUMN `uid` VARCHAR(100) NULL AFTER `volume`,
  ADD COLUMN `fy_year` VARCHAR(255) NULL AFTER `pole_no`;
