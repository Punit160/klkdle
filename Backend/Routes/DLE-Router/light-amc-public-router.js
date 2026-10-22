import express from "express";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";
import {
  portalExternalAuth,
  requireExternalApproveApi,
  requirePortalApiScope,
} from "../../Middleware/portalExternalAuth.js";
import {
  getLightAmcById,
  getLightAmcs,
} from "../../Controller/DLE-Controller/light-amc-controller.js";
import {
  getLightAmcsForApproval,
  updateLightAmcApprovalStatus,
} from "../../Controller/DLE-Controller/light-amc-approval-controller.js";
import { lightAmcRegionOf } from "../../Model/DLE-Model/light-amc-model.js";

const readStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("read"),
];

const mountLightAmcApprovalRoutes = (router, pathPrefix = "", before = []) => {
  const lead = Array.isArray(before) ? before : [before];
  router.post(
    `${pathPrefix}approval/status`,
    ...lead,
    portalExternalAuth,
    requireExternalApproveApi,
    updateLightAmcApprovalStatus
  );
  router.get(
    `${pathPrefix}approval/list`,
    ...lead,
    portalExternalAuth,
    requirePortalApiScope("read"),
    getLightAmcsForApproval
  );
  router.get(`${pathPrefix}approval/pending`, ...lead, portalExternalAuth, requirePortalApiScope("read"), (req, res, next) => {
    if (req.query.approval_status == null || req.query.approval_status === "") {
      req.query.approval_status = String(0);
    }
    return getLightAmcsForApproval(req, res, next);
  });
};

const lightAmcReadRouter = express.Router();

lightAmcReadRouter.get("/get", ...readStack, getLightAmcs);
lightAmcReadRouter.get("/list", ...readStack, getLightAmcs);
lightAmcReadRouter.get("/view/:id", ...readStack, getLightAmcById);
mountLightAmcApprovalRoutes(lightAmcReadRouter, "");

/** Mounted at /api/light-amc (portal; pass ?region=bihar|up). */
export default lightAmcReadRouter;

/** Bihar / UP SSL AMC base — /api/{region}/amc/light/* and /kusumc/* */
export const createRegionalLightAmcPortalRouter = (region, segment = "light") => {
  const router = express.Router();
  const resolved = lightAmcRegionOf(region) || "bihar";
  const setRegion = (req, _res, next) => {
    req.lightAmcRegion = resolved;
    next();
  };

  router.get(`/${segment}/list`, ...readStack, setRegion, getLightAmcs);
  router.get(`/${segment}/get`, ...readStack, setRegion, getLightAmcs);
  router.get(`/${segment}/view/:id`, ...readStack, setRegion, getLightAmcById);

  mountLightAmcApprovalRoutes(router, `${segment}/`, setRegion);

  return router;
};

