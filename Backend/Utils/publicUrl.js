import { getR2PublicUrl, parseR2StoredValue } from "./objectStorage.js";

const isLocalhostUrl = (value) =>
  /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(String(value || ""));

export const getPublicBaseUrl = (req) => {
  const fromEnv = String(process.env.APP_URL || process.env.PUBLIC_URL || "").replace(/\/$/, "");
  if (fromEnv && !isLocalhostUrl(fromEnv)) return fromEnv;

  const proto = req?.headers?.["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers?.["x-forwarded-host"] || req?.get?.("host") || "";
  if (host) return `${String(proto).split(",")[0].trim()}://${String(host).split(",")[0].trim()}`;

  return "";
};

export const resolveStoredFileUrl = (req, storedValue) => {
  const raw = String(storedValue || "").trim();
  if (!raw) return null;

  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((part) => resolveStoredFileUrl(req, part.trim()))
      .filter(Boolean)
      .join(",");
  }

  if (/^https?:\/\//i.test(raw)) return raw;

  const r2Key = parseR2StoredValue(raw);
  if (r2Key) {
    return getR2PublicUrl(r2Key);
  }

  const path = raw.startsWith("/") ? raw : `/${raw.startsWith("uploads/") ? raw : `uploads/${raw}`}`;
  const base = getPublicBaseUrl(req);
  return base ? `${base}${path}` : path;
};

export const toPublicFileUrl = (req, filePath) => resolveStoredFileUrl(req, filePath);
