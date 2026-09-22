import { persistModuleUpload } from "../Utils/amcObjectStorage.js";
import {
  REGISTRATION_UPLOAD_FIELD_NAMES,
  USER_MASTER_UPLOAD_FIELD_NAMES,
  USER_UPLOAD_FIELD_STORAGE,
} from "../Utils/userUploadPaths.js";
import { objectUploadFields } from "./objectUploadMiddleware.js";

const toObjectFieldConfig = (fieldNames) =>
  fieldNames.map((name) => {
    const storage = USER_UPLOAD_FIELD_STORAGE[name];
    if (!storage) {
      throw new Error(`Unknown user upload field: ${name}`);
    }
    return { name, maxCount: 1, prefix: storage.r2Prefix };
  });

const persistUserUploadFiles = async (req, res, next) => {
  try {
    const fieldConfig = req._objectUploadFieldConfig || [];
    const prefixByField = new Map(
      fieldConfig.map((item) => [item.name, item.prefix])
    );

    const files = req.files || {};

    for (const [fieldName, fileList] of Object.entries(files)) {
      const r2Prefix = prefixByField.get(fieldName);
      const storage = USER_UPLOAD_FIELD_STORAGE[fieldName];
      if (!r2Prefix || !storage || !fileList?.length) continue;

      for (const file of fileList) {
        const result = await persistModuleUpload({
          file,
          r2Prefix,
          localRelativeFolder: storage.localFolder,
          moduleLabel: "User documents",
        });
        file.storedPath = result.storedValue;
        file.publicUrl = result.publicUrl ?? null;
        file.objectKey = result.key ?? null;
      }
    }

    return next();
  } catch (error) {
    console.error("USER UPLOAD PERSIST ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to store uploaded file.",
    });
  }
};

export const userMasterDocumentUpload = [
  objectUploadFields(toObjectFieldConfig(USER_MASTER_UPLOAD_FIELD_NAMES)),
  persistUserUploadFiles,
];

export const userRegistrationDocumentUpload = [
  objectUploadFields(toObjectFieldConfig(REGISTRATION_UPLOAD_FIELD_NAMES)),
  persistUserUploadFiles,
];

export const userProfileImageUpload = [
  objectUploadFields(toObjectFieldConfig(["profile_image"])),
  persistUserUploadFiles,
];
