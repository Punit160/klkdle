import express from "express";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";
import {
  portalExternalAuth,
  requireExternalApproveApi,
  requirePortalApiScope,
} from "../../Middleware/portalExternalAuth.js";
import {
  biharUlaInspectionUpload,
  biharUlaPortalEditUpload,
} from "../../Middleware/biharUlaUploadMiddleware.js";
import {
  downloadBiharUlaImagesZip,
  getBiharUlaReport,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
  updateBiharUlaApproval,
  updateBiharUlaSurveyPortal,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";
import {
  getBiharUlaInspection,
  listBiharUlaInspections,
  lookupBiharUlaInspectionSite,
  storeBiharUlaInspection,
  updateBiharUlaInspectionApproval,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-inspection-controller.js";
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

const inspectionApprovalFromBody = (req, res, next) => {
  const id = String(req.body?.id || req.body?.inspection_id || "").trim();
  if (!id) {
    return res.status(422).json({ success: false, message: "Inspection id is required." });
  }
  req.params.id = id;
  return updateBiharUlaInspectionApproval(req, res, next);
};

router.get("/inspection/list", ...readStack, listBiharUlaInspections);
router.get("/inspection/site", ...readStack, lookupBiharUlaInspectionSite);
router.post(
  "/inspection/store",
  ...writeStack,
  biharUlaInspectionUpload,
  storeBiharUlaInspection
);
router.post("/inspection/approval/status", ...approveStack, inspectionApprovalFromBody);
router.post("/inspection/:id/approval", ...approveStack, updateBiharUlaInspectionApproval);
router.patch("/inspection/:id/approval", ...approveStack, updateBiharUlaInspectionApproval);
router.get("/inspection/:id", ...readStack, getBiharUlaInspection);
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

