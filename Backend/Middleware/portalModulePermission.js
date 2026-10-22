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
  const compact = value.replace(/[\s_-]/g, "");
  if (compact.includes("powerpack")) return "powerpack";
  if (compact.includes("offgrid")) return "offgrid";
  if (compact.includes("ongrid")) return "ongrid";
  if (value === "kusumc" || value.includes("kusum")) return "kusumc";
  if (value === "up" || value.includes("uttar")) return "up";
  if (value === "bihar" || value === "br" || value.includes("bihar")) return "bihar";
  return null;
};

const resolveLightAmcRegion = async (req) => {
  const fromQueryRegion = normalizeRegion(req.query?.region);
  if (fromQueryRegion) return fromQueryRegion;

  const fromBodyRegion = normalizeRegion(req.body?.region);
  if (fromBodyRegion) return fromBodyRegion;

  if (normalizeRegion(req.lightAmcRegion)) return normalizeRegion(req.lightAmcRegion);

  const fromQuery = normalizeRegion(req.query?.state);
  if (fromQuery) return fromQuery;

  const fromBody = normalizeRegion(req.body?.state);
  if (fromBody) return fromBody;

  return null;
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
export const requireBiharUlaReport = () =>
  requirePortalPermission("portal.bihar.ula.dashboard");

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
