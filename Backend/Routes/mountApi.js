import authRoutes from "./DLE-Router/dle-auth-router.js";
import adminRoutes from "./DLE-Router/admin-route.js";
import biharSslAmcRoutes from "./DLE-Router/Bihar-SSL-Router/Bihar_amc_route.js";
import upSslAmcRoutes from "./DLE-Router/UP-SSL-Router/UP_ssl_amc_route.js";
import lightAmcRoutes from "./DLE-Router/light-amc-route.js";
import attendanceRoutes from "./DLE-Router/attendance-route.js";
import biharUlaRoutes from "./DLE-Router/bihar-ula-route.js";
import { createAmcApprovalRouter } from "./DLE-Router/amc-approval-public-router.js";
import biharUlaPublicRoutes from "./DLE-Router/bihar-ula-public-router.js";
import { protect } from "../Middleware/authmiddleware.js";
import { requireActivePunchIn } from "../Middleware/requireActivePunchIn.js";
import { getObjectStorageDiagnostics } from "../Utils/objectStorage.js";

const fieldModuleAuth = [protect, requireActivePunchIn];

const mountAmcWithPublicApproval = (app, basePath, region, mainRouter) => {
  app.use(basePath, createAmcApprovalRouter(region));
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

  // AMC approval (public portal) + field routes (JWT + punch in)
  mountAmcWithPublicApproval(app, "/api/bihar/amc", "bihar", biharSslAmcRoutes);
  mountAmcWithPublicApproval(app, "/api/up/amc", "up", upSslAmcRoutes);
  mountAmcWithPublicApproval(app, "/api/bihar/ssl-amc", "bihar", biharSslAmcRoutes);
  mountAmcWithPublicApproval(app, "/api/up/ssl-amc", "up", upSslAmcRoutes);

  // Light AMC (field visits)
  app.use("/api/light-amc", ...fieldModuleAuth, lightAmcRoutes);

  // Attendance (punch in/out) — always available without punch-in gate
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
