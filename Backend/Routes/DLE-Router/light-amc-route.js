import express from "express";
import multer from "multer";
import { lightAmcUpload } from "../../Middleware/lightAmcUploadMiddleware.js";
import {
  requireLightAmcAdd,
  requireLightAmcRead,
} from "../../Middleware/portalModulePermission.js";
import {
  getLastLightAmc,
  getLightAmcById,
  getLightAmcs,
  getLightAmcsInPeriod,
  getRecentLightAmcs,
  storeLightAmc,
} from "../../Controller/DLE-Controller/light-amc-controller.js";
import {
  downloadLightAmcTemplate,
  importLightAmcs,
  updateLightAmcRecord,
} from "../../Controller/DLE-Controller/light-amc-admin-controller.js";

const router = express.Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

const readExcelUpload = (req, res, next) => {
  excelUpload(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE" ? "Excel file must be 5 MB or smaller" : "Could not read the Excel file",
    });
  });
};

router.post("/store", requireLightAmcAdd, lightAmcUpload, storeLightAmc);
router.patch("/update/:id", requireLightAmcAdd, lightAmcUpload, updateLightAmcRecord);
router.get("/import-template", requireLightAmcAdd, downloadLightAmcTemplate);
router.post("/import", requireLightAmcAdd, readExcelUpload, importLightAmcs);

router.get("/get", requireLightAmcRead, getLightAmcs);
router.get("/recent-done", requireLightAmcRead, getRecentLightAmcs);
router.get("/period-status", requireLightAmcRead, getLightAmcsInPeriod);
router.get("/view/:id", requireLightAmcRead, getLightAmcById);
router.get("/last", requireLightAmcRead, getLastLightAmc);

export default router;
