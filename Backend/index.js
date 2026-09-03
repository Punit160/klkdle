import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "DLE Backend API running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/dle/bihar/ssl-amc", biharSslAmcRoutes);
app.use("/dle/Up/ssl-amc", UpSslAmcRoutes);
app.use("/dle/UP/ssl-amc", UpSslAmcRoutes);
app.use("/dle/up/ssl-amc", UpSslAmcRoutes);
app.use("/dle/light-amc", lightAmcRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
