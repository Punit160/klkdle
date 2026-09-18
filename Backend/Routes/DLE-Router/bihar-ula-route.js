import express from "express";
import { protect } from "../../Middleware/authmiddleware.js";
import {
  biharUlaFirstVisitUpload,
  biharUlaSecondVisitUpload,
} from "../../Middleware/biharUlaUploadMiddleware.js";
import {
  createBiharUlaFirstVisit,
  downloadBiharUlaImagesZip,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
  updateBiharUlaSecondVisit,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";

const router = express.Router();

router.get("/list", protect, listBiharUlaSurveys);
router.get("/:id/download-images", protect, downloadBiharUlaImagesZip);
router.get("/:id", protect, getBiharUlaSurvey);
router.post("/store", protect, biharUlaFirstVisitUpload, createBiharUlaFirstVisit);
router.patch(
  "/:id/second-visit",
  protect,
  biharUlaSecondVisitUpload,
  updateBiharUlaSecondVisit
);

export default router;
