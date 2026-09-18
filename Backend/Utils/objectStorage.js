import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import { getUploadsRoot } from "./uploadsPath.js";
import { R2_PREFIX } from "./r2ObjectPrefixes.js";

const trimSlash = (value) => String(value || "").replace(/\/+$/, "");

const readEnv = (...keys) => {
  for (const key of keys) {
    let value = process.env[key];
    if (value == null || value === "") continue;
    value = String(value).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value) return value;
  }
  return "";
};

export const getR2AccessKeyId = () =>
  readEnv("R2_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID");

export const getR2SecretAccessKey = () =>
  readEnv(
    "R2_SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "S3_SECRET_ACCESS_KEY"
  );

export const R2_BUCKET = readEnv("R2_BUCKET") || "klkdle";

export const R2_ENDPOINT = trimSlash(
  readEnv("R2_ENDPOINT") ||
    "https://deccda3a875734729fe2a4c0effb7f63.r2.cloudflarestorage.com"
);

/** Browser-facing URL (R2 Public Development URL or custom domain). */
export const R2_PUBLIC_DEV_URL =
  "https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev";

export const R2_PUBLIC_BASE_URL = trimSlash(
  readEnv("R2_PUBLIC_BASE_URL") || R2_PUBLIC_DEV_URL
);

export const isR2Configured = () =>
  Boolean(getR2AccessKeyId() && getR2SecretAccessKey() && R2_BUCKET && R2_ENDPOINT);

/** Single switch for all R2 uploads (AMC + future modules). Set 0 to use local disk everywhere. */
export const isR2UploadsEnabled = () => {
  const flag = String(process.env.R2_UPLOADS_ENABLED ?? "1").trim().toLowerCase();
  return flag !== "0" && flag !== "false";
};

export const getObjectStorageDiagnostics = () => ({
  uploads_use_r2: isR2UploadsEnabled(),
  r2: {
    configured: isR2Configured(),
    bucket: R2_BUCKET,
    endpoint: R2_ENDPOINT,
    public_base_url: R2_PUBLIC_BASE_URL,
    access_key_id_set: Boolean(getR2AccessKeyId()),
    secret_access_key_set: Boolean(getR2SecretAccessKey()),
    note: "Token is scoped to bucket klkdle; folders are object key prefixes only.",
  },
  key_prefixes: { ...R2_PREFIX },
  uploads_root: getUploadsRoot(),
});

export const logObjectStorageStartup = () => {
  const d = getObjectStorageDiagnostics();
  console.log("[storage] R2 configured:", d.r2.configured, "| bucket:", d.r2.bucket);
  console.log(
    "[storage] uploads_use_r2:",
    d.uploads_use_r2,
    "| public URL:",
    d.r2.public_base_url || "(default pub r2.dev)"
  );
  if (d.uploads_use_r2 && !d.r2.configured) {
    console.warn(
      "[storage] R2_UPLOADS_ENABLED is on but R2 credentials are missing — uploads will fail until R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are set."
    );
  }
};

let s3Client;

export const getS3Client = () => {
  if (!isR2Configured()) {
    throw new Error(
      "R2 is not configured. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in Backend/.env (or PM2 env)."
    );
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: getR2AccessKeyId(),
        secretAccessKey: getR2SecretAccessKey(),
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  return s3Client;
};

export const buildObjectKey = (folderPrefix, originalName) => {
  const safeFolder = String(folderPrefix || "misc")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "");

  const extension = path.extname(originalName || "").toLowerCase();
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

  return safeFolder ? `${safeFolder}/${fileName}` : fileName;
};

/** One file per basename inside folder (e.g. biharula/{ca_no}/panel_one_img.jpg). */
export const buildFixedObjectKey = (folderPrefix, basename, originalName) => {
  const safeFolder = String(folderPrefix || "misc")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.\./g, "");
  const extension = path.extname(originalName || "").toLowerCase() || ".jpg";
  const safeBase = String(basename || "file")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const fileName = `${safeBase || "file"}${extension}`;
  return safeFolder ? `${safeFolder}/${fileName}` : fileName;
};

/** Value saved in DB for R2 objects. */
export const toR2StoredValue = (objectKey) => `r2:${objectKey}`;

export const parseR2StoredValue = (storedValue) => {
  const raw = String(storedValue || "").trim();
  if (!raw.startsWith("r2:")) return null;
  const key = raw.slice(3).replace(/^\/+/, "");
  return key || null;
};

export const getR2PublicUrl = (objectKey) => {
  if (!objectKey) return null;
  if (/^https?:\/\//i.test(objectKey)) return objectKey;

  const base = R2_PUBLIC_BASE_URL;
  if (!base) return null;

  const key = String(objectKey).replace(/^\/+/, "");
  return `${base}/${key}`;
};

const streamToBuffer = async (body) => {
  if (!body) return null;
  if (Buffer.isBuffer(body)) return body;
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

/** Read bytes for a value stored in DB (`r2:…` or `/uploads/…`). */
export const readStoredFileBuffer = async (storedValue) => {
  const raw = String(storedValue || "").trim();
  if (!raw) return null;

  const r2Key = parseR2StoredValue(raw);
  if (r2Key) {
    const client = getS3Client();
    const out = await client.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key })
    );
    return streamToBuffer(out.Body);
  }

  if (/^https?:\/\//i.test(raw)) {
    const res = await fetch(raw);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  let relative = raw.replace(/^\/+/, "");
  if (relative.startsWith("uploads/")) {
    relative = relative.slice("uploads/".length);
  }
  const absolutePath = path.join(getUploadsRoot(), relative);
  try {
    return await fs.promises.readFile(absolutePath);
  } catch {
    return null;
  }
};

export const uploadBufferToR2 = async ({
  buffer,
  objectKey,
  contentType,
  metadata,
}) => {
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      Metadata: metadata,
    })
  );

  return {
    bucket: R2_BUCKET,
    key: objectKey,
    storedValue: toR2StoredValue(objectKey),
    publicUrl: getR2PublicUrl(objectKey),
  };
};

/** Dev fallback when R2 creds are missing but route still uses object-upload middleware. */
export const saveBufferToLocalUploads = async ({
  buffer,
  folderPrefix,
  originalName,
}) => {
  const relativeFolder = String(folderPrefix || "misc").replace(/^uploads[/\\]/, "");
  const objectKey = buildObjectKey(relativeFolder, originalName);
  const absoluteDir = path.join(getUploadsRoot(), relativeFolder);

  fs.mkdirSync(absoluteDir, { recursive: true });

  const fileName = path.basename(objectKey);
  const absolutePath = path.join(absoluteDir, fileName);

  await fs.promises.writeFile(absolutePath, buffer);

  return {
    storedValue: `/uploads/${relativeFolder}/${fileName}`,
    publicUrl: null,
  };
};

export const persistUploadFile = async (file, folderPrefix) => {
  if (!file?.buffer && !file?.path) {
    throw new Error("Upload file buffer or path is required.");
  }

  const buffer = file.buffer ?? (await fs.promises.readFile(file.path));
  const objectKey = buildObjectKey(folderPrefix, file.originalname);

  if (isR2UploadsEnabled() && isR2Configured()) {
    return uploadBufferToR2({
      buffer,
      objectKey,
      contentType: file.mimetype,
    });
  }

  return saveBufferToLocalUploads({
    buffer,
    folderPrefix,
    originalName: file.originalname,
  });
};
