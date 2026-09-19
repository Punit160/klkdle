import express from "express";
import {
  getAmcDocumentsForApproval,
  updateAmcApprovalStatus,
} from "../../Controller/DLE-Controller/amc-approval-controller.js";
import { getAmcDocuments as getBiharAmcDocuments } from "../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";
import { getAmcDocuments as getUpAmcDocuments } from "../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";

/** Public AMC API for external portal — no JWT; scoped by company_id. */
export const createAmcApprovalRouter = (region) => {
  const router = express.Router();
  const getAmcDocuments = region === "up" ? getUpAmcDocuments : getBiharAmcDocuments;

  router.get("/get", attachPortalCompanyOrSkipRouter, getAmcDocuments);
  router.get("/view", attachPortalCompanyOrSkipRouter, getAmcDocuments);

  router.post("/approval/status", updateAmcApprovalStatus(region));
  router.get("/approval/list", getAmcDocumentsForApproval(region));
  router.get("/approval/pending", (req, res, next) => {
    if (req.query.approval_status == null || req.query.approval_status === "") {
      req.query.approval_status = String(0);
    }
    return getAmcDocumentsForApproval(region)(req, res, next);
  });

  return router;
};
