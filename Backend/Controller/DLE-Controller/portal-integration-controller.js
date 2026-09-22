import {
  filterRoutesForCredential,
  PORTAL_API_ROUTE_CATALOG,
  PORTAL_API_SCOPES,
  PORTAL_API_SCOPE_ALL,
} from "../../Utils/portalApiCatalog.js";
import { getPublicBaseUrl } from "../../Utils/publicUrl.js";

export const PORTAL_API_SCOPE_DESCRIPTIONS = {
  [PORTAL_API_SCOPE_ALL]: "Full access — every endpoint in the catalog (read + approve).",
  read: "GET only — lists, views, downloads, pending approval queues.",
  approve: "POST — approve or reject uploads (use together with read).",
  write: "Reserved for future create/update APIs.",
};

export const buildPortalApiAuthManual = (baseUrl = "") => {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const samplePath = "/api/portal/integration/me";

  return {
    headers: {
      "X-Portal-Api-Key": "Your API key (shown in the credentials table)",
      "X-Portal-Api-Secret": "Secret password you set when creating the credential",
    },
    alternate: {
      query: "portal_api_key & portal_api_secret (not recommended for production)",
      body: "Same keys in JSON body for POST requests if headers are inconvenient",
    },
    company_id:
      "Optional on each request when using API key — company comes from the credential record.",
    scopes: PORTAL_API_SCOPES,
    scope_descriptions: PORTAL_API_SCOPE_DESCRIPTIONS,
    discover: {
      method: "GET",
      path: samplePath,
      description: "Returns company_id, scopes, and the endpoint list allowed for this key.",
    },
    examples: {
      discover_curl: base
        ? `curl -sS -X GET "${base}${samplePath}" \\
  -H "X-Portal-Api-Key: YOUR_API_KEY" \\
  -H "X-Portal-Api-Secret: YOUR_SECRET"`
        : null,
      read_curl: base
        ? `curl -sS -X GET "${base}/api/bihar/amc/approval/pending" \\
  -H "X-Portal-Api-Key: YOUR_API_KEY" \\
  -H "X-Portal-Api-Secret: YOUR_SECRET"`
        : null,
      approve_curl: base
        ? `curl -sS -X POST "${base}/api/bihar/amc/approval/status" \\
  -H "Content-Type: application/json" \\
  -H "X-Portal-Api-Key: YOUR_API_KEY" \\
  -H "X-Portal-Api-Secret: YOUR_SECRET" \\
  -d '{"upload_id":"123","approval_status":1,"approval_remarks":"OK"}'`
        : null,
    },
  };
};



/** Called after portalExternalAuth — returns what this key can use. */

export const getPortalIntegrationProfileController = (req, res) => {
  const scopes = req.portalApiScopes || [];
  const endpoints = filterRoutesForCredential(scopes);
  const baseUrl = getPublicBaseUrl(req);

  return res.json({
    success: true,
    data: {
      company_id: req.portalCompanyId,
      credential_id: req.portalApiCredentialId ?? null,
      auth_mode: req.portalAuthMode,
      scopes,
      endpoints,
      base_url: baseUrl || null,
      auth: buildPortalApiAuthManual(baseUrl),
      note: "company_id query is optional when using API key — company comes from the credential.",
    },
  });
};



/** For logged-in DLE admins — full catalog + integration manual (no secret required). */
export const getPortalIntegrationCatalogController = (req, res) => {
  const baseUrl = getPublicBaseUrl(req);

  return res.json({
    success: true,
    data: {
      base_url: baseUrl || null,
      auth: buildPortalApiAuthManual(baseUrl),
      endpoints: PORTAL_API_ROUTE_CATALOG,
    },
  });
};


