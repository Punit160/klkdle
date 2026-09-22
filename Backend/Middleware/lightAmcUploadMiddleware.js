import { persistModuleUpload } from "../Utils/amcObjectStorage.js";
import { LOCAL_UPLOAD_PREFIX, R2_PREFIX } from "../Utils/r2ObjectPrefixes.js";
import { objectUploadFields } from "./objectUploadMiddleware.js";

export const lightAmcUploadFields = objectUploadFields([
  { name: "image_1", maxCount: 1, prefix: R2_PREFIX.LIGHT_AMC },
  { name: "image_2", maxCount: 1, prefix: R2_PREFIX.LIGHT_AMC },
]);

export const persistLightAmcUploads = async (req, res, next) => {
  try {
    const fieldMap = {
      image_1: {
        r2: R2_PREFIX.LIGHT_AMC,
        local: LOCAL_UPLOAD_PREFIX.LIGHT_AMC,
      },
      image_2: {
        r2: R2_PREFIX.LIGHT_AMC,
        local: LOCAL_UPLOAD_PREFIX.LIGHT_AMC,
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
          moduleLabel: "Light AMC",
        });
        file.storedPath = result.storedValue;
        file.publicUrl = result.publicUrl ?? null;
        file.objectKey = result.key ?? null;
      }
    }

    return next();
  } catch (error) {
    console.error("LIGHT AMC UPLOAD PERSIST ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to store light AMC images.",
    });
  }
};

export const lightAmcUpload = [lightAmcUploadFields, persistLightAmcUploads];
