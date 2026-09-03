import express from "express";
import upload from "../../../Middleware/UploadMiddleware.js";
import { createAmcDocument, getAmcDocuments, getAllDistricts, getQuarterStatus, updateAmcDocument } from "../../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";

const router = express.Router();

const amcUpload = upload.fields([
  { name: "amc_document", maxCount: 10 },
  { name: "invoice_document", maxCount: 1 }
]);

router.post("/store", amcUpload, createAmcDocument);
router.post("/update", amcUpload, updateAmcDocument);

router.get('/get', getAmcDocuments)
router.get('/view', getAmcDocuments)
router.get('/quarter-status', getQuarterStatus)

router.get(
    '/dashboard/district',
    getAllDistricts
)

export default router;