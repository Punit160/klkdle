import express from "express";
import {
  getAttendanceForPortal,
  listAttendanceForPortal,
} from "../../Controller/DLE-Controller/attendance-portal-controller.js";
import {
  portalExternalAuth,
  requirePortalApiScope,
} from "../../Middleware/portalExternalAuth.js";
import { attachPortalCompanyOrSkipRouter } from "../../Utils/portalCompany.js";

/** External portal attendance reads — API key + secret. */
const router = express.Router();

const readStack = [
  attachPortalCompanyOrSkipRouter,
  portalExternalAuth,
  requirePortalApiScope("read"),
];

router.get("/list", ...readStack, listAttendanceForPortal);
router.get("/view/:id", ...readStack, getAttendanceForPortal);

export default router;
