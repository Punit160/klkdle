-- One active CA, phone, panel serial, or inverter serial.
-- Rejected surveys are removed from this table so those values can be used again.
-- A panel number used as Panel 1 cannot also be used as Panel 2.

CREATE TABLE IF NOT EXISTS `bihar_ula_active_value` (
  `value_key` VARCHAR(320) NOT NULL,
  `survey_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`value_key`),
  KEY `bihar_ula_active_value_survey_idx` (`survey_id`)
);
