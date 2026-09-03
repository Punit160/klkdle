import express from "express";
import upload from "../../Middleware/UploadMiddleware.js";
import {
  getLastLightAmc,
  getLightAmcById,
  getLightAmcs,
  getLightAmcsInPeriod,
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

router.get("/get", getLightAmcs);
router.get("/period-status", getLightAmcsInPeriod);
router.get("/view/:id", getLightAmcById);
router.get("/last", getLastLightAmc);

export default router;
