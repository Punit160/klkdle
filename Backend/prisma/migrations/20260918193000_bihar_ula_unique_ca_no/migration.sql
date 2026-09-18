-- CA number must be unique across all ULA surveys
CREATE UNIQUE INDEX `bihar_ula_site_survey_ca_no_key` ON `bihar_ula_site_survey`(`ca_no`);
