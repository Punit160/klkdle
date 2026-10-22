import * as XLSX from "xlsx";
import {
  createLightAmc,
  findLastLightAmc,
  findLightAmcById,
  isUpStyleAmcRegion,
  lightAmcRegionOf,
  serializeLightAmc,
  updateLightAmcById,
  visitRegionProfile,
} from "../../Model/DLE-Model/light-amc-model.js";
import { storedPathFromUploadedFile } from "../../Utils/amcStoredUploadPath.js";
import { resolveJwtUserId } from "../../Utils/requestUser.js";
import { isUserMasterAdmin } from "../../Utils/userRoles.js";

const stateForRegion = (region) => (region === "bihar" ? "Bihar" : "Uttar Pradesh");

const REGION_REQUIRED = "region or state is required (bihar, up, kusumc, powerpack, offgrid, or ongrid).";

const requestRegion = (req) =>
  lightAmcRegionOf(req.lightAmcRegion) ||
  lightAmcRegionOf(req.query?.region) ||
  lightAmcRegionOf(req.body?.region) ||
  lightAmcRegionOf(req.query?.state) ||
  lightAmcRegionOf(req.body?.state);

const requireAdmin = (req, res) => {
  if (isUserMasterAdmin(req.user)) return true;
  res.status(403).json({
    success: false,
    message: "Only an admin can edit or import AMC records.",
  });
  return false;
};

const pad = (value) => String(value).padStart(2, "0");

