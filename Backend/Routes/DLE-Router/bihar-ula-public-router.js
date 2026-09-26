import express from "express";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";
import {
  portalExternalAuth,
  requirePortalApiScope,
} from "../../Middleware/portalExternalAuth.js";
import { biharUlaPortalEditUpload } from "../../Middleware/biharUlaUploadMiddleware.js";
import {
  downloadBiharUlaImagesZip,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
  updateBiharUlaSurveyPortal,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";

/** External portal Bihar ULA reads — API key + secret. */
const router = express.Router();

const readStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("read"),
];

const writeStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("write"),
];

router.get("/list", ...readStack, listBiharUlaSurveys);
router.get("/:id/download-images", ...readStack, downloadBiharUlaImagesZip);
router.patch(
  "/:id",
  ...writeStack,
  biharUlaPortalEditUpload,
  updateBiharUlaSurveyPortal
);
router.get("/:id", ...readStack, getBiharUlaSurvey);

export default router;

