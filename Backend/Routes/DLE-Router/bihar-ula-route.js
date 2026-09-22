import express from "express";
import {
  biharUlaFirstVisitUpload,
  biharUlaSecondVisitUpload,
} from "../../Middleware/biharUlaUploadMiddleware.js";
import {
  requireBiharUlaAdd,
  requireBiharUlaRead,
} from "../../Middleware/portalModulePermission.js";
import {
  checkBiharUlaUniqueController,
  createBiharUlaFirstVisit,
  downloadBiharUlaImagesZip,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
  updateBiharUlaSecondVisit,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";

const router = express.Router();

const ulaRead = requireBiharUlaRead();
const ulaAdd = requireBiharUlaAdd();

router.get("/list", ulaRead, listBiharUlaSurveys);
router.get("/check-unique", ulaAdd, checkBiharUlaUniqueController);
router.get("/:id/download-images", ulaRead, downloadBiharUlaImagesZip);
router.get("/:id", ulaRead, getBiharUlaSurvey);
router.post("/store", ulaAdd, biharUlaFirstVisitUpload, createBiharUlaFirstVisit);
router.patch(
  "/:id/second-visit",
  ulaAdd,
  biharUlaSecondVisitUpload,
  updateBiharUlaSecondVisit
);

export default router;
