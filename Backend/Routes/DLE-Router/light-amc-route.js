import express from "express";
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

const router = express.Router();

router.post("/store", requireLightAmcAdd, lightAmcUpload, storeLightAmc);

router.get("/get", requireLightAmcRead, getLightAmcs);
router.get("/recent-done", requireLightAmcRead, getRecentLightAmcs);
router.get("/period-status", requireLightAmcRead, getLightAmcsInPeriod);
router.get("/view/:id", requireLightAmcRead, getLightAmcById);
router.get("/last", requireLightAmcRead, getLastLightAmc);

export default router;
