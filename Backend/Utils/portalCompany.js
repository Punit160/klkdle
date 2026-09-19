/** External portal: scope reads/writes by company_id (no JWT). */
export const resolveCompanyId = (req) =>
  String(req.query?.company_id ?? req.body?.company_id ?? "").trim();

const hasBearerAuth = (req) => {
  const authHeader = req.headers.authorization;
  return Boolean(authHeader && authHeader.startsWith("Bearer "));
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

/** Portal read on same path as DLE app: skip when no company_id or Bearer token (DLE app). */
export const attachPortalCompanyOrSkipRouter = (req, res, next) => {
  const companyId = resolveCompanyId(req);
  if (!companyId) return next("router");
  if (hasBearerAuth(req)) return next("router");
  req.portalCompanyId = companyId;
  return next();
};
