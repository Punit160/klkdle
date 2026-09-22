/** External portal: scope reads/writes by company_id (no JWT). */
export const resolveCompanyId = (req) =>
  String(req.query?.company_id ?? req.body?.company_id ?? "").trim();

export const resolvePortalCompanyId = (req) => {
  const fromAuth = req.portalCompanyId ? String(req.portalCompanyId).trim() : "";
  if (fromAuth) return fromAuth;
  return resolveCompanyId(req);
};

export const hasBearerAuth = (req) => {
  const authHeader = req.headers.authorization;
  return Boolean(authHeader && authHeader.startsWith("Bearer "));
};

export const readPortalApiCredentialsFromRequest = (req) => {
  const apiKey =
    req.headers["x-portal-api-key"] ||
    req.query.portal_api_key ||
    req.body?.portal_api_key;
  const apiSecret =
    req.headers["x-portal-api-secret"] ||
    req.query.portal_api_secret ||
    req.body?.portal_api_secret;
  return {
    apiKey: apiKey ? String(apiKey).trim() : "",
    apiSecret: apiSecret ? String(apiSecret).trim() : "",
  };
};

export const hasPortalApiCredentialsInRequest = (req) => {
  const { apiKey, apiSecret } = readPortalApiCredentialsFromRequest(req);
  return Boolean(apiKey && apiSecret);
};

export const attachPortalCompanyFromQuery = (req, res, next) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(422).json({
      success: false,
      message: "company_id is required.",
    });
  }
  req.portalCompanyId = companyId;
  return next();
};

/** Portal read on same path as DLE app: skip when Bearer token (DLE JWT routes). */
export const attachPortalCompanyOrSkipRouter = (req, res, next) => {
  if (hasBearerAuth(req)) return next("router");
  if (hasPortalApiCredentialsInRequest(req)) return next();

  const companyId = resolveCompanyId(req);
  if (!companyId) return next("router");

  if (process.env.PORTAL_LEGACY_COMPANY_ID === "true") {
    req.portalCompanyId = companyId;
    return next();
  }

  return next("router");
};
