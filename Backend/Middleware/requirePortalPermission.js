import { findUserById } from "../Model/DLE-Model/dle-user-model.js";
import {
  getUserPermissionKeys,
  userHasPortalPermission,
} from "../Model/DLE-Model/portal-rbac-model.js";
import { resolveJwtUserId } from "../Utils/requestUser.js";

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

    const keys =
      req.portalPermissionKeys ??
      (await getUserPermissionKeys(
        userId,
        req.portalPermissionCompanyId || req.query?.company_id
      ));

    if (!userHasPortalPermission(keys, permissionKey)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this portal action.",
        required_permission: permissionKey,
      });
    }

    return next();
  };
