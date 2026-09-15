import express from "express";
import upload from "../../Middleware/UploadMiddleware.js";
import { protect } from "../../Middleware/authmiddleware.js";
import {
  getLastLightAmc,
  getLightAmcById,
  getLightAmcs,
  getLightAmcsInPeriod,
  getRecentLightAmcs,
  storeLightAmc,
} from "../../Controller/DLE-Controller/light-amc-controller.js";

const router = express.Router();

router.post(
  "/store",
  upload.fields([
    { name: "image_1", maxCount: 1 },
    { name: "image_2", maxCount: 1 },
  ]),
  storeLightAmc
);

router.get("/get", protect, getLightAmcs);
router.get("/recent-done", protect, getRecentLightAmcs);
router.get("/period-status", protect, getLightAmcsInPeriod);
router.get("/view/:id", protect, getLightAmcById);
router.get("/last", protect, getLastLightAmc);

export default router;
