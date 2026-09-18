import {
  LOCAL_UPLOAD_PREFIX,
  R2_PREFIX,
} from "../Utils/r2ObjectPrefixes.js";
import { persistModuleUpload } from "../Utils/amcObjectStorage.js";
import {
  isR2Configured,
  isR2UploadsEnabled,
} from "../Utils/objectStorage.js";
import { objectUploadFields } from "./objectUploadMiddleware.js";

export const shouldUseR2ForUpAmc = () =>
  isR2UploadsEnabled() && isR2Configured();

export const upAmcUploadFields = objectUploadFields([
  { name: "amc_document", maxCount: 20, prefix: R2_PREFIX.UP_SSL_AMC_DOC },
  {
    name: "invoice_document",
    maxCount: 1,
    prefix: R2_PREFIX.UP_SSL_AMC_INVOICE,
  },
]);

export const persistUpAmcUploads = async (req, res, next) => {
  try {
    const fieldMap = {
      amc_document: {
        r2: R2_PREFIX.UP_SSL_AMC_DOC,
        local: LOCAL_UPLOAD_PREFIX.UP_SSL_AMC_DOC,
      },
      invoice_document: {
        r2: R2_PREFIX.UP_SSL_AMC_INVOICE,
        local: LOCAL_UPLOAD_PREFIX.UP_SSL_AMC_INVOICE,
      },
    };

    const files = req.files || {};

    for (const [fieldName, config] of Object.entries(fieldMap)) {
      const fileList = files[fieldName];
      if (!fileList?.length) continue;

      for (const file of fileList) {
        const result = await persistModuleUpload({
          file,
          r2Prefix: config.r2,
          localRelativeFolder: config.local,
          moduleLabel: "UP SSL AMC",
        });
        file.storedPath = result.storedValue;
        file.publicUrl = result.publicUrl ?? null;
        file.objectKey = result.key ?? null;
      }
    }

    if (shouldUseR2ForUpAmc()) {
      console.info("[upAmc] Stored in R2 bucket klkdle");
    }

    return next();
  } catch (error) {
    console.error("UP AMC UPLOAD PERSIST ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to store AMC upload.",
    });
  }
};

export const upAmcUpload = [upAmcUploadFields, persistUpAmcUploads];
