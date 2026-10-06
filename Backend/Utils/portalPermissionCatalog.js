/**

 * DLE app portal roles: View + Add per module.

 * Approve / external integration uses Portal API credentials (key + secret), not these keys.

 */

export const PORTAL_PERMISSION_CATALOG = [

  {

    key: "portal.rbac.manage",

    label: "Manage roles & access",

    module: "admin",

    description: "Create roles and assign users (this DLE portal).",

  },

  {

    key: "portal.api.credentials.manage",

    label: "Manage external API credentials",

    module: "admin",

    description: "Create API key and password for the other portal to access Node APIs.",

  },

  {

    key: "portal.bihar.ssl_amc.read",

    label: "Bihar SSL AMC — view",

    module: "bihar_amc",

    description: "View Bihar SSL AMC data in this app.",

  },

  {

    key: "portal.bihar.ssl_amc.dashboard",

    label: "Bihar SSL AMC — dashboard",

    module: "bihar_amc",

    description: "View Bihar SSL AMC dashboard (granted automatically with view access).",

  },

  {

    key: "portal.bihar.ssl_amc.add",

    label: "Bihar SSL AMC — add",

    module: "bihar_amc",

    description: "Add / upload Bihar SSL AMC data in this app.",

  },

  {

    key: "portal.up.ssl_amc.read",

    label: "UP SSL AMC — view",

    module: "up_amc",

    description: "View UP SSL AMC data in this app.",

  },

  {

    key: "portal.up.ssl_amc.dashboard",

    label: "UP SSL AMC — dashboard",

    module: "up_amc",

    description: "View UP SSL AMC dashboard (granted automatically with view access).",

  },

  {

    key: "portal.up.ssl_amc.add",

    label: "UP SSL AMC — add",

    module: "up_amc",

    description: "Add / upload UP SSL AMC data in this app.",

  },

  {

    key: "portal.bihar.light_amc.read",

    label: "Bihar field AMC — view",

    module: "bihar_light_amc",

    description: "View Bihar field AMC in this app.",

  },

  {

    key: "portal.bihar.light_amc.add",

    label: "Bihar field AMC — add",

    module: "bihar_light_amc",

    description: "Submit Bihar field AMC in this app.",

  },

  {

    key: "portal.up.light_amc.read",

    label: "UP field AMC — view",

    module: "up_light_amc",

    description: "View UP field AMC in this app.",

  },

  {

    key: "portal.up.light_amc.add",

    label: "UP field AMC — add",

    module: "up_light_amc",

    description: "Submit UP field AMC in this app.",

  },

  {

    key: "portal.bihar.ula.dashboard",

    label: "Bihar ULA — dashboard",

    module: "bihar_ula",

    description: "Open the Bihar ULA dashboard and reports.",

  },

  {

    key: "portal.bihar.ula.add",

    label: "Bihar ULA — add",

    module: "bihar_ula",

    description: "Submit Bihar ULA surveys in this app.",

  },

  {

    key: "portal.bihar.ula.read",

    label: "Bihar ULA — view",

    module: "bihar_ula",

    description: "View Bihar ULA surveys in this app.",

  },

];



/** Default scopes for new external portal API credentials. */

export const PORTAL_API_DEFAULT_SCOPES = ["all"];



export const PORTAL_SUPER_PERMISSION = "portal.rbac.manage";



export const PORTAL_API_CREDENTIALS_PERMISSION = "portal.api.credentials.manage";

/** Cannot be granted via portal roles, bootstrap, or user assignment in the app. */
export const PORTAL_SOFTWARE_RESTRICTED_PERMISSIONS = [
  PORTAL_SUPER_PERMISSION,
  PORTAL_API_CREDENTIALS_PERMISSION,
];

export const isPortalSoftwareRestrictedPermission = (key) =>
  PORTAL_SOFTWARE_RESTRICTED_PERMISSIONS.includes(String(key));

export const filterAssignablePortalPermissionKeys = (keys) =>
  (keys || []).filter((k) => !isPortalSoftwareRestrictedPermission(k));

export const roleHasSoftwareRestrictedPermissions = (permissionKeys) =>
  (permissionKeys || []).some(isPortalSoftwareRestrictedPermission);

export const assertPortalPermissionKeysAssignableViaSoftware = (keys) => {
  const blocked = (keys || []).filter(isPortalSoftwareRestrictedPermission);
  if (blocked.length) {
    const error = new Error(
      `Portal admin permissions (${blocked.join(", ")}) cannot be granted through the app. DLE admin uses users.role=1 in the database only.`
    );
    error.statusCode = 422;
    throw error;
  }
};



const SSL_AMC_READ_DASHBOARD_PAIRS = [
  ["portal.bihar.ssl_amc.read", "portal.bihar.ssl_amc.dashboard"],
  ["portal.up.ssl_amc.read", "portal.up.ssl_amc.dashboard"],
];

/** Grant module dashboard keys when SSL AMC view is selected; remove dashboard when view is off. */
export const syncSslAmcDashboardPermissionKeys = (keys) => {
  const set = new Set(keys || []);
  for (const [readKey, dashKey] of SSL_AMC_READ_DASHBOARD_PAIRS) {
    if (set.has(readKey)) set.add(dashKey);
    else set.delete(dashKey);
  }
  return [...set];
};

/** Region module read permission (JWT users on hybrid routes — rarely used on public router). */

export const sslAmcReadPermission = (region) =>

  region === "up" ? "portal.up.ssl_amc.read" : "portal.bihar.ssl_amc.read";

export const sslAmcDashboardPermission = (region) =>
  region === "up"
    ? "portal.up.ssl_amc.dashboard"
    : "portal.bihar.ssl_amc.dashboard";



export const lightAmcReadPermission = (region) =>

  region === "up" ? "portal.up.light_amc.read" : "portal.bihar.light_amc.read";

export const lightAmcAddPermission = (region) =>
  region === "up" ? "portal.up.light_amc.add" : "portal.bihar.light_amc.add";


