import authRoutes from "./DLE-Router/dle-auth-router.js";
import adminRoutes from "./DLE-Router/admin-route.js";
import biharSslAmcRoutes from "./DLE-Router/Bihar-SSL-Router/Bihar_amc_route.js";
import upSslAmcRoutes from "./DLE-Router/UP-SSL-Router/UP_ssl_amc_route.js";
import lightAmcRoutes from "./DLE-Router/light-amc-route.js";
import lightAmcPublicRoutes, {
  createRegionalLightAmcPortalRouter,
} from "./DLE-Router/light-amc-public-router.js";
import attendanceRoutes from "./DLE-Router/attendance-route.js";
import attendancePublicRoutes from "./DLE-Router/attendance-public-router.js";
import biharUlaRoutes from "./DLE-Router/bihar-ula-route.js";
import { createAmcApprovalRouter } from "./DLE-Router/amc-approval-public-router.js";
import biharUlaPublicRoutes from "./DLE-Router/bihar-ula-public-router.js";
import portalRbacRoutes from "./DLE-Router/portal-rbac-route.js";
import portalIntegrationRoutes from "./DLE-Router/portal-integration-router.js";
import userMasterRoutes from "./DLE-Router/user-master-route.js";
import { protect } from "../Middleware/authmiddleware.js";
import { loadPortalPermissions } from "../Middleware/requirePortalPermission.js";
import { requireActivePunchIn } from "../Middleware/requireActivePunchIn.js";
import { getObjectStorageDiagnostics } from "../Utils/objectStorage.js";

const fieldModuleAuth = [protect, loadPortalPermissions, requireActivePunchIn];

const mountAmcWithPublicApproval = (app, basePath, region, mainRouter) => {
  app.use(basePath, createAmcApprovalRouter(region));
  app.use(basePath, createRegionalLightAmcPortalRouter(region));
  app.use(basePath, ...fieldModuleAuth, mainRouter);
};

/** Mount every Node API under /api — one place to read all routes. */
export const mountApiRoutes = (app) => {
  app.get("/api/health/storage", (_req, res) => {
    res.json({
      success: true,
      data: getObjectStorageDiagnostics(),
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/portal/access", portalRbacRoutes);
  app.use("/api/portal/integration", portalIntegrationRoutes);
  app.use("/api/user-master", userMasterRoutes);

  // AMC approval (public portal) + field routes (JWT + punch in)
  mountAmcWithPublicApproval(app, "/api/bihar/amc", "bihar", biharSslAmcRoutes);
  mountAmcWithPublicApproval(app, "/api/up/amc", "up", upSslAmcRoutes);
  mountAmcWithPublicApproval(app, "/api/bihar/ssl-amc", "bihar", biharSslAmcRoutes);
  mountAmcWithPublicApproval(app, "/api/up/ssl-amc", "up", upSslAmcRoutes);

  // Light AMC (field visits) — portal reads + JWT field routes
  app.use("/api/light-amc", lightAmcPublicRoutes);
  app.use("/api/light-amc", ...fieldModuleAuth, lightAmcRoutes);

  // Attendance — external portal read APIs + JWT punch in/out
  app.use("/api/attendance/integration", attendancePublicRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/bihar/ula", biharUlaPublicRoutes);
  app.use("/api/bihar/ula", ...fieldModuleAuth, biharUlaRoutes);

  // JSON 404 for unknown API calls (avoids HTML "Cannot POST ..." in browser)
  app.use("/api", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API not found: ${req.method} ${req.originalUrl}`,
    });
  });
};
