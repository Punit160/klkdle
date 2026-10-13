import express from "express";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";
import {
  portalExternalAuth,
  requireExternalApproveApi,
  requirePortalApiScope,
} from "../../Middleware/portalExternalAuth.js";
import { biharUlaPortalEditUpload } from "../../Middleware/biharUlaUploadMiddleware.js";
import {
  downloadBiharUlaImagesZip,
  getBiharUlaReport,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
  updateBiharUlaApproval,
  updateBiharUlaSurveyPortal,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";
/** External portal Bihar ULA reads — API key + secret. */
const router = express.Router();

const readStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("read"),
];

const writeStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("write"),
];

const approveStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requireExternalApproveApi,
];

const pendingApproval = (req, res, next) => {
  if (req.query.approval_status == null || req.query.approval_status === "") {
    req.query.approval_status = "0";
  }
  return listBiharUlaSurveys(req, res, next);
};

router.get("/list", ...readStack, listBiharUlaSurveys);
router.get("/report", ...readStack, getBiharUlaReport);
router.get("/approval/list", ...readStack, listBiharUlaSurveys);
router.get("/approval/pending", ...readStack, pendingApproval);
router.post("/approval/status", ...approveStack, updateBiharUlaApproval);
router.get("/:id/download-images", ...readStack, downloadBiharUlaImagesZip);
router.post("/:id/approval", ...approveStack, updateBiharUlaApproval);
router.patch("/:id/approval", ...approveStack, updateBiharUlaApproval);
router.patch(
  "/:id",
  ...writeStack,
  biharUlaPortalEditUpload,
  updateBiharUlaSurveyPortal
);
router.get("/:id", ...readStack, getBiharUlaSurvey);

export default router;

