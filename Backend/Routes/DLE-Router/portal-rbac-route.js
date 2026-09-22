import express from "express";
import { protect } from "../../Middleware/authmiddleware.js";
import {
  bootstrapPortalAccessController,
  createRoleController,
  deleteRoleController,
  getMyPortalPermissionsController,
  getRoleMembersController,
  getUserRolesController,
  listCompanyUsersController,
  listPermissionsController,
  listRolesController,
  setRoleMembersController,
  setUserRolesController,
  updateRoleController,
} from "../../Controller/DLE-Controller/portal-rbac-controller.js";
import {
  createPortalApiCredentialController,
  deletePortalApiCredentialController,
  listPortalApiCredentialsController,
  rotatePortalApiCredentialSecretController,
  updatePortalApiCredentialController,
} from "../../Controller/DLE-Controller/portal-api-credential-controller.js";
import { getPortalIntegrationCatalogController } from "../../Controller/DLE-Controller/portal-integration-controller.js";

const router = express.Router();

router.use(protect);

router.post("/bootstrap", bootstrapPortalAccessController);
router.get("/permissions", listPermissionsController);
router.get("/integration-catalog", getPortalIntegrationCatalogController);
router.get("/users", listCompanyUsersController);
router.get("/me", getMyPortalPermissionsController);
router.get("/roles", listRolesController);
router.post("/roles", createRoleController);
router.put("/roles/:id", updateRoleController);
router.delete("/roles/:id", deleteRoleController);
router.get("/roles/:id/users", getRoleMembersController);
router.put("/roles/:id/users", setRoleMembersController);
router.get("/users/:userId/roles", getUserRolesController);
router.put("/users/:userId/roles", setUserRolesController);

router.get("/api-credentials", listPortalApiCredentialsController);
router.post("/api-credentials", createPortalApiCredentialController);
router.put("/api-credentials/:id", updatePortalApiCredentialController);
router.post("/api-credentials/:id/rotate-secret", rotatePortalApiCredentialSecretController);
router.delete("/api-credentials/:id", deletePortalApiCredentialController);

export default router;
