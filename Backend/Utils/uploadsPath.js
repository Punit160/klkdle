import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const getBackendRoot = () => backendRoot;

export const getUploadsRoot = () => path.join(backendRoot, "uploads");

export const resolveStoredUploadPath = (storedValue) => {
  const storedPath = String(storedValue || "").trim();
  if (!storedPath) return null;

  const uploadsRoot = getUploadsRoot();

  if (storedPath.startsWith("/uploads/")) {
    return path.join(backendRoot, storedPath.slice(1));
  }

  if (storedPath.startsWith("uploads/")) {
    return path.join(backendRoot, storedPath);
  }

  return path.join(uploadsRoot, storedPath);
};

export const uploadsRootExists = () => fs.existsSync(getUploadsRoot());

const isSafeRelativeUploadPath = (relative) =>
  Boolean(relative) && !relative.includes("..");

const isInsideUploadsRoot = (absolutePath) => {
  const uploadsRoot = path.resolve(getUploadsRoot());
  const uploadsPrefix = `${uploadsRoot}${path.sep}`;
  return absolutePath === uploadsRoot || absolutePath.startsWith(uploadsPrefix);
};

export const resolveUploadRequestPath = (requestPath = "") => {
  const relative = decodeURIComponent(
    String(requestPath || "").replace(/^\/uploads\/?/, "").replace(/^\/+/, "")
  );

  if (!isSafeRelativeUploadPath(relative)) {
    return null;
  }

  const uploadsRoot = path.resolve(getUploadsRoot());
  const absolutePath = path.resolve(uploadsRoot, relative);

  if (!isInsideUploadsRoot(absolutePath)) {
    return null;
  }

  return absolutePath;
};

/** Try subfolder path first, then legacy flat files in uploads root. */
export const findExistingUploadFile = (requestPath = "") => {
  const primary = resolveUploadRequestPath(requestPath);
  const candidates = [];

  if (primary) candidates.push(primary);

  const relative = decodeURIComponent(
    String(requestPath || "").replace(/^\/uploads\/?/, "").replace(/^\/+/, "")
  );

  if (isSafeRelativeUploadPath(relative)) {
    const uploadsRoot = path.resolve(getUploadsRoot());
    const fileName = path.basename(relative);
    candidates.push(path.resolve(uploadsRoot, fileName));
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const getUploadsInfo = () => {
  const uploadsRoot = getUploadsRoot();
  const info = {
    uploadsRoot,
    backendRoot: getBackendRoot(),
    exists: fs.existsSync(uploadsRoot),
    lightAmcCount: 0,
    userCount: 0,
  };

  try {
    info.lightAmcCount = fs.readdirSync(path.join(uploadsRoot, "light-amc")).length;
  } catch {
    // folder may not exist yet
  }

  try {
    info.userCount = fs.readdirSync(path.join(uploadsRoot, "user")).length;
  } catch {
    // folder may not exist yet
  }

  return info;
};
