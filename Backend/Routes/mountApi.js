import authRoutes from "./DLE-Router/dle-auth-router.js";
import adminRoutes from "./DLE-Router/admin-route.js";
import biharSslAmcRoutes from "./DLE-Router/Bihar-SSL-Router/Bihar_amc_route.js";
import upSslAmcRoutes from "./DLE-Router/UP-SSL-Router/UP_ssl_amc_route.js";
import lightAmcRoutes from "./DLE-Router/light-amc-route.js";

/** Mount every Node API under /api — one place to read all routes. */
export const mountApiRoutes = (app) => {
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);

  // AMC documents (Node DB)
  app.use("/api/bihar/amc", biharSslAmcRoutes);
  app.use("/api/up/amc", upSslAmcRoutes);

  // Legacy aliases — keep until live is fully updated
  app.use("/api/bihar/ssl-amc", biharSslAmcRoutes);
  app.use("/api/up/ssl-amc", upSslAmcRoutes);

  // Light AMC (field visits)
  app.use("/api/light-amc", lightAmcRoutes);

  // JSON 404 for unknown API calls (avoids HTML "Cannot POST ..." in browser)
  app.use("/api", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API not found: ${req.method} ${req.originalUrl}`,
    });
  });
};
