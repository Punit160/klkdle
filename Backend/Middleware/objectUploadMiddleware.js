import multer from "multer";
import {
  isR2Configured,
  isR2UploadsEnabled,
  persistUploadFile,
} from "../Utils/objectStorage.js";

const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

const isAllowedUploadFile = (file) => {
  const mime = String(file?.mimetype || "").toLowerCase();
  if (ALLOWED_UPLOAD_MIMES.has(mime)) return true;

  const name = String(file?.originalname || "").toLowerCase();
  const looksLikeImage = /\.(jpe?g|png)$/.test(name);
  if (
    looksLikeImage &&
    (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream")
  ) {
    return true;
  }

  return false;
};

export const createObjectMulter = ({ maxFileSize = 5 * 1024 * 1024 } = {}) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize },
    fileFilter: (_req, file, cb) => {
      if (isAllowedUploadFile(file)) {
        cb(null, true);
        return;
      }
      cb(new Error("Only PDF, JPG, JPEG and PNG files are allowed"));
    },
  });

const memoryUpload = createObjectMulter();

const handleMulterError = (res, err) => {
  console.error("UPLOAD MULTER ERROR:", err);
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "Photo file is too large. Use a smaller image or retake the photo.",
    });
  }
  return res.status(400).json({
    success: false,
    message: err?.message || "Upload failed.",
  });
};

/**
 * Multer step for new modules. Pair with persistObjectUploads after fields().
 * @param {Array<{ name: string, maxCount?: number, prefix: string }>} fieldConfig
 */
export const objectUploadFields = (fieldConfig, { maxFileSize } = {}) => {
  const fields = fieldConfig.map(({ name, maxCount = 1 }) => ({
    name,
    maxCount,
  }));

  const upload =
    maxFileSize != null ? createObjectMulter({ maxFileSize }) : memoryUpload;
  const multerMiddleware = upload.fields(fields);

  return (req, res, next) => {
    req._objectUploadFieldConfig = fieldConfig;
    return multerMiddleware(req, res, (err) => {
      if (err) return handleMulterError(res, err);
      return next();
    });
  };
};

export const persistObjectUploads = async (req, res, next) => {
  try {
    const fieldConfig = req._objectUploadFieldConfig || [];
    const prefixByField = new Map(
      fieldConfig.map((item) => [item.name, item.prefix])
    );

    const files = req.files || {};

    for (const [fieldName, fileList] of Object.entries(files)) {
      const prefix = prefixByField.get(fieldName);
      if (!prefix) continue;

      for (const file of fileList) {
        const result = await persistUploadFile(file, prefix);
        file.storedPath = result.storedValue;
        file.publicUrl = result.publicUrl;
        file.objectKey = result.key ?? null;
      }
    }

    if (isR2UploadsEnabled() && !isR2Configured()) {
      console.warn(
        "[objectUpload] R2_UPLOADS_ENABLED=1 but R2 credentials missing — saved to local UPLOADS_DIR instead."
      );
    }

    return next();
  } catch (error) {
    console.error("OBJECT UPLOAD PERSIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to store uploaded file.",
    });
  }
};
