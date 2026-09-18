import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const getBackendRoot = () => backendRoot;

/** Use UPLOADS_DIR on live so git pull never deletes user files. */
export const getUploadsRoot = () => {
  const fromEnv = String(process.env.UPLOADS_DIR || process.env.UPLOADS_PATH || "").trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(backendRoot, "uploads");
};

export const toUploadRelativePath = (storedValue) => {
  const storedPath = String(storedValue || "").trim();
  if (!storedPath) return null;

  const relative = storedPath
    .replace(/^\/uploads\/?/, "")
    .replace(/^uploads\/?/, "");

  if (!relative || relative.includes("..")) {
    return null;
  }

  return relative;
};

export const resolveStoredUploadPath = (storedValue) => {
  const relative = toUploadRelativePath(storedValue);
  if (!relative) return null;
  return path.join(getUploadsRoot(), relative);
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

const findByBasenameUnderUploads = (fileName, maxDepth = 6) => {
  if (!fileName) return null;

  const uploadsRoot = path.resolve(getUploadsRoot());
  const stack = [{ dir: uploadsRoot, depth: 0 }];

  while (stack.length) {
    const { dir, depth } = stack.pop();
    let entries;

    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }

      if (entry.isDirectory() && depth < maxDepth) {
        stack.push({ dir: fullPath, depth: depth + 1 });
      }
    }
  }

  return null;
};

/** Try exact path, legacy flat root, then any subfolder with same filename. */
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

    const nestedMatch = findByBasenameUnderUploads(fileName);
    if (nestedMatch) candidates.push(nestedMatch);
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

export const uploadFileExists = (storedValue) => {
  const relative = toUploadRelativePath(storedValue);
  if (!relative) return false;
  return Boolean(findExistingUploadFile(`/uploads/${relative}`));
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
