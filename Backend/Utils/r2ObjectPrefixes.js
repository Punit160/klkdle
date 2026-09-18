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
  // LIGHT_AMC: envKeyPrefix("R2_PREFIX_LIGHT_AMC", "lightamc"),
  // ATTENDANCE_PROOF: envKeyPrefix("R2_PREFIX_ATTENDANCE", "attendance"),
};

/** Local disk paths when R2 uploads are disabled (legacy). */
export const LOCAL_UPLOAD_PREFIX = {
  BIHAR_SSL_AMC_DOC: "bihar/ssl/amc/doc",
  BIHAR_SSL_AMC_INVOICE: "bihar/ssl/amc/invoice",
  UP_SSL_AMC_DOC: "up/ssl/amc/doc",
  UP_SSL_AMC_INVOICE: "up/ssl/amc/invoice",
};
