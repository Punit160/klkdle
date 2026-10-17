import * as XLSX from "xlsx";
import {
  createLightAmc,
  findLastLightAmc,
  findLightAmcById,
  lightAmcRegionOf,
  serializeLightAmc,
  updateLightAmcById,
} from "../../Model/DLE-Model/light-amc-model.js";
import { storedPathFromUploadedFile } from "../../Utils/amcStoredUploadPath.js";
import { resolveJwtUserId } from "../../Utils/requestUser.js";
import { isUserMasterAdmin } from "../../Utils/userRoles.js";

const stateForRegion = (region) => (region === "up" ? "Uttar Pradesh" : "Bihar");

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
        message: "region or state is required (bihar or up).",
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

    const lightWorking = String(body.light_working || existing.light_working || "Yes").trim();
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

    if (region === "up") {
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
    if (region === "up" && image3) data.image_3 = storedImage(image3);

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
        message: "region or state is required (bihar or up).",
      });
    }

    const headers = region === "up" ? UP_HEADERS : BIHAR_HEADERS;
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
    const filename = region === "up" ? "up-amc-import.xlsx" : "bihar-amc-import.xlsx";
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
  const sslId = textOrNull(record.ssl_id);
  const beneficiaryName = textOrNull(record.beneficiary_name);
  const beneficiaryContact = textOrNull(record.beneficiary_contact);
  const amcDate = localISODate(record.amc_date);
  if (!sslId || !beneficiaryName || !beneficiaryContact || !amcDate) {
    return { error: "ssl_id, beneficiary_name, beneficiary_contact, and amc_date are required" };
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

  const visitTime = region === "up" ? normalizeTime(record.amc_time) : null;
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
      ward_no: textOrNull(record.ward_no),
      ssl_id: sslId,
      unique_id: textOrNull(record.unique_id),
      uid: textOrNull(record.uid),
      pole_no: textOrNull(record.pole_no),
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
      visit_answers: region === "up" && (hasVisitAnswer || plantStatus)
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
        message: "region or state is required (bihar or up).",
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
    if (!headers.includes("ssl_id") || !headers.includes("amc_date")) {
      return res.status(400).json({
        success: false,
        message: "The first row must contain the template column names, including ssl_id and amc_date",
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
    if (pending.length > 1000) {
      return res.status(400).json({ success: false, message: "Import up to 1000 rows at a time" });
    }

    pending.sort((a, b) => String(localISODate(a.record.amc_date) || "").localeCompare(String(localISODate(b.record.amc_date) || "")));

    const failed = [];
    let created = 0;
    for (const item of pending) {
      const built = await buildImportRecord({
        record: item.record,
        region,
        companyId,
        userId,
      });
      if (built.error) {
        failed.push({ row: item.excelRow, message: built.error });
        continue;
      }
      await createLightAmc(built.data);
      created += 1;
    }

    return res.status(200).json({
      success: true,
      message: created
        ? `Imported ${created} AMC record${created === 1 ? "" : "s"}${failed.length ? `. ${failed.length} row${failed.length === 1 ? "" : "s"} skipped.` : "."}`
        : "No AMC records were imported",
      data: { created, failed },
    });
  } catch (error) {
    console.error("IMPORT LIGHT AMC ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to import the Excel file" });
  }
};
