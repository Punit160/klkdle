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

const readStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("read"),
];

const mountLightAmcApprovalRoutes = (router, pathPrefix = "") => {
  router.post(
    `${pathPrefix}approval/status`,
    portalExternalAuth,
    requireExternalApproveApi,
    updateLightAmcApprovalStatus
  );
  router.get(
    `${pathPrefix}approval/list`,
    portalExternalAuth,
    requirePortalApiScope("read"),
    getLightAmcsForApproval
  );
  router.get(`${pathPrefix}approval/pending`, portalExternalAuth, requirePortalApiScope("read"), (req, res, next) => {
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

/** Bihar / UP SSL AMC base — /api/{region}/amc/light/* */
export const createRegionalLightAmcPortalRouter = (region) => {
  const router = express.Router();
  const setRegion = (req, _res, next) => {
    req.lightAmcRegion = region === "up" ? "up" : "bihar";
    next();
  };

  router.get("/light/list", ...readStack, setRegion, getLightAmcs);
  router.get("/light/get", ...readStack, setRegion, getLightAmcs);
  router.get("/light/view/:id", ...readStack, setRegion, getLightAmcById);

  router.use(setRegion);
  mountLightAmcApprovalRoutes(router, "light/");

  return router;
};
