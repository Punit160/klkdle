import express from "express";
import { getPortalIntegrationProfileController } from "../../Controller/DLE-Controller/portal-integration-controller.js";
import { portalExternalAuth } from "../../Middleware/portalExternalAuth.js";

const router = express.Router();

/** External portal: verify key/secret and list allowed API routes. */
router.get("/me", portalExternalAuth, getPortalIntegrationProfileController);

export default router;
