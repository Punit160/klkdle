import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseR2StoredValue, toR2StoredValue, uploadBufferToR2 } from "./objectStorage.js";
import { R2_PREFIX } from "./r2ObjectPrefixes.js";
import { findExistingUploadFile, toUploadRelativePath } from "./uploadsPath.js";

const MAX_STORED_LEN = 255;

export const isAlreadyCloudStored = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return true;
  if (parseR2StoredValue(raw)) return true;
  if (/^https?:\/\//i.test(raw)) return true;
  return false;
};

export const isLocalUploadReference = (value) => {
  const raw = String(value || "").trim();
  if (!raw || isAlreadyCloudStored(raw)) return false;
  return raw.includes("uploads/") || raw.startsWith("/upload");
};

const normalizeRelativeUploadPath = (storedValue) => {
  const relative = toUploadRelativePath(storedValue);
  if (relative) return relative.replace(/\\/g, "/");

  let raw = String(storedValue || "").trim().replace(/\\/g, "/");
  if (raw.startsWith("/")) raw = raw.slice(1);
  if (raw.startsWith("uploads/")) raw = raw.slice("uploads/".length);
  if (!raw || raw.includes("..")) return null;
  return raw;
};

/** Map legacy uploads/… path to R2 object key prefix (folder). */
export const inferR2PrefixForRelativePath = (relativePath) => {
  const p = String(relativePath || "").replace(/^\/+/, "");

  if (p.startsWith("user/profile/")) return R2_PREFIX.USER_PROFILE;
  if (p.startsWith("user/documents/")) return R2_PREFIX.USER_EDUCATIONAL;
  if (p.startsWith("user/aadhaar/")) return R2_PREFIX.USER_AADHAAR;
  if (p.startsWith("user/pan/")) return R2_PREFIX.USER_PAN;
  if (p.startsWith("user/driving-license/")) return R2_PREFIX.USER_DRIVING_LICENSE;
  if (p.startsWith("user/police-verification/")) return R2_PREFIX.USER_POLICE_VERIFICATION;
  if (p.startsWith("user/cancelled-cheque/")) return R2_PREFIX.USER_CANCELLED_CHEQUE;
  if (p.startsWith("user/rent-agreement/")) return R2_PREFIX.USER_RENT_AGREEMENT;

  if (p.startsWith("light-amc/")) return R2_PREFIX.LIGHT_AMC;

  if (p.startsWith("bihar/ssl/amc/doc/")) return R2_PREFIX.BIHAR_SSL_AMC_DOC;
  if (p.startsWith("bihar/ssl/amc/invoice/")) return R2_PREFIX.BIHAR_SSL_AMC_INVOICE;
  if (p.startsWith("up/ssl/amc/doc/")) return R2_PREFIX.UP_SSL_AMC_DOC;
  if (p.startsWith("up/ssl/amc/invoice/")) return R2_PREFIX.UP_SSL_AMC_INVOICE;

  if (p.startsWith("bihar/ula/")) {
    const rest = p.slice("bihar/ula/".length);
    return rest ? `${R2_PREFIX.BIHAR_ULA}/${rest}` : R2_PREFIX.BIHAR_ULA;
  }

  return null;
};

const contentTypeForFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
};

const fitStoredValue = (objectKey) => {
  let stored = toR2StoredValue(objectKey);
  if (stored.length <= MAX_STORED_LEN) return stored;

  const ext = path.extname(objectKey);
  const prefix = objectKey.includes("/") ? objectKey.slice(0, objectKey.lastIndexOf("/")) : "misc";
  const hash = crypto.createHash("sha256").update(objectKey).digest("hex").slice(0, 20);
  const shortKey = `${prefix}/m/${hash}${ext}`;
  stored = toR2StoredValue(shortKey);
  if (stored.length > MAX_STORED_LEN) {
    throw new Error(`R2 stored value too long for key: ${shortKey}`);
  }
  return stored;
};

const buildObjectKeyForMigration = (relativePath) => {
  const fileName = path.basename(relativePath);
  const prefix = inferR2PrefixForRelativePath(relativePath);
  if (!prefix) return null;

  if (prefix.startsWith(`${R2_PREFIX.BIHAR_ULA}/`)) {
    return prefix;
  }

  return `${prefix.replace(/\/+$/, "")}/migrated/${fileName}`;
};

export const migrateOneLocalUploadReference = async (storedValue, { dryRun = true } = {}) => {
  const raw = String(storedValue || "").trim();
  if (!raw) return { action: "skip", reason: "empty", value: raw };
  if (isAlreadyCloudStored(raw)) return { action: "skip", reason: "already_cloud", value: raw };

  const relative = normalizeRelativeUploadPath(raw);
  if (!relative) return { action: "skip", reason: "invalid_path", value: raw };

  const absolutePath = findExistingUploadFile(`/uploads/${relative}`);
  if (!absolutePath) {
    return { action: "missing", reason: "file_not_found", value: raw, relative };
  }

  const objectKey = buildObjectKeyForMigration(relative);
  if (!objectKey) {
    return { action: "skip", reason: "unknown_prefix", value: raw, relative };
  }

  let stored;
  try {
    stored = fitStoredValue(objectKey);
  } catch (error) {
    return { action: "error", reason: error.message, value: raw, relative };
  }

  if (dryRun) {
    return {
      action: "would_migrate",
      value: raw,
      relative,
      objectKey,
      stored,
      absolutePath,
    };
  }

  const buffer = await fs.promises.readFile(absolutePath);
  await uploadBufferToR2({
    buffer,
    objectKey: parseR2StoredValue(stored),
    contentType: contentTypeForFile(absolutePath),
    metadata: { migrated_from: relative.slice(0, 180) },
  });

  return {
    action: "migrated",
    value: raw,
    stored,
    objectKey: parseR2StoredValue(stored),
    absolutePath,
  };
};

/** Comma-separated AMC paths → migrate each segment. */
export const migrateStoredUploadFieldValue = async (storedValue, options = {}) => {
  const raw = String(storedValue || "").trim();
  if (!raw) return { newValue: raw, parts: [] };
  if (!raw.includes(",")) {
    const result = await migrateOneLocalUploadReference(raw, options);
    const newValue =
      result.action === "migrated" || result.action === "would_migrate"
        ? result.stored
        : raw;
    return { newValue, parts: [result], changed: newValue !== raw };
  }

  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const parts = [];
  const out = [];

  for (const segment of segments) {
    const result = await migrateOneLocalUploadReference(segment, options);
    parts.push(result);
    if (result.action === "migrated" || result.action === "would_migrate") {
      out.push(result.stored);
    } else {
      out.push(segment);
    }
  }

  const newValue = out.join(",");
  return { newValue, parts, changed: newValue !== raw };
};
