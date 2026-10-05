-- Rejected surveys must not keep CA, contact, panel, or inverter numbers locked.
-- Application checks ignore approval_status = 2. These drops let a new row reuse those values.

ALTER TABLE `bihar_ula_site_survey` DROP INDEX `bihar_ula_site_survey_ca_no_key`;
ALTER TABLE `bihar_ula_site_survey` DROP INDEX `bihar_ula_site_survey_beneficiary_contact_key`;
ALTER TABLE `bihar_ula_site_survey` DROP INDEX `bihar_ula_site_survey_panel_one_no_key`;
ALTER TABLE `bihar_ula_site_survey` DROP INDEX `bihar_ula_site_survey_panel_two_no_key`;
ALTER TABLE `bihar_ula_site_survey` DROP INDEX `bihar_ula_site_survey_inverter_no_key`;

CREATE INDEX `bihar_ula_site_survey_ca_no_idx` ON `bihar_ula_site_survey` (`ca_no`);
CREATE INDEX `bihar_ula_site_survey_beneficiary_contact_idx` ON `bihar_ula_site_survey` (`beneficiary_contact`);
CREATE INDEX `bihar_ula_site_survey_panel_one_no_idx` ON `bihar_ula_site_survey` (`panel_one_no`);
CREATE INDEX `bihar_ula_site_survey_panel_two_no_idx` ON `bihar_ula_site_survey` (`panel_two_no`);
CREATE INDEX `bihar_ula_site_survey_inverter_no_idx` ON `bihar_ula_site_survey` (`inverter_no`);
