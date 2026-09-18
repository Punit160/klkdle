import { objectUploadFields } from "./objectUploadMiddleware.js";

const visit1Fields = [
  { name: "panel_one_img", maxCount: 1 },
  { name: "panel_two_img", maxCount: 1 },
  { name: "inverter_img", maxCount: 1 },
  { name: "smart_meter_img", maxCount: 1 },
  { name: "acdb_img", maxCount: 1 },
  { name: "system_img", maxCount: 1 },
  { name: "solar_meter_img", maxCount: 1 },
  { name: "structure_img", maxCount: 1 },
];

const visit2Fields = [
  { name: "solar_meter_img2", maxCount: 1 },
  { name: "system_img2", maxCount: 1 },
];

/** Stamped camera photos can exceed 5 MB on high-resolution devices. */
const ULA_MAX_FILE_BYTES = 12 * 1024 * 1024;

export const biharUlaFirstVisitUpload = objectUploadFields(
  visit1Fields.map((f) => ({ ...f, prefix: "biharula" })),
  { maxFileSize: ULA_MAX_FILE_BYTES }
);

export const biharUlaSecondVisitUpload = objectUploadFields(
  visit2Fields.map((f) => ({ ...f, prefix: "biharula" })),
  { maxFileSize: ULA_MAX_FILE_BYTES }
);
