import {
  isR2Configured,
  isR2UploadsEnabled,
  saveBufferToLocalUploads,
  uploadBufferToR2,
  buildObjectKey,
  buildFixedObjectKey,
} from "./objectStorage.js";
import fs from "node:fs";
import path from "node:path";
import { getUploadsRoot } from "./uploadsPath.js";

export const r2UploadsRequiredError = (moduleLabel) =>
  `${moduleLabel} uploads use Cloudflare R2 (R2_UPLOADS_ENABLED=1) but credentials are missing. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in Backend/.env and restart.`;

export const persistModuleUpload = async ({
  file,
  r2Prefix,
  localRelativeFolder,
  moduleLabel = "File",
  /** When set, object is {prefix}/{fixedBasename}.ext (no extra subfolder). */
  fixedBasename,
}) => {
  if (!file?.buffer && !file?.path) {
    throw new Error("Upload file buffer or path is required.");
  }

  const useR2 = isR2UploadsEnabled() && isR2Configured();

  if (isR2UploadsEnabled() && !isR2Configured()) {
    console.warn(
      `[${moduleLabel}] R2_UPLOADS_ENABLED=1 but R2 credentials missing — saving to local UPLOADS_DIR.`
    );
  }

  const buffer = file.buffer ?? (await fs.promises.readFile(file.path));
  const folder = useR2 ? r2Prefix : localRelativeFolder;
  const objectKey = fixedBasename
    ? buildFixedObjectKey(folder, fixedBasename, file.originalname)
    : buildObjectKey(folder, file.originalname);

  if (useR2) {
    return uploadBufferToR2({
      buffer,
      objectKey,
      contentType: file.mimetype,
    });
  }

  if (fixedBasename) {
    const relativeFolder = String(localRelativeFolder || "misc").replace(
      /^uploads[/\\]/,
      ""
    );
    const fileName = path.basename(objectKey);
    const absoluteDir = path.join(getUploadsRoot(), relativeFolder);
    await fs.promises.mkdir(absoluteDir, { recursive: true });
    await fs.promises.writeFile(path.join(absoluteDir, fileName), buffer);
    return {
      storedValue: `/uploads/${relativeFolder}/${fileName}`,
      publicUrl: null,
    };
  }

  return saveBufferToLocalUploads({
    buffer,
    folderPrefix: localRelativeFolder,
    originalName: file.originalname,
  });
};

/** @deprecated use persistModuleUpload */
export const persistAmcUploadFile = (opts) =>
  persistModuleUpload({
    moduleLabel: opts.regionLabel || "AMC",
    ...opts,
  });
