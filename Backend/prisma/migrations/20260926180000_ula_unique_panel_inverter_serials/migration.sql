-- Unique panel & inverter serial numbers (NULL allowed for unset rows).
CREATE UNIQUE INDEX `bihar_ula_site_survey_panel_one_no_key`
  ON `bihar_ula_site_survey` (`panel_one_no`);
CREATE UNIQUE INDEX `bihar_ula_site_survey_panel_two_no_key`
  ON `bihar_ula_site_survey` (`panel_two_no`);
CREATE UNIQUE INDEX `bihar_ula_site_survey_inverter_no_key`
  ON `bihar_ula_site_survey` (`inverter_no`);
