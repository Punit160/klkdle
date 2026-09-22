/**
 * Object key prefixes inside bucket `klkdle` (not permissions — just path organization).
 * Add a new row here when you add a module; optional env override: R2_PREFIX_<NAME>.
 * @see docs/object-storage.md
 */
const envKeyPrefix = (envName, defaultPrefix) => {
  const value = String(process.env[envName] || "").trim();
  if (!value) return defaultPrefix;
  return value.replace(/^\/+|\/+$/g, "").replace(/\.\./g, "");
};

/** Central map — extend for new modules (one prefix per upload type). */
export const R2_PREFIX = {
  BIHAR_SSL_AMC_DOC: envKeyPrefix("R2_PREFIX_BIHAR_AMC_DOC", "biharsslamcdoc"),
  BIHAR_SSL_AMC_INVOICE: envKeyPrefix(
    "R2_PREFIX_BIHAR_AMC_INVOICE",
    "biharsslamcinvoice"
  ),
  UP_SSL_AMC_DOC: envKeyPrefix("R2_PREFIX_UP_AMC_DOC", "upsslamcdoc"),
  UP_SSL_AMC_INVOICE: envKeyPrefix("R2_PREFIX_UP_AMC_INVOICE", "upsslamcinvoice"),
  /** Base prefix; each survey uses biharula/{ca_no}/panel_one_img.jpg (flat in CA folder) */
  BIHAR_ULA: envKeyPrefix("R2_PREFIX_BIHAR_ULA", "biharula"),
  LIGHT_AMC: envKeyPrefix("R2_PREFIX_LIGHT_AMC", "lightamc"),
  USER_PROFILE: envKeyPrefix("R2_PREFIX_USER_PROFILE", "userprofile"),
  USER_EDUCATIONAL: envKeyPrefix("R2_PREFIX_USER_EDUCATIONAL", "userdocuments"),
  USER_AADHAAR: envKeyPrefix("R2_PREFIX_USER_AADHAAR", "useraadhaar"),
  USER_PAN: envKeyPrefix("R2_PREFIX_USER_PAN", "userpan"),
  USER_DRIVING_LICENSE: envKeyPrefix("R2_PREFIX_USER_DRIVING", "userdriving"),
  USER_POLICE_VERIFICATION: envKeyPrefix("R2_PREFIX_USER_POLICE", "userpolice"),
  USER_CANCELLED_CHEQUE: envKeyPrefix("R2_PREFIX_USER_CHEQUE", "usercheque"),
  USER_RENT_AGREEMENT: envKeyPrefix("R2_PREFIX_USER_RENT", "userrent"),
};

/** Local disk paths when R2 uploads are disabled (legacy). */
export const LOCAL_UPLOAD_PREFIX = {
  BIHAR_SSL_AMC_DOC: "bihar/ssl/amc/doc",
  BIHAR_SSL_AMC_INVOICE: "bihar/ssl/amc/invoice",
  UP_SSL_AMC_DOC: "up/ssl/amc/doc",
  UP_SSL_AMC_INVOICE: "up/ssl/amc/invoice",
  LIGHT_AMC: "light-amc",
  USER_PROFILE: "user/profile",
  USER_EDUCATIONAL: "user/documents",
  USER_AADHAAR: "user/aadhaar",
  USER_PAN: "user/pan",
  USER_DRIVING_LICENSE: "user/driving-license",
  USER_POLICE_VERIFICATION: "user/police-verification",
  USER_CANCELLED_CHEQUE: "user/cancelled-cheque",
  USER_RENT_AGREEMENT: "user/rent-agreement",
};
