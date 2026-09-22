import { LOCAL_UPLOAD_PREFIX, R2_PREFIX } from "./r2ObjectPrefixes.js";
import { storedPathFromUploadedFile } from "./amcStoredUploadPath.js";

/** Legacy disk paths (R2 off / local dev only). */
const USER_UPLOAD_DIRS = {
  profile_image: "uploads/user/profile",
  educational_document: "uploads/user/documents",
  aadhaar_voter_id: "uploads/user/aadhaar",
  pan_card: "uploads/user/pan",
  driving_license: "uploads/user/driving-license",
  police_verification: "uploads/user/police-verification",
  cancelled_cheque: "uploads/user/cancelled-cheque",
  rent_agreement_electricity_bill: "uploads/user/rent-agreement",
};

export const USER_UPLOAD_FIELD_STORAGE = {
  profile_image: {
    r2Prefix: R2_PREFIX.USER_PROFILE,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_PROFILE,
  },
  educational_document: {
    r2Prefix: R2_PREFIX.USER_EDUCATIONAL,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_EDUCATIONAL,
  },
  aadhaar_voter_id: {
    r2Prefix: R2_PREFIX.USER_AADHAAR,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_AADHAAR,
  },
  pan_card: {
    r2Prefix: R2_PREFIX.USER_PAN,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_PAN,
  },
  driving_license: {
    r2Prefix: R2_PREFIX.USER_DRIVING_LICENSE,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_DRIVING_LICENSE,
  },
  police_verification: {
    r2Prefix: R2_PREFIX.USER_POLICE_VERIFICATION,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_POLICE_VERIFICATION,
  },
  cancelled_cheque: {
    r2Prefix: R2_PREFIX.USER_CANCELLED_CHEQUE,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_CANCELLED_CHEQUE,
  },
  rent_agreement_electricity_bill: {
    r2Prefix: R2_PREFIX.USER_RENT_AGREEMENT,
    localFolder: LOCAL_UPLOAD_PREFIX.USER_RENT_AGREEMENT,
  },
};

export const USER_MASTER_UPLOAD_FIELD_NAMES = Object.keys(USER_UPLOAD_DIRS);

export const REGISTRATION_UPLOAD_FIELD_NAMES = USER_MASTER_UPLOAD_FIELD_NAMES.filter(
  (name) => name !== "profile_image"
);

export const mapUserUploadFilesToPaths = (files = {}) => {
  const out = {};
  for (const [field, dir] of Object.entries(USER_UPLOAD_DIRS)) {
    const file = files[field]?.[0];
    if (!file) continue;
    const path = storedPathFromUploadedFile(file, (name) => `/${dir}/${name}`);
    if (path) out[field] = path;
  }
  return out;
};

export const parseUserMasterMultipartBody = (body = {}) => {
  const parsed = { ...body };
  const numericFields = ["role", "status", "approval_status"];
  numericFields.forEach((key) => {
    if (parsed[key] !== undefined && parsed[key] !== "") {
      parsed[key] = Number(parsed[key]);
    }
  });
  if (parsed.portal_role_ids != null && typeof parsed.portal_role_ids === "string") {
    try {
      parsed.portal_role_ids = JSON.parse(parsed.portal_role_ids);
    } catch {
      parsed.portal_role_ids = [];
    }
  }
  return parsed;
};
