import express from "express";
import { getPortalIntegrationProfileController } from "../../Controller/DLE-Controller/portal-integration-controller.js";
import { getDlePortalDashboard } from "../../Controller/DLE-Controller/dle-dashboard-controller.js";
import { portalExternalAuth, requirePortalApiScope } from "../../Middleware/portalExternalAuth.js";

const router = express.Router();

/** External portal: verify key/secret and list allowed API routes. */
router.get("/me", portalExternalAuth, getPortalIntegrationProfileController);
router.get("/dle-dashboard", portalExternalAuth, requirePortalApiScope("read"), getDlePortalDashboard);

export default router;

