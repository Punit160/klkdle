import express from "express";
import { biharAmcUpload } from "../../../Middleware/biharAmcUploadMiddleware.js";
import { protect } from "../../../Middleware/authmiddleware.js";
import { createAmcDocument, getAmcDocuments, getAllDistricts, getQuarterStatus, updateAmcDocument } from "../../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";
import {
  getAmcDocumentsForApproval,
  updateAmcApprovalStatus,
} from "../../../Controller/DLE-Controller/amc-approval-controller.js";

const router = express.Router();

router.post("/store", ...biharAmcUpload, createAmcDocument);
router.post("/update", ...biharAmcUpload, updateAmcDocument);
router.post("/approval/status", protect, updateAmcApprovalStatus("bihar"));
router.get("/approval/list", protect, getAmcDocumentsForApproval("bihar"));
router.get("/approval/pending", protect, (req, res, next) => {
  if (req.query.approval_status == null || req.query.approval_status === "") {
    req.query.approval_status = String(0);
  }
  return getAmcDocumentsForApproval("bihar")(req, res, next);
});

router.get('/get', protect, getAmcDocuments)
router.get('/view', protect, getAmcDocuments)
router.get('/quarter-status', protect, getQuarterStatus)

router.get(
    '/dashboard/district',
    protect,
    getAllDistricts
)

export default router;