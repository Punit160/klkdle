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

export const shouldUseR2ForBiharAmc = () =>
  isR2UploadsEnabled() && isR2Configured();

export const biharAmcUploadFields = objectUploadFields([
  { name: "amc_document", maxCount: 10, prefix: R2_PREFIX.BIHAR_SSL_AMC_DOC },
  {
    name: "invoice_document",
    maxCount: 1,
    prefix: R2_PREFIX.BIHAR_SSL_AMC_INVOICE,
  },
]);

export const persistBiharAmcUploads = async (req, res, next) => {
  try {
    const fieldMap = {
      amc_document: {
        r2: R2_PREFIX.BIHAR_SSL_AMC_DOC,
        local: LOCAL_UPLOAD_PREFIX.BIHAR_SSL_AMC_DOC,
      },
      invoice_document: {
        r2: R2_PREFIX.BIHAR_SSL_AMC_INVOICE,
        local: LOCAL_UPLOAD_PREFIX.BIHAR_SSL_AMC_INVOICE,
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
          moduleLabel: "Bihar SSL AMC",
        });
        file.storedPath = result.storedValue;
        file.publicUrl = result.publicUrl ?? null;
        file.objectKey = result.key ?? null;
      }
    }

    if (shouldUseR2ForBiharAmc()) {
      console.info("[biharAmc] Stored in R2 bucket klkdle");
    }

    return next();
  } catch (error) {
    console.error("BIHAR AMC UPLOAD PERSIST ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to store AMC upload.",
    });
  }
};

export const biharAmcUpload = [biharAmcUploadFields, persistBiharAmcUploads];
