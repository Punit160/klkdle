-- Unique beneficiary mobile per ULA survey (same rule as ca_no).
CREATE UNIQUE INDEX `bihar_ula_site_survey_beneficiary_contact_key`
  ON `bihar_ula_site_survey` (`beneficiary_contact`);
