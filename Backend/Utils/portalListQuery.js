import { resolveJwtUserId } from "./requestUser.js";

/** API key / legacy company_id integration — not DLE JWT in the same request. */
export const isExternalPortalApiRequest = (req) => {
  const mode = String(req.portalAuthMode || "").trim();
  if (mode === "api_key" || mode === "legacy_company_id") return true;
  const portalCompanyId = req.portalCompanyId
    ? String(req.portalCompanyId).trim()
    : "";
  const jwtUserId = resolveJwtUserId(req);
  return Boolean(portalCompanyId && !jwtUserId && mode !== "jwt");
};

/**
 * Pagination for list APIs. External portal integrations receive all matching rows
 * unless they explicitly pass page/limit.
 */
export const resolveListPagination = (
  req,
  { defaultLimit = 50, maxLimit = 100 } = {}
) => {
  const external = isExternalPortalApiRequest(req);
  const rawLimit = req.query.limit;
  const wantsAll =
    rawLimit == null ||
    rawLimit === "" ||
    String(rawLimit).toLowerCase() === "all" ||
    String(rawLimit) === "0";

  if (external && wantsAll) {
    return { usePagination: false, page: 1, limit: null, skip: 0, take: undefined };
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const parsedLimit = Number(rawLimit);
  const limit = external
    ? Math.max(1, parsedLimit || defaultLimit)
    : Math.min(maxLimit, Math.max(1, parsedLimit || defaultLimit));

  return {
    usePagination: true,
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

export const applyListPaginationToFindMany = (findManyArgs, pagination) => {
  if (!pagination?.usePagination) return findManyArgs;
  return {
    ...findManyArgs,
    skip: pagination.skip,
    take: pagination.take,
  };
};

export const buildListResponseMeta = (req, pagination, total, extra = {}) => {
  if (!pagination.usePagination) {
    return {
      ...extra,
      page: 1,
      limit: total,
      total,
      total_pages: 1,
    };
  }
  return {
    ...extra,
    page: pagination.page,
    limit: pagination.limit,
    total,
    total_pages: Math.ceil(total / pagination.limit) || 0,
  };
};
