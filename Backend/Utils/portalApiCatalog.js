/** External portal APIs (API key + secret). Scopes: read | approve | write | all */

export const PORTAL_API_SCOPE_ALL = "all";

export const PORTAL_API_SCOPES = ["read", "approve", "write", PORTAL_API_SCOPE_ALL];

export const PORTAL_API_ROUTE_CATALOG = [
  {
    module: "bihar_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/get",
    description: "List Bihar SSL AMC documents",
  },
  {
    module: "bihar_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/view",
    description: "View Bihar SSL AMC documents",
  },
  {
    module: "bihar_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/ssl-amc/get",
    description: "List Bihar SSL AMC (alias path)",
  },
  {
    module: "bihar_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/ssl-amc/view",
    description: "View Bihar SSL AMC (alias path)",
  },
  {
    module: "bihar_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/approval/list",
    description: "Bihar SSL AMC approval list",
  },
  {
    module: "bihar_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/approval/pending",
    description: "Bihar SSL AMC pending approvals",
  },
  {
    module: "bihar_ssl_amc",
    scope: "approve",
    method: "POST",
    path: "/api/bihar/amc/approval/status",
    description: "Approve/reject Bihar SSL AMC upload",
  },
  {
    module: "up_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/get",
    description: "List UP SSL AMC documents",
  },
  {
    module: "up_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/view",
    description: "View UP SSL AMC documents",
  },
  {
    module: "up_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/ssl-amc/get",
    description: "List UP SSL AMC (alias path)",
  },
  {
    module: "up_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/ssl-amc/view",
    description: "View UP SSL AMC (alias path)",
  },
  {
    module: "up_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/approval/list",
    description: "UP SSL AMC approval list",
  },
  {
    module: "up_ssl_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/approval/pending",
    description: "UP SSL AMC pending approvals",
  },
  {
    module: "up_ssl_amc",
    scope: "approve",
    method: "POST",
    path: "/api/up/amc/approval/status",
    description: "Approve/reject UP SSL AMC upload",
  },
  {
    module: "bihar_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/light/list",
    description: "Bihar field AMC list",
  },
  {
    module: "bihar_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/light/get",
    description: "Bihar field AMC get",
  },
  {
    module: "bihar_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/light/view/:id",
    description: "Bihar field AMC detail",
  },
  {
    module: "bihar_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/light/approval/list",
    description: "Bihar field AMC approval list",
  },
  {
    module: "bihar_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/bihar/amc/light/approval/pending",
    description: "Bihar field AMC pending",
  },
  {
    module: "bihar_light_amc",
    scope: "approve",
    method: "POST",
    path: "/api/bihar/amc/light/approval/status",
    description: "Approve/reject Bihar field AMC",
  },
  {
    module: "up_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/light/list",
    description: "UP field AMC list",
  },
  {
    module: "up_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/light/get",
    description: "UP field AMC get",
  },
  {
    module: "up_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/light/view/:id",
    description: "UP field AMC detail",
  },
  {
    module: "up_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/light/approval/list",
    description: "UP field AMC approval list",
  },
  {
    module: "up_light_amc",
    scope: "read",
    method: "GET",
    path: "/api/up/amc/light/approval/pending",
    description: "UP field AMC pending",
  },
  {
    module: "up_light_amc",
    scope: "approve",
    method: "POST",
    path: "/api/up/amc/light/approval/status",
    description: "Approve/reject UP field AMC",
  },
  {
    module: "light_amc",
    scope: "read",
    method: "GET",
    path: "/api/light-amc/get",
    description: "Field AMC list (pass ?region=bihar|up)",
  },
  {
    module: "light_amc",
    scope: "read",
    method: "GET",
    path: "/api/light-amc/list",
    description: "Field AMC list alias",
  },
  {
    module: "light_amc",
    scope: "read",
    method: "GET",
    path: "/api/light-amc/view/:id",
    description: "Field AMC detail",
  },
  {
    module: "light_amc",
    scope: "read",
    method: "GET",
    path: "/api/light-amc/approval/list",
    description: "Field AMC approval list (?region=)",
  },
  {
    module: "light_amc",
    scope: "read",
    method: "GET",
    path: "/api/light-amc/approval/pending",
    description: "Field AMC pending (?region=)",
  },
  {
    module: "light_amc",
    scope: "approve",
    method: "POST",
    path: "/api/light-amc/approval/status",
    description: "Approve field AMC (?region= in body/query)",
  },
  {
    module: "bihar_ula",
    scope: "read",
    method: "GET",
    path: "/api/bihar/ula/list",
    description: "Bihar ULA survey list",
  },
  {
    module: "bihar_ula",
    scope: "read",
    method: "GET",
    path: "/api/bihar/ula/:id",
    description: "Bihar ULA survey detail",
  },
  {
    module: "bihar_ula",
    scope: "read",
    method: "GET",
    path: "/api/bihar/ula/:id/download-images",
    description: "Download ULA images zip",
  },
  {
    module: "integration",
    scope: "read",
    method: "GET",
    path: "/api/portal/integration/me",
    description: "Who am I — company_id, scopes, allowed endpoints",
  },
];

export const credentialAllowsScope = (scopes, requiredScope) => {
  const set = new Set(Array.isArray(scopes) ? scopes : []);
  if (set.has(PORTAL_API_SCOPE_ALL)) return true;
  if (!requiredScope) return true;
  return set.has(requiredScope);
};

export const filterRoutesForCredential = (scopes) =>
  PORTAL_API_ROUTE_CATALOG.filter((route) => credentialAllowsScope(scopes, route.scope));
