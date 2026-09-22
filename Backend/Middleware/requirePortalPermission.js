import { findUserById } from "../Model/DLE-Model/dle-user-model.js";
import {
  getUserPermissionKeys,
  userHasPortalPermission,
} from "../Model/DLE-Model/portal-rbac-model.js";
import { isUserMasterAdmin } from "../Utils/userRoles.js";
import { resolveJwtUserId } from "../Utils/requestUser.js";

const loadPermissionKeysForRequest = async (req) =>
  req.portalPermissionKeys ??
  (await getUserPermissionKeys(
    resolveJwtUserId(req),
    req.portalPermissionCompanyId || req.query?.company_id || req.body?.company_id
  ));

const denyPortalPermission = (res, permissionKey) =>
  res.status(403).json({
    success: false,
    message: "You do not have permission for this portal action.",
    required_permission: permissionKey,
  });

/** Load portal permission keys onto req when JWT is present. */
export const loadPortalPermissions = async (req, _res, next) => {
  try {
    const userId = resolveJwtUserId(req);
    if (!userId) {
      req.portalPermissionKeys = [];
      return next();
    }

    let companyId =
      req.query?.company_id ||
      req.body?.company_id ||
      req.user?.company_id ||
      req.user?.companyId;

    if (!companyId) {
      const user = await findUserById(userId);
      companyId = user?.company_id;
    }

    req.portalPermissionKeys = await getUserPermissionKeys(userId, companyId);
    req.portalPermissionCompanyId = companyId
      ? String(companyId).trim()
      : null;
    return next();
  } catch (error) {
    console.error("LOAD PORTAL PERMISSIONS ERROR:", error);
    req.portalPermissionKeys = [];
    return next();
  }
};

/**
 * If request has JWT, require portal permission.
 * Without JWT, allow legacy company_id-only portal calls.
 */
export const requirePortalPermission =
  (permissionKey) => async (req, res, next) => {
    const userId = resolveJwtUserId(req);
    if (!userId) return next();

    const user = await findUserById(userId);
    if (isUserMasterAdmin(user)) return next();

    const keys = await loadPermissionKeysForRequest(req);

    if (!userHasPortalPermission(keys, permissionKey)) {
      return denyPortalPermission(res, permissionKey);
    }

    return next();
  };

/** JWT user must hold at least one of the given portal permissions (DLE admin bypass). */
export const requireAnyPortalPermission =
  (permissionKeys = []) => async (req, res, next) => {
    const userId = resolveJwtUserId(req);
    if (!userId) return next();

    const user = await findUserById(userId);
    if (isUserMasterAdmin(user)) return next();

    const keys = await loadPermissionKeysForRequest(req);
    const required = (permissionKeys || []).filter(Boolean);
    if (!required.length) return next();

    const allowed = required.some((key) => userHasPortalPermission(keys, key));
    if (!allowed) {
      return denyPortalPermission(res, required.join(" | "));
    }

    return next();
  };
