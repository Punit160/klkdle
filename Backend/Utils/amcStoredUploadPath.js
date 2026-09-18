/** Path saved in DB from multer file (R2 middleware sets storedPath). */
export const storedPathFromUploadedFile = (file, legacyPathForFilename) => {
  if (file?.storedPath) {
    return file.storedPath;
  }
  if (file?.filename && legacyPathForFilename) {
    return legacyPathForFilename(file.filename);
  }
  return null;
};

export const joinStoredPaths = (files, legacyPathForFilename) =>
  (files || [])
    .map((file) => storedPathFromUploadedFile(file, legacyPathForFilename))
    .filter(Boolean)
    .join(",");
