import express from "express";
import upload from "../../../Middleware/UploadMiddleware.js";
import { protect } from "../../../Middleware/authmiddleware.js";
import { createAmcDocument, getAmcDocuments, getAllDistricts, getQuarterStatus, updateAmcDocument } from "../../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";
import { updateAmcApprovalStatus } from "../../../Controller/DLE-Controller/amc-approval-controller.js";

const router = express.Router();

const amcUpload = upload.fields([
  { name: "amc_document", maxCount: 10 },
  { name: "invoice_document", maxCount: 1 }
]);

router.post("/store", amcUpload, createAmcDocument);
router.post("/update", amcUpload, updateAmcDocument);
router.post("/approval/status", updateAmcApprovalStatus("bihar"));

router.get('/get', protect, getAmcDocuments)
router.get('/view', protect, getAmcDocuments)
router.get('/quarter-status', protect, getQuarterStatus)

router.get(
    '/dashboard/district',
    protect,
    getAllDistricts
)

export default router;