const localISODate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`;
  return null;
};

const addMonths = (isoDate, months) => {
  const match = String(isoDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const monthDiff = (fromIso, toIso) => {
  const from = String(fromIso || "").match(/^(\d{4})-(\d{2})/);
  const to = String(toIso || "").match(/^(\d{4})-(\d{2})/);
  if (!from || !to) return 0;
  return (Number(to[1]) - Number(from[1])) * 12 + (Number(to[2]) - Number(from[2]));
};

const financialYearLabel = (isoDate) => {
  const match = String(isoDate || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

const normalizeTime = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return false;
  return `${pad(match[1])}:${match[2]}`;
};

const validCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

const textOrNull = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const scheduleForDate = (amcDate, periodStart, periodEnd) => {
  if (periodEnd && amcDate > periodEnd) {
    return { error: `AMC date is after the 5 year period ending ${periodEnd}` };
  }
  const months = Math.max(0, monthDiff(periodStart, amcDate));
  return {
    next_amc_date: addMonths(amcDate, 3),
    quarter_no: Math.min(20, Math.floor(months / 3) + 1),
  };
};

const UP_SAVED_ANSWER_KEYS = [
  "plant_status",
  "functional_duration_value",
  "functional_duration_unit",
  "backup_hours_per_day",
  "breakdown_count",
  "last_repair_date",
  "panel_cleaning_done",
  "battery_bank_condition",
  "battery_terminal_cleaned",
  "battery_petroleum_jelly_applied",
  "luminaires_cleaned_wiring",
  "wiring_checked_loose_wires",
];

const UP_HEADERS = [
  "ssl_id",
  "unique_id",
  "uid",
  "pole_no",
  "district",
  "block",
  "panchayat",
  "beneficiary_name",
  "beneficiary_contact",
  "amc_date",
  "amc_time",
  "fy_year",
  "latitude",
  "longitude",
  "light_working",
  "remarks",
  "date_of_installation",
  ...UP_SAVED_ANSWER_KEYS,
];

const KUSUMC_HEADERS = [
  "pump_id",
  "work_order_no",
  "capacity",
  "uid",
  "district",
  "block",
  "village",
  "beneficiary_name",
  "beneficiary_contact",
  "amc_date",
  "amc_time",
  "fy_year",
  "latitude",
  "longitude",
  "light_working",
  "remarks",
  "date_of_installation",
  ...UP_SAVED_ANSWER_KEYS,
];

const POWERPACK_HEADERS = [
  "powerpack_id",
  "scheme_name",
  "order_no",
  "work_order_no",
  "capacity",
  "uid",
  "uid_date",
  "district",
  "block",
  "village",
  "beneficiary_name",
  "beneficiary_contact",
  "amc_date",
  "amc_time",
  "fy_year",
  "latitude",
  "longitude",
  "light_working",
  "remarks",
  "date_of_installation",
  ...UP_SAVED_ANSWER_KEYS,
];

const gridHeaders = (idKey) => [
  idKey,
  "scheme_name",
  "order_no",
  "installed_place",
  "work_order_no",
  "capacity",
  "uid",
  "uid_date",
  "district",
  "block",
  "village",
  "beneficiary_name",
  "beneficiary_contact",
  "amc_date",
  "amc_time",
  "fy_year",
  "latitude",
  "longitude",
  "light_working",
  "remarks",
  "date_of_installation",
  ...UP_SAVED_ANSWER_KEYS,
];

const OFFGRID_HEADERS = gridHeaders("offgrid_id");
const ONGRID_HEADERS = gridHeaders("ongrid_id");

const GRID_SAMPLE = {
  scheme_name: "UP Solar Grid",
  order_no: "ORD-2024-118",
  installed_place: "Primary school",
  work_order_no: "UP/GRID/2024/118",
  capacity: "5 kW",
  uid: "GRID-118",
  uid_date: "2024-04-01",
  district: "Sitapur",
  block: "Biswa",
  village: "Baldevnagar",
  beneficiary_name: "Ramesh Kumar",
  beneficiary_contact: "9876543210",
  amc_date: "2026-10-13",
  amc_time: "16:11",
  fy_year: "2026-27",
  latitude: "28.60346510708853",
  longitude: "77.35730601490813",
  light_working: "Yes",
  remarks: "",
  date_of_installation: "2024-04-01",
  plant_status: "Functional",
  functional_duration_value: "12",
  functional_duration_unit: "Months",
  backup_hours_per_day: "7",
  breakdown_count: "4",
  last_repair_date: "2026-10-14",
  panel_cleaning_done: "Yes",
  battery_bank_condition: "Satisfactory (Full backup received)",
  battery_terminal_cleaned: "Yes",
  battery_petroleum_jelly_applied: "Yes",
  luminaires_cleaned_wiring: "No",
  wiring_checked_loose_wires: "Yes",
};

const BIHAR_HEADERS = [
  "ssl_id",
  "unique_id",
  "pole_no",
  "district",
  "block",
  "panchayat",
  "ward_no",
  "beneficiary_name",
  "beneficiary_contact",
  "amc_date",
  "latitude",
  "longitude",
  "light_working",
  "remarks",
  "date_of_installation",
];

const SAMPLE_BY_REGION = {
  offgrid: { offgrid_id: "OG-118", ...GRID_SAMPLE },
  ongrid: { ongrid_id: "NG-118", ...GRID_SAMPLE },
  powerpack: {
    powerpack_id: "PP-118",
    scheme_name: "UP Solar Power Pack",
    order_no: "ORD-2024-118",
    work_order_no: "UP/PP/2024/118",
    capacity: "1 kW",
    uid: "PP-118",
    uid_date: "2024-04-01",
    district: "Sitapur",
    block: "Biswa",
    village: "Baldevnagar",
    beneficiary_name: "Ramesh Kumar",
    beneficiary_contact: "9876543210",
    amc_date: "2026-10-13",
    amc_time: "16:11",
    fy_year: "2026-27",
    latitude: "28.60346510708853",
    longitude: "77.35730601490813",
    light_working: "Yes",
    remarks: "",
    date_of_installation: "2024-04-01",
    plant_status: "Functional",
    functional_duration_value: "12",
    functional_duration_unit: "Months",
    backup_hours_per_day: "7",
    breakdown_count: "4",
    last_repair_date: "2026-10-14",
    panel_cleaning_done: "Yes",
    battery_bank_condition: "Satisfactory (Full backup received)",
    battery_terminal_cleaned: "Yes",
    battery_petroleum_jelly_applied: "Yes",
    luminaires_cleaned_wiring: "No",
    wiring_checked_loose_wires: "Yes",
  },
  kusumc: {
    pump_id: "65252",
    work_order_no: "UP/KUSUM/2024/118",
    capacity: "3 HP",
    uid: "65252",
    district: "Sitapur",
    block: "Biswa",
    village: "Baldevnagar",
    beneficiary_name: "Ramesh Kumar",
    beneficiary_contact: "9876543210",
    amc_date: "2026-10-13",
    amc_time: "16:11",
    fy_year: "2026-27",
    latitude: "28.60346510708853",
    longitude: "77.35730601490813",
    light_working: "Yes",
    remarks: "",
    date_of_installation: "2024-04-01",
    plant_status: "Functional",
    functional_duration_value: "12",
    functional_duration_unit: "Months",
    backup_hours_per_day: "7",
    breakdown_count: "4",
    last_repair_date: "2026-10-14",
    panel_cleaning_done: "Yes",
    battery_bank_condition: "Satisfactory (Full backup received)",
    battery_terminal_cleaned: "Yes",
    battery_petroleum_jelly_applied: "Yes",
    luminaires_cleaned_wiring: "No",
    wiring_checked_loose_wires: "Yes",
  },
  up: {
    ssl_id: "65252",
    unique_id: "65252",
    uid: "65252",
    pole_no: "03",
    district: "Sitapur",
    block: "Biswa",
    panchayat: "Baldevnagar",
    beneficiary_name: "Ramesh Kumar",
    beneficiary_contact: "9876543210",
    amc_date: "2026-10-13",
    amc_time: "16:11",
    fy_year: "2026-27",
    latitude: "28.60346510708853",
    longitude: "77.35730601490813",
    light_working: "Yes",
    remarks: "",
    date_of_installation: "2024-04-01",
    plant_status: "Functional",
    functional_duration_value: "12",
    functional_duration_unit: "Months",
    backup_hours_per_day: "7",
    breakdown_count: "4",
    last_repair_date: "2026-10-14",
    panel_cleaning_done: "Yes",
    battery_bank_condition: "Satisfactory (Full backup received)",
    battery_terminal_cleaned: "Yes",
    battery_petroleum_jelly_applied: "Yes",
    luminaires_cleaned_wiring: "No",
    wiring_checked_loose_wires: "Yes",
  },
  bihar: {
    ssl_id: "85532",
    unique_id: "85532",
    pole_no: "03",
    district: "VAISHALI",
    block: "Desri",
    panchayat: "BHIKHANPURA",
    ward_no: "12",
    beneficiary_name: "Ramesh Kumar",
    beneficiary_contact: "9876543210",
    amc_date: "2026-09-17",
    latitude: "28.603351168418506",
    longitude: "77.3574342176244",
    light_working: "Yes",
    remarks: "",
    date_of_installation: "2024-04-01",
  },
};

const headerKey = (value) => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

export const updateLightAmcRecord = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const region = requestRegion(req);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const existing = await findLightAmcById(req.params.id, null, null, region);
    if (!existing || String(existing.state || "").trim() !== stateForRegion(region)) {
      return res.status(404).json({ success: false, message: "AMC record not found" });
    }

    const body = req.body || {};
    const amcDate = localISODate(body.amc_date || existing.amc_date);
    if (!amcDate) {
      return res.status(400).json({ success: false, message: "Enter a valid AMC date" });
    }

    const beneficiaryName = String(body.beneficiary_name ?? existing.beneficiary_name ?? "").trim();
    const beneficiaryContact = String(body.beneficiary_contact ?? existing.beneficiary_contact ?? "").trim();
    if (!beneficiaryName || !beneficiaryContact) {
      return res.status(400).json({
        success: false,
        message: "Beneficiary name and contact are required",
      });
    }
    if (beneficiaryContact.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Beneficiary contact must be 20 characters or less",
      });
    }

    const lightWorking = String(
      body.light_working || existing.light_working || existing.pump_working || existing.powerpack_working || existing.working_status || "Yes"
    ).trim();
    if (lightWorking !== "Yes" && lightWorking !== "No") {
      return res.status(400).json({
        success: false,
        message: "Light working must be Yes or No",
      });
    }

    const latitude = textOrNull(body.latitude ?? existing.latitude);
    const longitude = textOrNull(body.longitude ?? existing.longitude);
    if ((latitude || longitude) && !validCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid latitude and longitude",
      });
    }

    const periodStart = localISODate(existing.period_start) || amcDate;
    const periodEnd = localISODate(existing.period_end);
    const schedule = scheduleForDate(amcDate, periodStart, periodEnd);
    if (schedule.error) {
      return res.status(400).json({ success: false, message: schedule.error });
    }

    const data = {
      district: textOrNull(body.district ?? existing.district),
      block: textOrNull(body.block ?? existing.block),
      panchayat: textOrNull(body.panchayat ?? existing.panchayat),
      ward_no: textOrNull(body.ward_no ?? existing.ward_no),
      unique_id: textOrNull(body.unique_id ?? existing.unique_id),
      pole_no: textOrNull(body.pole_no ?? existing.pole_no),
      amc_date: new Date(`${amcDate}T00:00:00.000Z`),
      next_amc_date: new Date(`${schedule.next_amc_date}T00:00:00.000Z`),
      quarter_no: schedule.quarter_no,
      beneficiary_name: beneficiaryName,
      beneficiary_contact: beneficiaryContact,
      light_working: lightWorking,
      latitude,
      longitude,
      remarks: textOrNull(body.remarks ?? existing.remarks),
      updated_at: new Date(),
    };

    const profile = visitRegionProfile(region);
    if (profile) {
      delete data.panchayat;
      delete data.ward_no;
      delete data.unique_id;
      delete data.pole_no;
      data.village = textOrNull(body.village ?? body.panchayat ?? existing.village);
      data.work_order_no = textOrNull(body.work_order_no ?? existing.work_order_no);
      data.capacity = textOrNull(body.capacity ?? existing.capacity);
      data[profile.site] = textOrNull(body[profile.site] ?? body.ssl_id ?? existing[profile.site]);
      if (profile.scheme) {
        data.uid_date = textOrNull(body.uid_date ?? existing.uid_date);
        data.scheme_name = textOrNull(body.scheme_name ?? existing.scheme_name) || "";
        data.order_no = textOrNull(body.order_no ?? existing.order_no) || "";
      }
      if (profile.place) {
        data.installed_place = textOrNull(body.installed_place ?? existing.installed_place);
      }
    }

    if (isUpStyleAmcRegion(region)) {
      const visitTime = normalizeTime(body.amc_time ?? existing.amc_time);
      if (visitTime === false) {
        return res.status(400).json({ success: false, message: "Enter the visit time as HH:MM" });
      }
      data.uid = textOrNull(body.uid ?? existing.uid);
      data.fy_year = textOrNull(body.fy_year) || financialYearLabel(amcDate);
      data.amc_time = visitTime;
      if (body.visit_answers) {
        try {
          const parsed = typeof body.visit_answers === "string"
            ? JSON.parse(body.visit_answers)
            : body.visit_answers;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("invalid");
          }
          data.visit_answers = JSON.stringify(parsed);
        } catch {
          return res.status(400).json({ success: false, message: "Visit answers are not valid" });
        }
      }
    }

    const storedImage = (file) =>
      storedPathFromUploadedFile(file, (name) => `/uploads/light-amc/${name}`);
    const image1 = req.files?.image_1?.[0];
    const image2 = req.files?.image_2?.[0];
    const image3 = req.files?.image_3?.[0];
    if (image1) data.image_1 = storedImage(image1);
    if (image2) data.image_2 = storedImage(image2);
    if (isUpStyleAmcRegion(region) && image3) data.image_3 = storedImage(image3);

    const row = await updateLightAmcById(existing.id, region, data);
    return res.status(200).json({
      success: true,
      message: "AMC updated",
      data: serializeLightAmc(row),
    });
  } catch (error) {
    console.error("UPDATE LIGHT AMC ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update AMC" });
  }
};

export const downloadLightAmcTemplate = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const region = requestRegion(req);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const headers = region === "offgrid"
      ? OFFGRID_HEADERS
      : region === "ongrid"
        ? ONGRID_HEADERS
        : region === "powerpack"
          ? POWERPACK_HEADERS
          : region === "kusumc"
            ? KUSUMC_HEADERS
            : region === "up"
              ? UP_HEADERS
              : BIHAR_HEADERS;
    const sample = SAMPLE_BY_REGION[region];
    const sheet = XLSX.utils.aoa_to_sheet([
      headers,
      headers.map((key) => sample[key] ?? ""),
    ]);
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let column = range.s.c; column <= range.e.c; column += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        if (!cell) continue;
        cell.t = "s";
        cell.v = String(cell.v ?? "");
        cell.z = "@";
      }
    }
    sheet["!cols"] = headers.map((key) => ({
      wch: Math.min(48, Math.max(String(key).length + 2, String(sample[key] ?? "").length + 2)),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "AMC");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    const filename = {
      offgrid: "up-offgrid-amc-import.xlsx",
      ongrid: "up-ongrid-amc-import.xlsx",
      powerpack: "up-powerpack-amc-import.xlsx",
      kusumc: "up-kusumc-amc-import.xlsx",
      up: "up-amc-import.xlsx",
    }[region] || "bihar-amc-import.xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error("LIGHT AMC TEMPLATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to build the Excel template" });
  }
};

const rowObject = (headers, values) => {
  const record = {};
  headers.forEach((header, index) => {
    record[headerKey(header)] = values[index];
  });
  return record;
};

const buildImportRecord = async ({ record, region, companyId, userId }) => {
  const profile = visitRegionProfile(region);
  const siteKey = profile?.site || "ssl_id";
  const sslId = textOrNull(record[siteKey] || record.ssl_id);
  const beneficiaryName = textOrNull(record.beneficiary_name);
  const beneficiaryContact = textOrNull(record.beneficiary_contact);
  const amcDate = localISODate(record.amc_date);
  if (!sslId || !beneficiaryName || !beneficiaryContact || !amcDate) {
    return {
      error: `${siteKey}, beneficiary_name, beneficiary_contact, and amc_date are required`,
    };
  }
  if (beneficiaryContact.length > 20) {
    return { error: "beneficiary_contact must be 20 characters or less" };
  }

  const lightWorkingText = textOrNull(record.light_working) || "Yes";
  const lightWorking = /^no$/i.test(lightWorkingText) ? "No" : "Yes";
  const latitude = textOrNull(record.latitude);
  const longitude = textOrNull(record.longitude);
  if ((latitude || longitude) && !validCoordinate(latitude, longitude)) {
    return { error: "latitude and longitude are not valid" };
  }

  const upStyle = isUpStyleAmcRegion(region);
  const visitTime = upStyle ? normalizeTime(record.amc_time) : null;
  if (visitTime === false) return { error: "amc_time must be HH:MM" };

  const last = await findLastLightAmc(sslId, companyId, region);
  const installed = localISODate(record.date_of_installation);
  const periodStart = localISODate(last?.period_start) || installed || amcDate;
  const periodEnd = localISODate(last?.period_end) || addMonths(periodStart, 60);
  const schedule = scheduleForDate(amcDate, periodStart, periodEnd);
  if (schedule.error) return { error: schedule.error };

  const plantStatus = textOrNull(record.plant_status);
  const visitAnswers = {};
  let hasVisitAnswer = false;
  for (const key of UP_SAVED_ANSWER_KEYS) {
    const value = textOrNull(record[key]) || "";
    visitAnswers[key] = value;
    if (value) hasVisitAnswer = true;
  }
  if (plantStatus && !visitAnswers.plant_status) visitAnswers.plant_status = plantStatus;
  return {
    data: {
      company_id: companyId,
      user_id: userId,
      region,
      state: stateForRegion(region),
      district: textOrNull(record.district),
      block: textOrNull(record.block),
      panchayat: textOrNull(record.panchayat),
      village: textOrNull(record.village || record.panchayat),
      ward_no: textOrNull(record.ward_no),
      ssl_id: sslId,
      pump_id: sslId,
      powerpack_id: sslId,
      offgrid_id: sslId,
      ongrid_id: sslId,
      scheme_name: textOrNull(record.scheme_name) || "",
      order_no: textOrNull(record.order_no) || "",
      uid_date: textOrNull(record.uid_date),
      installed_place: textOrNull(record.installed_place),
      unique_id: textOrNull(record.unique_id),
      uid: textOrNull(record.uid),
      pole_no: textOrNull(record.pole_no),
      work_order_no: textOrNull(record.work_order_no),
      capacity: textOrNull(record.capacity),
      fy_year: textOrNull(record.fy_year) || financialYearLabel(amcDate),
      amc_time: visitTime,
      amc_date: amcDate,
      next_amc_date: schedule.next_amc_date,
      period_start: periodStart,
      period_end: periodEnd,
      quarter_no: schedule.quarter_no,
      beneficiary_name: beneficiaryName,
      beneficiary_contact: beneficiaryContact,
      light_working: lightWorking,
      complaint_raised: lightWorking === "No",
      latitude,
      longitude,
      remarks: textOrNull(record.remarks),
      visit_answers: upStyle && (hasVisitAnswer || plantStatus)
        ? JSON.stringify(visitAnswers)
        : null,
    },
  };
};

export const importLightAmcs = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const region = requestRegion(req);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Choose an Excel file to import" });
    }

    const companyId = String(req.body?.company_id || req.query?.company_id || "").trim();
    const userId = resolveJwtUserId(req);
    if (!companyId || !userId) {
      return res.status(400).json({ success: false, message: "Company and admin login are required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return res.status(400).json({ success: false, message: "The Excel file has no sheet" });
    }
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const headers = (grid[0] || []).map(headerKey);
    const siteHeader = visitRegionProfile(region)?.site || "ssl_id";
    if (!headers.includes(siteHeader) || !headers.includes("amc_date")) {
      return res.status(400).json({
        success: false,
        message: `The first row must contain the template column names, including ${siteHeader} and amc_date`,
      });
    }

    const pending = [];
    grid.slice(1).forEach((values, index) => {
      const record = rowObject(headers, values);
      const blank = Object.values(record).every((value) => String(value ?? "").trim() === "");
      if (!blank) pending.push({ excelRow: index + 2, record });
    });
    if (!pending.length) {
      return res.status(400).json({ success: false, message: "The Excel file has no AMC rows" });
    }
    if (pending.length > 10000) {
      return res.status(400).json({ success: false, message: "Import up to 10000 rows at a time" });
    }

    pending.sort((a, b) => String(localISODate(a.record.amc_date) || "").localeCompare(String(localISODate(b.record.amc_date) || "")));

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const writeEvent = (payload) => {
      res.write(`${JSON.stringify(payload)}\n`);
      if (typeof res.flush === "function") res.flush();
    };

    const failed = [];
    let created = 0;
    const total = pending.length;
    writeEvent({ type: "progress", done: 0, total, created: 0, failed: 0 });

    for (const item of pending) {
      const built = await buildImportRecord({
        record: item.record,
        region,
        companyId,
        userId,
      });
      if (built.error) {
        failed.push({ row: item.excelRow, message: built.error });
      } else {
        await createLightAmc(built.data);
        created += 1;
      }
      writeEvent({
        type: "progress",
        done: created + failed.length,
        total,
        created,
        failed: failed.length,
      });
    }

    const message = created
      ? `Imported ${created} AMC record${created === 1 ? "" : "s"}${failed.length ? `. ${failed.length} row${failed.length === 1 ? "" : "s"} skipped.` : "."}`
      : "No AMC records were imported";
    writeEvent({
      type: "done",
      success: true,
      message,
      done: total,
      total,
      created,
      failed: failed.length,
      errors: failed.slice(0, 5),
    });
    return res.end();
  } catch (error) {
    console.error("IMPORT LIGHT AMC ERROR:", error);
    if (res.headersSent) {
      res.write(`${JSON.stringify({ type: "error", message: "Failed to import the Excel file" })}\n`);
      return res.end();
    }
    return res.status(500).json({ success: false, message: "Failed to import the Excel file" });
  }
};
