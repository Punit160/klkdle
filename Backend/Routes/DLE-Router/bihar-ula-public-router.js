import express from "express";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";
import {
  downloadBiharUlaImagesZip,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";

/** Public Bihar ULA reads for external portal — no JWT; scoped by company_id. */
const router = express.Router();

router.get("/list", attachPortalCompanyOrSkipRouter, listBiharUlaSurveys);
router.get(
  "/:id/download-images",
  attachPortalCompanyOrSkipRouter,
  downloadBiharUlaImagesZip
);
router.get("/:id", attachPortalCompanyOrSkipRouter, getBiharUlaSurvey);

export default router;
