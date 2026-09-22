import express from "express";
import { biharAmcUpload } from "../../../Middleware/biharAmcUploadMiddleware.js";
import {
  requireSslAmcAdd,
  requireSslAmcRead,
} from "../../../Middleware/portalModulePermission.js";
import { createAmcDocument, getAmcDocuments, getAllDistricts, getQuarterStatus, updateAmcDocument } from "../../../Controller/DLE-Controller/Bihar-SSL/Bihar_amc_controller.js";
const router = express.Router();

const biharRead = requireSslAmcRead("bihar");
const biharAdd = requireSslAmcAdd("bihar");

router.post("/store", biharAdd, ...biharAmcUpload, createAmcDocument);
router.post("/update", biharAdd, ...biharAmcUpload, updateAmcDocument);

router.get("/get", biharRead, getAmcDocuments);
router.get("/view", biharRead, getAmcDocuments);
router.get("/quarter-status", biharRead, getQuarterStatus);
router.get("/dashboard/district", biharRead, getAllDistricts);

export default router;
