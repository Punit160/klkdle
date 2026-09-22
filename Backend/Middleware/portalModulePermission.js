import { findUserById } from "../Model/DLE-Model/dle-user-model.js";
import { resolveJwtUserId } from "../Utils/requestUser.js";
import {
  lightAmcAddPermission,
  lightAmcReadPermission,
  sslAmcDashboardPermission,
  sslAmcReadPermission,
} from "../Utils/portalPermissionCatalog.js";
import { requireAnyPortalPermission, requirePortalPermission } from "./requirePortalPermission.js";

const normalizeRegion = (raw) => {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "up" || value.includes("uttar")) return "up";
  if (value === "bihar" || value === "br" || value.includes("bihar")) return "bihar";
  return null;
};

const resolveLightAmcRegion = async (req) => {
  const fromQuery = normalizeRegion(req.query?.state);
  if (fromQuery) return fromQuery;

  const fromBody = normalizeRegion(req.body?.state);
  if (fromBody) return fromBody;

  if (req.lightAmcRegion === "up" || req.lightAmcRegion === "bihar") {
    return req.lightAmcRegion;
  }

  const userId = resolveJwtUserId(req);
  if (!userId) return null;
  const user = await findUserById(userId);
  return normalizeRegion(user?.state);
};

export const requireSslAmcRead = (region) =>
  requireAnyPortalPermission([
    sslAmcReadPermission(region),
    sslAmcDashboardPermission(region),
  ]);

export const requireSslAmcAdd = (region) =>
  requirePortalPermission(
    region === "up" ? "portal.up.ssl_amc.add" : "portal.bihar.ssl_amc.add"
  );

export const requireBiharUlaRead = () => requirePortalPermission("portal.bihar.ula.read");
export const requireBiharUlaAdd = () => requirePortalPermission("portal.bihar.ula.add");

export const requireLightAmcRead = async (req, res, next) => {
  const region = await resolveLightAmcRegion(req);
  if (!region) {
    return res.status(422).json({
      success: false,
      message: "state is required to verify light AMC permission.",
    });
  }
  return requirePortalPermission(lightAmcReadPermission(region))(req, res, next);
};

export const requireLightAmcAdd = async (req, res, next) => {
  const region = await resolveLightAmcRegion(req);
  if (!region) {
    return res.status(422).json({
      success: false,
      message: "state is required to verify light AMC permission.",
    });
  }
  return requirePortalPermission(lightAmcAddPermission(region))(req, res, next);
};
