import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./Routes/DLE-Router/dle-auth-router.js";
import adminRoutes from "./Routes/DLE-Router/admin-route.js";
import biharSslAmcRoutes from "./Routes/DLE-Router/Bihar-SSL-Router/Bihar_amc_route.js";
import UpSslAmcRoutes from "./Routes/DLE-Router/UP-SSL-Router/UP_ssl_amc_route.js";
import lightAmcRoutes from "./Routes/DLE-Router/light-amc-route.js";

dotenv.config();

if (typeof BigInt !== "undefined") {
  BigInt.prototype.toJSON = function toJSON() {
    return this.toString();
  };
}

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, "../Frontend/dist");
const hasFrontend = fs.existsSync(path.join(frontendDist, "index.html"));

app.set("trust proxy", 1);

const extraOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "https://klkerp.com",
    "https://www.klkerp.com",
    "https://klkdle.klkventures.cloud",
    "http://klkdle.klkventures.cloud",
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    ...extraOrigins,
  ]
    .filter(Boolean)
    .map((value) => value.replace(/\/$/, ""))
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = origin.replace(/\/$/, "");
      if (allowedOrigins.has(normalized) || extraOrigins.includes("*")) {
        callback(null, true);
        return;
      }

      try {
        const { hostname } = new URL(origin);
        if (
          hostname === "klkerp.com" ||
          hostname.endsWith(".klkerp.com") ||
          hostname === "klkdle.klkventures.cloud" ||
          hostname.endsWith(".klkventures.cloud") ||
          hostname === "localhost" ||
          hostname === "127.0.0.1"
        ) {
          callback(null, true);
          return;
        }
      } catch {
        // ignore invalid origin
      }

      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ok",
  });
});

if (!hasFrontend) {
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "DLE Backend API running",
    });
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bihar/ssl-amc", biharSslAmcRoutes);
app.use("/api/up/ssl-amc", UpSslAmcRoutes);
app.use("/api/light-amc", lightAmcRoutes);

if (hasFrontend) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    const requestPath = req.path || "";
    if (
      requestPath.startsWith("/api") ||
      requestPath.startsWith("/uploads") ||
      requestPath.startsWith("/health")
    ) {
      next();
      return;
    }

    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
