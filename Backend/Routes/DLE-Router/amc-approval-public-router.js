import express from "express";

import {

  getAmcDocumentsForApproval,

  updateAmcApprovalStatus,

} from "../../Controller/DLE-Controller/amc-approval-controller.js";

import { getAmcDocuments as getBiharAmcDocuments } from "../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";

import { getAmcDocuments as getUpAmcDocuments } from "../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js";

import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";

import {

  portalExternalAuth,

  requireExternalApproveApi,

  requirePortalApiScope,

} from "../../Middleware/portalExternalAuth.js";



/** External portal AMC API — API key + secret; approve not via DLE JWT roles. */

export const createAmcApprovalRouter = (region) => {

  const router = express.Router();

  const getAmcDocuments = region === "up" ? getUpAmcDocuments : getBiharAmcDocuments;



  const readStack = [

    attachPortalCompanyOrSkipRouter,

    portalExternalAuth,

    requirePortalApiScope("read"),

  ];



  router.get("/get", ...readStack, getAmcDocuments);

  router.get("/view", ...readStack, getAmcDocuments);



  router.post(

    "/approval/status",

    portalExternalAuth,

    requireExternalApproveApi,

    updateAmcApprovalStatus(region)

  );

  router.get(

    "/approval/list",

    portalExternalAuth,

    requirePortalApiScope("read"),

    getAmcDocumentsForApproval(region)

  );

  router.get("/approval/pending", portalExternalAuth, requirePortalApiScope("read"), (req, res, next) => {

    if (req.query.approval_status == null || req.query.approval_status === "") {

      req.query.approval_status = String(0);

    }

    return getAmcDocumentsForApproval(region)(req, res, next);

  });



  return router;

};


