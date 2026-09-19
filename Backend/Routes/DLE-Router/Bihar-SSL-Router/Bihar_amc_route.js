import express from "express";
import { biharAmcUpload } from "../../../Middleware/biharAmcUploadMiddleware.js";
import { protect } from "../../../Middleware/authmiddleware.js";
import { createAmcDocument, getAmcDocuments, getAllDistricts, getQuarterStatus, updateAmcDocument } from "../../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";
const router = express.Router();

router.post("/store", ...biharAmcUpload, createAmcDocument);
router.post("/update", ...biharAmcUpload, updateAmcDocument);

router.get('/get', protect, getAmcDocuments)
router.get('/view', protect, getAmcDocuments)
router.get('/quarter-status', protect, getQuarterStatus)

router.get(
    '/dashboard/district',
    protect,
    getAllDistricts
)

export default router;