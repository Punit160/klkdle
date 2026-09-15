import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mountApiRoutes } from "./Routes/mountApi.js";
import {
  findExistingUploadFile,
  getUploadsInfo,
  getUploadsRoot,
} from "./Utils/uploadsPath.js";

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
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:3001",
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

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, "");
  if (allowedOrigins.has(normalized) || extraOrigins.includes("*")) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "klkerp.com" ||
      hostname.endsWith(".klkerp.com") ||
      hostname === "klkdle.klkventures.cloud" ||
      hostname.endsWith(".klkventures.cloud") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = origin.replace(/\/$/, "");
      if (isAllowedOrigin(normalized)) {
        // Echo the request origin — never a fixed FRONTEND_URL from env.
        callback(null, normalized);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/uploads-info", (req, res) => {
  res.json({
    success: true,
    data: getUploadsInfo(),
  });
});

app.use("/uploads", (req, res, next) => {
  const filePath = findExistingUploadFile(req.path);

  if (!filePath) {
    res.status(404).json({
      success: false,
      message: "File not found",
      uploadsRoot: getUploadsRoot(),
      requested: req.originalUrl,
    });
    return;
  }

  res.sendFile(filePath, (error) => {
    if (error) next(error);
  });
});

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

mountApiRoutes(app);

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
  const uploadsInfo = getUploadsInfo();
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads root: ${uploadsInfo.uploadsRoot} (exists: ${uploadsInfo.exists})`);
  if (uploadsInfo.exists) {
    console.log(
      `Upload folders: light-amc=${uploadsInfo.lightAmcCount}, user entries=${uploadsInfo.userCount}`
    );
  }
});
