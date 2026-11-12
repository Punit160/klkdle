import express from "express";
import {
  biharUlaConsentFormUpload,
  biharUlaFirstVisitUpload,
  biharUlaInspectionUpload,
  biharUlaSecondVisitUpload,
} from "../../Middleware/biharUlaUploadMiddleware.js";
import {
  requireBiharUlaAdd,
  requireBiharUlaRead,
  requireBiharUlaReport,
} from "../../Middleware/portalModulePermission.js";
import { requireUserMasterAdmin } from "../../Middleware/requireUserMasterAdmin.js";
import {
  checkBiharUlaUniqueController,
  createBiharUlaFirstVisit,
  downloadBiharUlaImagesZip,
  getBiharUlaReport,
  getBiharUlaSurvey,
  listBiharUlaSurveys,
  updateBiharUlaApproval,
  updateBiharUlaSecondVisit,
  uploadBiharUlaConsentForm,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-controller.js";
import {
  addBiharUlaSiteExpense,
  deleteBiharUlaSiteExpense,
  getBiharUlaSitePayment,
  listBiharUlaPayments,
  updateBiharUlaSitePayment,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-payment-controller.js";
import {
  getBiharUlaInspection,
  listBiharUlaInspections,
  lookupBiharUlaInspectionSite,
  storeBiharUlaInspection,
  updateBiharUlaInspectionApproval,
} from "../../Controller/DLE-Controller/Bihar-ULA/bihar-ula-inspection-controller.js";

const router = express.Router();

const ulaRead = requireBiharUlaRead();
const ulaAdd = requireBiharUlaAdd();

router.get("/payments", requireUserMasterAdmin, listBiharUlaPayments);
router.get("/payments/:surveyId", requireUserMasterAdmin, getBiharUlaSitePayment);
router.patch("/payments/:surveyId", requireUserMasterAdmin, updateBiharUlaSitePayment);
router.post("/payments/:surveyId/expenses", requireUserMasterAdmin, addBiharUlaSiteExpense);
router.delete("/payments/expenses/:expenseId", requireUserMasterAdmin, deleteBiharUlaSiteExpense);
router.get("/inspection/list", listBiharUlaInspections);
router.get("/inspection/site", lookupBiharUlaInspectionSite);
router.get("/inspection/:id", getBiharUlaInspection);
router.patch("/inspection/:id/approval", requireUserMasterAdmin, updateBiharUlaInspectionApproval);
router.post("/inspection/store", biharUlaInspectionUpload, storeBiharUlaInspection);
router.get("/list", ulaRead, listBiharUlaSurveys);
router.get("/report", requireBiharUlaReport(), getBiharUlaReport);
router.get("/check-unique", ulaAdd, checkBiharUlaUniqueController);
router.patch("/:id/approval", requireUserMasterAdmin, updateBiharUlaApproval);
router.patch(
  "/:id/consent-form",
  requireUserMasterAdmin,
  biharUlaConsentFormUpload,
  uploadBiharUlaConsentForm
);
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
