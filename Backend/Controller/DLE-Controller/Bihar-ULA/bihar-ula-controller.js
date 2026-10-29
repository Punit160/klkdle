import path from "node:path";
import { Prisma } from "@prisma/client";
import prisma from "../../../Config/Prisma.js";
import { resolveStoredFileUrl } from "../../../Utils/publicUrl.js";
import { persistModuleUpload } from "../../../Utils/amcObjectStorage.js";
import { R2_PREFIX } from "../../../Utils/r2ObjectPrefixes.js";
import {
  parseR2StoredValue,
  readStoredFileBuffer,
} from "../../../Utils/objectStorage.js";
import { resolveJwtUserId } from "../../../Utils/requestUser.js";
import { findUserById } from "../../../Model/DLE-Model/dle-user-model.js";
import { isUserMasterAdmin } from "../../../Utils/userRoles.js";
import {
  AMC_DOC_APPROVAL,
  buildAmcApprovalUpdateData,
  serializeAmcApprovalFields,
} from "../../../Utils/amcApproval.js";

const surveyOwnedByUser = (row, userId) =>
  Boolean(row && userId && String(row.user_id) === String(userId));

const resolveJwtUserCompanyId = (req) =>
  String(req.user?.company_id || req.user?.companyId || "").trim();

const buildUlaExistingRecordSummary = (row) => {
  if (!row) return null;
  const first_visit_complete = firstVisitSaved(row);
  const second_visit_complete = secondVisitIsComplete(row);
  const solar_meter_on_first_visit = solarMeterCapturedOnFirstVisit(row);
  const visits_complete = siteVisitsAreComplete(row);
  let visit_status = "first_incomplete";
  if (visits_complete) visit_status = "complete";
  else if (first_visit_complete) visit_status = "second_pending";
  return {
    id: row.id?.toString?.() ?? String(row.id),
    ca_no: row.ca_no,
    first_visit_complete,
    second_visit_complete,
    solar_meter_on_first_visit,
    complete_visit: completeVisitFlag(row),
    visits_complete,
    visit_status,
  };
};

const parseUserIdBigInt = (userId) => {
  const raw = userId == null ? "" : String(userId).trim();
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
};

const collectSurveyUserIds = (rows) => {
  const ids = new Set();
  for (const row of rows) {
    if (row?.user_id) ids.add(String(row.user_id).trim());
    if (row?.user_id2) ids.add(String(row.user_id2).trim());
  }
  return [...ids].filter(Boolean);
};

const loadUserDisplayNames = async (userIds) => {
  const map = new Map();
  const bigintIds = [];

  for (const id of userIds) {
    const parsed = parseUserIdBigInt(id);
    if (parsed != null) bigintIds.push(parsed);
  }

  if (!bigintIds.length) return map;

  const users = await prisma.user.findMany({
    where: { id: { in: bigintIds } },
    select: { id: true, name: true, email: true },
  });

  for (const user of users) {
    const key = user.id?.toString?.() ?? String(user.id);
    const label = String(user.name || user.email || "").trim();
    if (!label) continue;
    map.set(key, label);
    if (/^\d+$/.test(key)) {
      try {
        map.set(BigInt(key).toString(), label);
      } catch {
        /* ignore */
      }
    }
  }

  return map;
};

const nameFromMap = (nameMap, userId) => {
  if (userId == null || userId === "") return null;
  const key = String(userId).trim();
  const fromDirect = nameMap.get(key);
  if (fromDirect) return fromDirect;
  if (/^\d+$/.test(key)) {
    try {
      return nameMap.get(BigInt(key).toString()) || null;
    } catch {
      return null;
    }
  }
  return null;
};

/** Resolve display name from `users` table by stored survey user id. */
const resolveUserDisplayName = async (userId) => {
  const id = parseUserIdBigInt(userId);
  if (id == null) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true },
    });
    if (!user) return null;
    const label = String(user.name || user.email || "").trim();
    return label || null;
  } catch (error) {
    console.warn("ULA user name lookup failed for id:", userId, error?.message);
    return null;
  }
};

const parseSurveyRemarksMeta = (remarks) => {
  try {
    const parsed = JSON.parse(remarks || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    /* plain-text remarks */
  }
  return {};
};

const mergeSurveyRemarksMeta = (existingRemarks, patch) => {
  const base = parseSurveyRemarksMeta(existingRemarks);
  const next = { ...base, ...patch };
  return JSON.stringify(next);
};

const applyUserNamesToSerialized = (serialized, row, nameMap) => {
  if (!serialized || !row) return serialized;
  const remarksMeta = parseSurveyRemarksMeta(row.remarks);

  serialized.user_name =
    nameFromMap(nameMap, row.user_id) ||
    serialized.user_name ||
    String(remarksMeta.surveyor_name || "").trim() ||
    null;
  serialized.user_name2 =
    nameFromMap(nameMap, row.user_id2) ||
    serialized.user_name2 ||
    String(remarksMeta.surveyor_name2 || "").trim() ||
    null;

  serialized.surveyor_name = String(remarksMeta.surveyor_name || "").trim() || null;
  serialized.surveyor_name2 = String(remarksMeta.surveyor_name2 || "").trim() || null;
  serialized.first_visit_surveyor =
    serialized.user_name || serialized.surveyor_name || null;
  serialized.second_visit_surveyor =
    serialized.user_name2 || serialized.surveyor_name2 || null;

  return serialized;
};

const enrichSurveysWithUserNames = async (req, rows) => {
  await attachApprovalFields(rows);
  const nameMap = await loadUserDisplayNames(collectSurveyUserIds(rows));
  const serializedList = rows.map((row) =>
    applyUserNamesToSerialized(serializeSurvey(req, row, nameMap), row, nameMap)
  );

  await Promise.all(
    serializedList.map(async (serialized, index) => {
      const row = rows[index];
      if (row.user_id && !serialized.user_name) {
        serialized.user_name = await resolveUserDisplayName(row.user_id);
      }
      if (row.user_id2 && !serialized.user_name2) {
        serialized.user_name2 = await resolveUserDisplayName(row.user_id2);
      }
      serialized.first_visit_surveyor =
        serialized.user_name || serialized.surveyor_name || null;
      serialized.second_visit_surveyor =
        serialized.user_name2 || serialized.surveyor_name2 || null;
    })
  );

  return serializedList;
};

const serializeSurveyResponse = async (req, row) => {
  const [serialized] = await enrichSurveysWithUserNames(req, [row]);
  return serialized;
};

const ULA_ZIP_IMAGE_FIELDS = [
  "panel_one_img",
  "panel_two_img",
  "inverter_img",
  "smart_meter_img",
  "acdb_img",
  "system_img",
  "solar_meter_img",
  "solar_meter_img2",
  "system_img2",
  "consent_form",
  "sim_img",
];

const zipEntryNameFromStored = (stored, fallbackBase) => {
  const r2Key = parseR2StoredValue(stored);
  if (r2Key) return path.basename(r2Key);
  const raw = String(stored || "").trim();
  if (raw.includes("/")) return path.basename(raw.split("?")[0]);
  return `${fallbackBase}.jpg`;
};

const secondVisitPhotosDone = (row) =>
  Boolean(
    String(row?.system_img2 ?? "").trim() &&
      String(row?.solar_meter_img2 ?? "").trim()
  );

const secondVisitIsComplete = (row) =>
  Boolean(row?.second_visit_at) || secondVisitPhotosDone(row);

const solarMeterCapturedOnFirstVisit = (row) =>
  Boolean(String(row?.solar_meter_img ?? "").trim());

const inverterCaptured = (row) =>
  Boolean(String(row?.inverter_no ?? "").trim() && String(row?.inverter_img ?? "").trim());

const flagIsTrue = (value) => value === true || value === 1 || value === "1";
const flagIsFalse = (value) => value === false || value === 0 || value === "0";

/** true, false, or null when this survey was saved before the complete-visit choice. */
const completeVisitFlag = (row) => {
  const flag = parseSurveyRemarksMeta(row?.remarks).complete_visit;
  if (flagIsTrue(flag)) return true;
  if (flagIsFalse(flag)) return false;
  return null;
};

const firstVisitSaved = (row) =>
  Boolean(String(row?.panel_one_img ?? "").trim() || String(row?.system_img ?? "").trim());

/** Older rows captured the inverter on the 1st visit and have no flag. */
const inverterOnFirstVisit = (row) => {
  const flag = parseSurveyRemarksMeta(row?.remarks).inverter_on_first_visit;
  if (flag === true || flag === 1 || flag === "1") return true;
  if (flag === false || flag === 0 || flag === "0") return false;
  return inverterCaptured(row);
};

/** ACDB, system, inverter, and a solar meter photo finish the site. */
const siteVisitsAreComplete = (row) => {
  const acdb = Boolean(String(row?.acdb_img ?? "").trim());
  const system = Boolean(String(row?.system_img ?? "").trim());
  return (
    firstVisitSaved(row) &&
    acdb &&
    system &&
    inverterCaptured(row) &&
    (solarMeterCapturedOnFirstVisit(row) || secondVisitPhotosDone(row))
  );
};

const isSecondVisitPendingRow = (row) =>
  firstVisitSaved(row) && !siteVisitsAreComplete(row);

const companiesMatch = (left, right) => {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    try {
      return BigInt(a) === BigInt(b);
    } catch {
      return false;
    }
  }
  return false;
};

const resolveUserCompanyFromDb = async (userId) => {
  const uid = parseUserIdBigInt(userId);
  if (uid == null) return "";
  try {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { company_id: true },
    });
    return String(user?.company_id ?? "").trim();
  } catch {
    return "";
  }
};

const requesterIsAdmin = async (req) => {
  if (req.user?.role != null && req.user.role !== "") {
    return isUserMasterAdmin({ role: req.user.role });
  }
  const userId = resolveJwtUserId(req);
  if (!userId) return false;
  const user = await findUserById(userId);
  return isUserMasterAdmin(user);
};

/** Owner, same company, admin, or any ULA user when 2nd visit is pending (team completion). */
const surveyAccessibleByDleUser = async (req, row) => {
  const userId = resolveJwtUserId(req);
  if (!row || !userId) return false;
  if (await requesterIsAdmin(req)) return true;
  if (surveyOwnedByUser(row, userId)) return true;
  if (isSecondVisitPendingRow(row)) return true;

  let userCompany = resolveJwtUserCompanyId(req);
  if (!userCompany) {
    userCompany = await resolveUserCompanyFromDb(userId);
  }
  const rowCompany = String(row.company_id || "").trim();
  return companiesMatch(userCompany, rowCompany);
};

/** Completed 2nd visits saved before `second_visit_at` existed may only have updated_at. */
const resolveSecondVisitAt = (row) => {
  if (!row) return null;
  if (row.second_visit_at) return row.second_visit_at;
  if (!secondVisitIsComplete(row)) return null;

  const meta = parseSurveyRemarksMeta(row.remarks);
  const fromRemarks = meta.second_visit_at || meta.second_visit_at_iso;
  if (fromRemarks) {
    const d = new Date(fromRemarks);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return row.updated_at || row.created_at || null;
};

const collectUlaImageEntries = (row) => {
  const entries = [];
  for (const field of ULA_ZIP_IMAGE_FIELDS) {
    const stored = row[field];
    if (!stored) continue;
    entries.push({
      stored,
      zipName: zipEntryNameFromStored(stored, field),
    });
  }
  try {
    const parsed = JSON.parse(row.remarks || "{}");
    if (parsed?.structure_img) {
      entries.push({
        stored: parsed.structure_img,
        zipName: zipEntryNameFromStored(parsed.structure_img, "structure_img"),
      });
    }
  } catch {
    /* plain text remarks */
  }
  return entries;
};

const serializeSurvey = (req, row, nameMap = new Map()) => {
  if (!row) return null;

  const url = (field) => resolveStoredFileUrl(req, row[field]);

  let structure_img_url = null;
  try {
    const parsed = JSON.parse(row.remarks || "{}");
    if (parsed && typeof parsed === "object") {
      structure_img_url = resolveStoredFileUrl(req, parsed.structure_img);
    }
  } catch {
    // plain text remarks
  }

  return {
    id: row.id?.toString?.() ?? String(row.id),
    company_id: row.company_id,
    ca_no: row.ca_no,
    ca_name: row.ca_name,
    beneficiary_name: row.beneficiary_name,
    beneficiary_contact: row.beneficiary_contact,
    state: row.state,
    district: row.district,
    block: row.block,
    panchayat: row.panchayat,
    village: row.village,
    survey_date: row.survey_date,
    panel_one_img: row.panel_one_img,
    panel_one_no: row.panel_one_no,
    panel_two_img: row.panel_two_img,
    panel_two_no: row.panel_two_no,
    inverter_img: row.inverter_img,
    inverter_no: row.inverter_no,
    smart_meter_img: row.smart_meter_img,
    acdb_img: row.acdb_img,
    system_img: row.system_img,
    solar_meter_img: row.solar_meter_img,
    solar_meter_img2: row.solar_meter_img2,
    system_img2: row.system_img2,
    latitude: row.latitude,
    longitude: row.longitude,
    latitude2: row.latitude2,
    longitude2: row.longitude2,
    user_id: row.user_id,
    user_name: nameFromMap(nameMap, row.user_id),
    user_id2: row.user_id2,
    user_name2: nameFromMap(nameMap, row.user_id2),
    second_visit_at: resolveSecondVisitAt(row),
    modification: row.modification,
    visit1_note: String(parseSurveyRemarksMeta(row.remarks).visit1_note || "").trim() || null,
    visit2_note: String(parseSurveyRemarksMeta(row.remarks).visit2_note || "").trim() || null,
    remarks: row.remarks,
    structure_img_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    panel_one_img_url: url("panel_one_img"),
    panel_two_img_url: url("panel_two_img"),
    inverter_img_url: url("inverter_img"),
    smart_meter_img_url: url("smart_meter_img"),
    acdb_img_url: url("acdb_img"),
    system_img_url: url("system_img"),
    solar_meter_img_url: url("solar_meter_img"),
    solar_meter_img2_url: url("solar_meter_img2"),
    system_img2_url: url("system_img2"),
    consent_form: row.consent_form || null,
    consent_form_url: url("consent_form"),
    imei_no: row.imei_no || null,
    sim_img: row.sim_img || null,
    sim_img_url: url("sim_img"),
    first_visit_complete: firstVisitSaved(row),
    second_visit_complete: secondVisitIsComplete(row),
    solar_meter_on_first_visit: solarMeterCapturedOnFirstVisit(row),
    complete_visit: completeVisitFlag(row),
    inverter_on_first_visit: inverterOnFirstVisit(row),
    second_visit_required: isSecondVisitPendingRow(row),
    visits_complete: siteVisitsAreComplete(row),
    ...serializeAmcApprovalFields(row),
  };
};

const parseSurveyDate = (value) => {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const clip = (value, maxLen) => {
  const text = String(value ?? "").trim();
  if (!text) return text;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
};

const digitsOnly = (value, maxLen) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLen);

/** CA / consumer account number — digits only. */
const parseCaNo = (raw) => {
  const ca = digitsOnly(raw, 20);
  if (!ca) {
    return { ok: false, message: "CA number is required." };
  }
  if (ca.length < 4) {
    return { ok: false, message: "CA number must be at least 4 digits." };
  }
  return { ok: true, value: ca };
};

/** Unique check API — skip CA when field is empty or still being typed. */
const parseCaNoForUniqueQuery = (raw) => {
  const ca = digitsOnly(raw, 20);
  if (!ca) {
    return { ok: true, value: null, validationMessage: null };
  }
  if (ca.length < 4) {
    return {
      ok: true,
      value: null,
      validationMessage: null,
      partial: true,
    };
  }
  return { ok: true, value: ca, validationMessage: null };
};

/** Indian mobile — 10 digits, starts with 6–9. Empty → "-". */
const parseBeneficiaryMobile = (raw) => {
  const mobile = digitsOnly(raw, 10);
  if (!mobile) {
    return {
      ok: false,
      message: "Beneficiary contact is required (minimum 10 digits).",
    };
  }
  if (mobile.length < 10) {
    return {
      ok: false,
      message: `Beneficiary contact must be at least 10 digits (entered ${mobile.length}).`,
    };
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return {
      ok: false,
      message:
        "Beneficiary contact must be exactly 10 digits (mobile starting with 6–9).",
    };
  }
  return { ok: true, value: mobile };
};

/** Unique check API — validate contact only when 10 digits are present. */
const parseBeneficiaryMobileForUniqueQuery = (raw) => {
  const mobile = digitsOnly(raw, 10);
  if (!mobile) {
    return { ok: true, value: null, validationMessage: null };
  }
  if (mobile.length < 10) {
    return {
      ok: true,
      value: null,
      validationMessage: null,
      partial: true,
    };
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return {
      ok: false,
      value: null,
      validationMessage:
        "Beneficiary contact must be exactly 10 digits (mobile starting with 6–9).",
    };
  }
  return { ok: true, value: mobile, validationMessage: null };
};

const normalizeUlaSerialNumber = (raw) => {
  const value = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
  return value || null;
};

const findUlaPanelSerialConflict = async (field, serial, excludeSurveyId = null) => {
  if (!serial) return null;
  const existing = await prisma.biharUlaSurvey.findFirst({
    where: {
      OR: [{ panel_one_no: serial }, { panel_two_no: serial }],
      ...(await notRejectedSurveyFilter()),
      ...excludeSurveyIdFilter(excludeSurveyId),
    },
    select: { id: true, ca_no: true },
  });
  if (!existing) return null;
  return {
    field,
    message: `This panel serial number is already registered for CA ${existing.ca_no}. A panel number can be used only once.`,
    existing_id: existing.id?.toString?.() ?? String(existing.id),
    existing_ca_no: existing.ca_no,
  };
};

const findUlaSerialConflict = async (
  field,
  column,
  serial,
  label,
  excludeSurveyId = null
) => {
  if (!serial) return null;
  const existing = await prisma.biharUlaSurvey.findFirst({
    where: {
      [column]: serial,
      ...(await notRejectedSurveyFilter()),
      ...excludeSurveyIdFilter(excludeSurveyId),
    },
    select: { id: true, ca_no: true, [column]: true },
  });
  if (!existing) return null;
  return {
    field,
    message: `This ${label} is already registered for CA ${existing.ca_no}.`,
    existing_id: existing.id?.toString?.() ?? String(existing.id),
    existing_ca_no: existing.ca_no,
  };
};

/** True when this process was started after `prisma generate` included approval columns. */
const ulaClientHasApprovalField = () => {
  const model = Prisma.dmmf?.datamodel?.models?.find((item) => item.name === "BiharUlaSurvey");
  return Boolean(model?.fields?.some((field) => field.name === "approval_status"));
};

let ulaApprovalColumnsReady = false;

/** Live servers can be running a Prisma client generated before these columns existed. */
const ensureUlaApprovalColumns = async () => {
  if (ulaApprovalColumnsReady) return;
  const columns = await prisma.$queryRaw`
    SHOW COLUMNS FROM bihar_ula_site_survey LIKE 'approval_status'
  `;
  if (!Array.isArray(columns) || columns.length === 0) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`bihar_ula_site_survey\`
        ADD COLUMN \`approval_status\` TINYINT NOT NULL DEFAULT 0,
        ADD COLUMN \`approval_date\` TIMESTAMP(0) NULL,
        ADD COLUMN \`approval_remarks\` TEXT NULL,
        ADD COLUMN \`approval_by\` VARCHAR(255) NULL
    `);
  }
  ulaApprovalColumnsReady = true;
};

/**
 * Pending and approved surveys keep CA, panel, inverter, and GPS unique. Rejected rows do not.
 * When the generated client has no approval_status field, exclude rejected ids with raw SQL.
 */
const notRejectedSurveyFilter = async () => {
  if (ulaClientHasApprovalField()) {
    return { approval_status: { not: AMC_DOC_APPROVAL.REJECTED } };
  }
  await ensureUlaApprovalColumns();
  const rejected = await prisma.$queryRaw`
    SELECT id FROM bihar_ula_site_survey
    WHERE approval_status = ${AMC_DOC_APPROVAL.REJECTED}
  `;
  const ids = (Array.isArray(rejected) ? rejected : [])
    .map((row) => row.id)
    .filter((id) => id != null);
  if (!ids.length) return {};
  return { id: { notIn: ids } };
};

/** Fill approval fields when the running Prisma client does not select them. */
const attachApprovalFields = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const missing = rows.some(
    (row) => row && !Object.prototype.hasOwnProperty.call(row, "approval_status")
  );
  if (!missing) return;
  await ensureUlaApprovalColumns();
  const ids = rows.map((row) => row?.id).filter((id) => id != null);
  if (!ids.length) return;
  const extras = await prisma.$queryRaw`
    SELECT id, approval_status, approval_date, approval_remarks, approval_by
    FROM bihar_ula_site_survey
    WHERE id IN (${Prisma.join(ids)})
  `;
  const byId = new Map(
    (Array.isArray(extras) ? extras : []).map((row) => [String(row.id), row])
  );
  for (const row of rows) {
    const extra = byId.get(String(row?.id));
    if (!extra) continue;
    row.approval_status = Number(extra.approval_status ?? 0);
    row.approval_date = extra.approval_date ?? null;
    row.approval_remarks = extra.approval_remarks ?? null;
    row.approval_by = extra.approval_by ?? null;
  }
};

/** Six decimal places — same precision the survey form stores from GPS. */
const normalizeGpsCoord = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return value.toFixed(6);
};

const parseGpsPair = (latRaw, lngRaw) => {
  const latitude = normalizeGpsCoord(latRaw);
  const longitude = normalizeGpsCoord(lngRaw);
  if (!latitude || !longitude) {
    return { ok: false, message: "Latitude and longitude are required." };
  }
  const latNum = Number(latitude);
  const lngNum = Number(longitude);
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return { ok: false, message: "Latitude or longitude is out of range." };
  }
  return { ok: true, latitude, longitude, latNum, lngNum };
};

/**
 * Another non-rejected site already uses this pin (1st or 2nd visit).
 * The same site may reuse its own coordinates on the 2nd visit.
 */
const findUlaGpsConflict = async (latitude, longitude, excludeSurveyId = null) => {
  const parsed = parseGpsPair(latitude, longitude);
  if (!parsed.ok) return null;
  await ensureUlaApprovalColumns();

  let excludeId = null;
  if (excludeSurveyId != null && excludeSurveyId !== "") {
    try {
      excludeId = BigInt(excludeSurveyId);
    } catch {
      excludeId = null;
    }
  }

  const lat = parsed.latNum;
  const lng = parsed.lngNum;
  const rows = excludeId
    ? await prisma.$queryRaw`
        SELECT id, ca_no
        FROM bihar_ula_site_survey
        WHERE approval_status <> ${AMC_DOC_APPROVAL.REJECTED}
          AND id <> ${excludeId}
          AND (
            (
              latitude IS NOT NULL AND latitude <> ''
              AND longitude IS NOT NULL AND longitude <> ''
              AND ABS((latitude + 0) - ${lat}) < 0.0000005
              AND ABS((longitude + 0) - ${lng}) < 0.0000005
            )
            OR (
              latitude2 IS NOT NULL AND latitude2 <> ''
              AND longitude2 IS NOT NULL AND longitude2 <> ''
              AND ABS((latitude2 + 0) - ${lat}) < 0.0000005
              AND ABS((longitude2 + 0) - ${lng}) < 0.0000005
            )
          )
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, ca_no
        FROM bihar_ula_site_survey
        WHERE approval_status <> ${AMC_DOC_APPROVAL.REJECTED}
          AND (
            (
              latitude IS NOT NULL AND latitude <> ''
              AND longitude IS NOT NULL AND longitude <> ''
              AND ABS((latitude + 0) - ${lat}) < 0.0000005
              AND ABS((longitude + 0) - ${lng}) < 0.0000005
            )
            OR (
              latitude2 IS NOT NULL AND latitude2 <> ''
              AND longitude2 IS NOT NULL AND longitude2 <> ''
              AND ABS((latitude2 + 0) - ${lat}) < 0.0000005
              AND ABS((longitude2 + 0) - ${lng}) < 0.0000005
            )
          )
        LIMIT 1
      `;

  const existing = Array.isArray(rows) ? rows[0] : null;
  if (!existing) return null;
  return {
    field: "gps",
    message: `These coordinates are already used for CA ${existing.ca_no}. Each site must have its own latitude and longitude.`,
    existing_id: existing.id?.toString?.() ?? String(existing.id),
    existing_ca_no: existing.ca_no,
  };
};

/** Safe folder segment: klkdle/biharula/{ca_no}/panel_one_img.jpg (flat — no subfolders per photo). */
const excludeSurveyIdFilter = (excludeSurveyId) => {
  if (excludeSurveyId == null || excludeSurveyId === "") return {};
  try {
    return { id: { not: BigInt(excludeSurveyId) } };
  } catch {
    return {};
  }
};

const ulaActiveValueKey = (kind, raw) => {
  const value =
    kind === "panel" || kind === "inverter"
      ? normalizeUlaSerialNumber(raw)
      : String(raw ?? "").trim();
  if (!value || value === "-") return null;
  return `${kind}:${value}`;
};

const ulaActiveValueKeysForRow = (row) => {
  const keys = [
    ulaActiveValueKey("ca", row?.ca_no),
    ulaActiveValueKey("phone", row?.beneficiary_contact),
    ulaActiveValueKey("panel", row?.panel_one_no),
    ulaActiveValueKey("panel", row?.panel_two_no),
    ulaActiveValueKey("inverter", row?.inverter_no),
  ].filter(Boolean);
  return [...new Set(keys)];
};

const ulaActiveValueLabel = (key) => {
  if (String(key).startsWith("ca:")) return "CA number";
  if (String(key).startsWith("phone:")) return "beneficiary contact";
  if (String(key).startsWith("panel:")) return "panel serial number";
  if (String(key).startsWith("inverter:")) return "inverter serial number";
  return "value";
};

let ulaActiveValueTableReady = false;

/** One active CA, phone, panel serial, or inverter serial. Rejected surveys release their values. */
const ensureUlaActiveValueTable = async () => {
  if (ulaActiveValueTableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS bihar_ula_active_value (
      value_key VARCHAR(320) NOT NULL,
      survey_id BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (value_key),
      KEY bihar_ula_active_value_survey_idx (survey_id)
    )
  `);
  await prisma.$executeRawUnsafe(`
    INSERT IGNORE INTO bihar_ula_active_value (value_key, survey_id)
    SELECT CONCAT('ca:', ca_key), survey_id
    FROM (
      SELECT TRIM(ca_no) AS ca_key, MIN(id) AS survey_id
      FROM bihar_ula_site_survey
      WHERE approval_status <> 2 AND ca_no IS NOT NULL AND TRIM(ca_no) <> ''
      GROUP BY TRIM(ca_no)
    ) grouped
  `);
  await prisma.$executeRawUnsafe(`
    INSERT IGNORE INTO bihar_ula_active_value (value_key, survey_id)
    SELECT CONCAT('phone:', phone_key), survey_id
    FROM (
      SELECT TRIM(beneficiary_contact) AS phone_key, MIN(id) AS survey_id
      FROM bihar_ula_site_survey
      WHERE approval_status <> 2
        AND beneficiary_contact IS NOT NULL
        AND TRIM(beneficiary_contact) <> ''
        AND TRIM(beneficiary_contact) <> '-'
      GROUP BY TRIM(beneficiary_contact)
    ) grouped
  `);
  await prisma.$executeRawUnsafe(`
    INSERT IGNORE INTO bihar_ula_active_value (value_key, survey_id)
    SELECT value_key, MIN(survey_id)
    FROM (
      SELECT CONCAT('panel:', TRIM(panel_one_no)) AS value_key, id AS survey_id
      FROM bihar_ula_site_survey
      WHERE approval_status <> 2 AND panel_one_no IS NOT NULL AND TRIM(panel_one_no) <> ''
      UNION ALL
      SELECT CONCAT('panel:', TRIM(panel_two_no)) AS value_key, id AS survey_id
      FROM bihar_ula_site_survey
      WHERE approval_status <> 2 AND panel_two_no IS NOT NULL AND TRIM(panel_two_no) <> ''
    ) panels
    GROUP BY value_key
  `);
  await prisma.$executeRawUnsafe(`
    INSERT IGNORE INTO bihar_ula_active_value (value_key, survey_id)
    SELECT CONCAT('inverter:', inverter_key), survey_id
    FROM (
      SELECT TRIM(inverter_no) AS inverter_key, MIN(id) AS survey_id
      FROM bihar_ula_site_survey
      WHERE approval_status <> 2 AND inverter_no IS NOT NULL AND TRIM(inverter_no) <> ''
      GROUP BY TRIM(inverter_no)
    ) grouped
  `);
  ulaActiveValueTableReady = true;
};

const isDuplicateKeyError = (error) =>
  error?.code === "P2002" || /Duplicate entry/i.test(String(error?.message || ""));

const duplicateUlaValueError = async (tx, key) => {
  const rows = await tx.$queryRaw`
    SELECT s.ca_no
    FROM bihar_ula_active_value v
    LEFT JOIN bihar_ula_site_survey s ON s.id = v.survey_id
    WHERE v.value_key = ${key}
    LIMIT 1
  `;
  const ca = rows?.[0]?.ca_no || "another site";
  const message = String(key).startsWith("ca:")
    ? "This CA number is already registered. The 2nd visit updates that same site and does not create a new entry."
    : String(key).startsWith("panel:")
      ? `This panel serial number is already registered for CA ${ca}. A panel number can be used only once.`
      : `This ${ulaActiveValueLabel(key)} is already registered for CA ${ca}.`;
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const syncUlaActiveValues = async (tx, row) => {
  const id = BigInt(row.id);
  await tx.$executeRaw`DELETE FROM bihar_ula_active_value WHERE survey_id = ${id}`;
  if (Number(row.approval_status ?? 0) === AMC_DOC_APPROVAL.REJECTED) return;
  for (const key of ulaActiveValueKeysForRow(row)) {
    try {
      await tx.$executeRaw`
        INSERT INTO bihar_ula_active_value (value_key, survey_id)
        VALUES (${key}, ${id})
      `;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      throw await duplicateUlaValueError(tx, key);
    }
  }
};

const ulaDuplicateConflictMessage = () =>
  "This CA number, contact, or equipment serial is already registered. The 2nd visit updates the same site and does not create a new entry.";

const findUlaRegistrationConflicts = async ({
  caNo,
  beneficiaryContact,
  panelOneNo,
  panelTwoNo,
  inverterNo,
  latitude = null,
  longitude = null,
  excludeSurveyId = null,
}) => {
  const conflicts = [];
  const notSelf = excludeSurveyIdFilter(excludeSurveyId);

  if (caNo) {
    const byCa = await prisma.biharUlaSurvey.findFirst({
      where: { ca_no: String(caNo), ...(await notRejectedSurveyFilter()), ...notSelf },
      select: { id: true, ca_no: true },
    });
    if (byCa) {
      conflicts.push({
        field: "ca_no",
        message:
          "This CA number is already registered. Check visit status below or complete the 2nd visit.",
        existing_id: byCa.id?.toString?.() ?? String(byCa.id),
        existing_ca_no: byCa.ca_no,
      });
    }
  }

  if (beneficiaryContact) {
    const byContact = await prisma.biharUlaSurvey.findFirst({
      where: {
        beneficiary_contact: String(beneficiaryContact),
        ...(await notRejectedSurveyFilter()),
        ...notSelf,
      },
      select: { id: true, ca_no: true, beneficiary_contact: true },
    });
    if (byContact) {
      conflicts.push({
        field: "beneficiary_contact",
        message: `This beneficiary contact is already registered for CA ${byContact.ca_no}.`,
        existing_id: byContact.id?.toString?.() ?? String(byContact.id),
        existing_ca_no: byContact.ca_no,
      });
    }
  }

  const panelOne = normalizeUlaSerialNumber(panelOneNo);
  const panelTwo = normalizeUlaSerialNumber(panelTwoNo);
  const inverter = normalizeUlaSerialNumber(inverterNo);

  if (panelOne && panelTwo && panelOne === panelTwo) {
    conflicts.push({
      field: "panel_two_no",
      message: "Panel 1 and Panel 2 serial numbers must be different.",
    });
  }

  for (const entry of [
    ["panel_one_no", panelOne],
    ["panel_two_no", panelTwo],
  ]) {
    const conflict = await findUlaPanelSerialConflict(entry[0], entry[1], excludeSurveyId);
    if (conflict) conflicts.push(conflict);
  }

  const inverterConflict = await findUlaSerialConflict(
    "inverter_no",
    "inverter_no",
    inverter,
    "inverter serial number",
    excludeSurveyId
  );
  if (inverterConflict) conflicts.push(inverterConflict);

  if (String(latitude ?? "").trim() && String(longitude ?? "").trim()) {
    const gpsConflict = await findUlaGpsConflict(latitude, longitude, excludeSurveyId);
    if (gpsConflict) conflicts.push(gpsConflict);
  }

  return conflicts;
};

export const checkBiharUlaUniqueController = async (req, res) => {
  try {
    const caParsed = parseCaNoForUniqueQuery(req.query.ca_no);
    const mobileParsed = parseBeneficiaryMobileForUniqueQuery(
      req.query.beneficiary_contact
    );

    if (!mobileParsed.ok) {
      return res.json({
        success: true,
        available: false,
        conflicts: [],
        validation: {
          ca_no: null,
          beneficiary_contact: mobileParsed.validationMessage,
        },
      });
    }

    const conflicts = await findUlaRegistrationConflicts({
      caNo: caParsed.value,
      beneficiaryContact: mobileParsed.value,
      panelOneNo: req.query.panel_one_no,
      panelTwoNo: req.query.panel_two_no,
      inverterNo: req.query.inverter_no,
      latitude: req.query.latitude,
      longitude: req.query.longitude,
      excludeSurveyId: req.query.exclude_id,
    });

    let existing_record = null;
    let existing_survey = null;
    const caConflict = conflicts.find((c) => c.field === "ca_no" && c.existing_id);
    if (caConflict?.existing_id) {
      try {
        const row = await prisma.biharUlaSurvey.findUnique({
          where: { id: BigInt(caConflict.existing_id) },
        });
        existing_record = buildUlaExistingRecordSummary(row);
        if (
          row &&
          existing_record?.visit_status === "second_pending" &&
          (await surveyAccessibleByDleUser(req, row))
        ) {
          existing_survey = await serializeSurveyResponse(req, row);
        }
      } catch {
        existing_record = null;
        existing_survey = null;
      }
    }

    return res.json({
      success: true,
      available: conflicts.length === 0,
      conflicts,
      existing_record,
      existing_survey,
      validation: {
        ca_no: caParsed.validationMessage || null,
        beneficiary_contact: mobileParsed.validationMessage || null,
        panel_one_no: null,
        panel_two_no: null,
        inverter_no: null,
      },
    });
  } catch (error) {
    console.error("BIHAR ULA UNIQUE CHECK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not verify CA / contact uniqueness.",
    });
  }
};

export const sanitizeUlaCaFolder = (caNo) => {
  const cleaned = String(caNo || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);

  return cleaned || "unknown-ca";
};

const persistFileField = async (file, caNo, objectBasename) => {
  if (!file) return null;
  const caFolder = sanitizeUlaCaFolder(caNo);
  const prefix = `${R2_PREFIX.BIHAR_ULA}/${caFolder}`;

  const result = await persistModuleUpload({
    file,
    r2Prefix: prefix,
    localRelativeFolder: `bihar/ula/${caFolder}`,
    moduleLabel: "Bihar ULA",
    fixedBasename: objectBasename,
  });
  return result.storedValue;
};

const VISIT1_FILE_MAP = [
  ["panel_one_img", "panel_one_img"],
  ["panel_two_img", "panel_two_img"],
  ["inverter_img", "inverter_img"],
  ["smart_meter_img", "smart_meter_img"],
  ["acdb_img", "acdb_img"],
  ["system_img", "system_img"],
  ["solar_meter_img", "solar_meter_img"],
];

export const createBiharUlaFirstVisit = async (req, res) => {
  try {
    const userId = resolveJwtUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required. User id could not be read from your session token.",
      });
    }
    const companyIdResolved = String(
      req.body.company_id || req.user?.company_id || req.user?.companyId || ""
    ).trim();

    const {
      ca_no,
      ca_name,
      beneficiary_name,
      beneficiary_contact,
      district,
      block,
      panchayat,
      village,
      survey_date,
      panel_one_no,
      panel_two_no,
      inverter_no,
      latitude,
      longitude,
      complete_visit,
      remarks: visit1NoteBody,
    } = req.body;

    if (!companyIdResolved || !ca_name?.trim()) {
      return res.status(422).json({
        success: false,
        message: "company_id, ca_no, and ca_name are required.",
      });
    }

    const caParsed = parseCaNo(ca_no);
    if (!caParsed.ok) {
      return res.status(422).json({ success: false, message: caParsed.message });
    }

    const mobileParsed = parseBeneficiaryMobile(beneficiary_contact);
    if (!mobileParsed.ok) {
      return res.status(422).json({ success: false, message: mobileParsed.message });
    }

    if (!String(village || "").trim()) {
      return res.status(422).json({
        success: false,
        message: "village is required.",
      });
    }

    const caNoNormalized = caParsed.value;
    const panelOneNormalized = normalizeUlaSerialNumber(panel_one_no);
    const panelTwoNormalized = normalizeUlaSerialNumber(panel_two_no);
    const completeVisit =
      String(complete_visit).toLowerCase() === "true" ||
      complete_visit === "1" ||
      complete_visit === 1 ||
      complete_visit === true;
    const inverterWanted = completeVisit;
    const inverterNormalized = inverterWanted ? normalizeUlaSerialNumber(inverter_no) : null;

    if (!panelOneNormalized || !panelTwoNormalized) {
      return res.status(422).json({
        success: false,
        message: "Panel 1 and Panel 2 serial numbers are required on 1st visit.",
      });
    }
    if (inverterWanted && !inverterNormalized) {
      return res.status(422).json({
        success: false,
        message: "Inverter serial number is required when the inverter is captured on the 1st visit.",
      });
    }

    const gpsParsed = parseGpsPair(latitude, longitude);
    if (!gpsParsed.ok) {
      return res.status(422).json({ success: false, message: gpsParsed.message });
    }

    const conflicts = await findUlaRegistrationConflicts({
      caNo: caNoNormalized,
      beneficiaryContact: mobileParsed.value,
      panelOneNo: panelOneNormalized,
      panelTwoNo: panelTwoNormalized,
      inverterNo: inverterNormalized || null,
      latitude: gpsParsed.latitude,
      longitude: gpsParsed.longitude,
    });

    if (conflicts.length) {
      const primary = conflicts[0];
      return res.status(409).json({
        success: false,
        message: primary.message,
        conflicts,
        data: primary.existing_id ? { id: primary.existing_id } : undefined,
      });
    }

    const caFolderKey = sanitizeUlaCaFolder(caNoNormalized);
    const files = req.files || {};

    const uploadJobs = VISIT1_FILE_MAP.map(async ([fieldName, objectBasename]) => {
      const file = files[fieldName]?.[0];
      if (!file) return null;
      return [fieldName, await persistFileField(file, caFolderKey, objectBasename)];
    });

    const structureFile = files.structure_img?.[0];
    if (structureFile) {
      uploadJobs.push(
        persistFileField(structureFile, caFolderKey, "structure_img").then((storedPath) => [
          "structure_img",
          storedPath,
        ])
      );
    }

    const stored = {};
    for (const entry of await Promise.all(uploadJobs)) {
      if (!entry) continue;
      stored[entry[0]] = entry[1];
    }
    const structurePath = stored.structure_img || null;

    const required = [
      "panel_one_img",
      "panel_two_img",
      "smart_meter_img",
      ...(completeVisit ? ["acdb_img", "system_img", "solar_meter_img", "inverter_img"] : []),
    ];

    const missing = required.filter((key) => !stored[key]);
    if (missing.length) {
      return res.status(422).json({
        success: false,
        message: `Missing required photos: ${missing.join(", ")}`,
      });
    }

    if (!structurePath) {
      return res.status(422).json({
        success: false,
        message: "Structure & earthing photo (structure_img) is required.",
      });
    }

    if (completeVisit && !stored.solar_meter_img) {
      return res.status(422).json({
        success: false,
        message: "Solar meter photo is required when Complete visit is selected.",
      });
    }

    if (inverterWanted && !stored.inverter_img) {
      return res.status(422).json({
        success: false,
        message: "Inverter photo is required when the inverter is captured on the 1st visit.",
      });
    }

    const surveyorName = await resolveUserDisplayName(userId);
    await ensureUlaActiveValueTable();
    const created = await prisma.$transaction(async (tx) => {
      const already = await tx.biharUlaSurvey.findFirst({
        where: {
          ca_no: clip(caNoNormalized, 100),
          approval_status: { not: AMC_DOC_APPROVAL.REJECTED },
        },
        select: { id: true, ca_no: true },
      });
      if (already) {
        const error = new Error(
          "This CA number is already registered. The 2nd visit updates that same site and does not create a new entry."
        );
        error.statusCode = 409;
        throw error;
      }
      const row = await tx.biharUlaSurvey.create({
      data: {
        company_id: clip(companyIdResolved, 100),
        ca_no: clip(caNoNormalized, 100),
        ca_name: clip(ca_name, 100),
        beneficiary_name: clip(beneficiary_name || ca_name, 255),
        beneficiary_contact: clip(mobileParsed.value, 20),
        state: "Bihar",
        district: district?.trim() || null,
        block: block?.trim() || null,
        panchayat: panchayat?.trim() || null,
        village: clip(String(village).trim(), 255),
        survey_date: parseSurveyDate(survey_date),
        panel_one_img: stored.panel_one_img,
        panel_one_no: panelOneNormalized,
        panel_two_img: stored.panel_two_img,
        panel_two_no: panelTwoNormalized,
        inverter_img: inverterWanted ? stored.inverter_img : null,
        inverter_no: inverterWanted ? inverterNormalized : null,
        smart_meter_img: stored.smart_meter_img,
        acdb_img: completeVisit ? stored.acdb_img : null,
        system_img: completeVisit ? stored.system_img : null,
        solar_meter_img: completeVisit ? stored.solar_meter_img || null : null,
        latitude: gpsParsed.latitude,
        longitude: gpsParsed.longitude,
        user_id: clip(String(userId).trim(), 50),
        modification: null,
        remarks: mergeSurveyRemarksMeta(null, {
          structure_img: structurePath,
          surveyor_name: surveyorName,
          complete_visit: Boolean(completeVisit),
          inverter_on_first_visit: Boolean(inverterWanted),
          ...(clip(visit1NoteBody, 500)
            ? { visit1_note: clip(visit1NoteBody, 500) }
            : {}),
        }),
      },
    });
      await syncUlaActiveValues(tx, row);
      return row;
    });

    return res.status(201).json({
      success: true,
      message: "Bihar ULA 1st visit saved successfully.",
      data: await serializeSurveyResponse(req, created),
    });
  } catch (error) {
    console.error("BIHAR ULA CREATE ERROR:", error);
    const code = error?.code;
    if (code === "P2002" || isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message: ulaDuplicateConflictMessage(),
      });
    }
    if (code === "P2000") {
      return res.status(422).json({
        success: false,
        message: "One of the fields is too long for the database. Shorten CA name or contact and try again.",
      });
    }
    if (code === "P2021") {
      return res.status(503).json({
        success: false,
        message:
          "ULA database table is missing on the server. Run Prisma migrate deploy or db push for bihar_ula_site_survey.",
      });
    }
    const status = error?.statusCode && Number(error.statusCode) < 600 ? Number(error.statusCode) : 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to save ULA 1st visit.",
    });
  }
};

export const updateBiharUlaSecondVisit = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = resolveJwtUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required. User id could not be read from your session token.",
      });
    }

    if (!id) {
      return res.status(422).json({ success: false, message: "Record id is required." });
    }

    const existing = await prisma.biharUlaSurvey.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }

    if (!(await surveyAccessibleByDleUser(req, existing))) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to update this ULA record.",
      });
    }

    if (!firstVisitSaved(existing)) {
      return res.status(422).json({
        success: false,
        message: "1st visit is not completed for this CA yet.",
      });
    }

    if (siteVisitsAreComplete(existing)) {
      return res.status(409).json({
        success: false,
        message: completeVisitFlag(existing) === true
          ? "2nd visit is not required. Complete visit was already saved on the 1st visit."
          : solarMeterCapturedOnFirstVisit(existing)
            ? "2nd visit is not required. The solar meter and inverter were already captured on the 1st visit."
            : "2nd visit is already completed for this record.",
      });
    }

    const deferred = completeVisitFlag(existing) === false;
    const needsAcdb = deferred && !String(existing.acdb_img ?? "").trim();
    const needsSystem = deferred && !String(existing.system_img ?? "").trim();
    const needsDeferredSolar = deferred && !solarMeterCapturedOnFirstVisit(existing);
    const needsSolar = !deferred && !solarMeterCapturedOnFirstVisit(existing);
    const needsInverter = !inverterCaptured(existing);
    const { latitude2, longitude2, inverter_no, remarks: visit2NoteBody } = req.body;
    const files = req.files || {};

    const acdbFile = files.acdb_img?.[0];
    const systemPhotoFile = files.system_img?.[0];
    const deferredSolarFile = files.solar_meter_img?.[0];
    const solarFile = files.solar_meter_img2?.[0];
    const systemFile = files.system_img2?.[0];
    const inverterFile = files.inverter_img?.[0];
    const inverterNormalized = normalizeUlaSerialNumber(inverter_no);

    if (needsAcdb && !acdbFile) {
      return res.status(422).json({
        success: false,
        message: "ACDB photo is required on the 2nd visit when it was not captured on the 1st visit.",
      });
    }
    if (needsSystem && !systemPhotoFile) {
      return res.status(422).json({
        success: false,
        message: "System photo is required on the 2nd visit when it was not captured on the 1st visit.",
      });
    }
    if (needsDeferredSolar && !deferredSolarFile) {
      return res.status(422).json({
        success: false,
        message: "Solar meter photo is required on the 2nd visit when Complete visit was left off.",
      });
    }
    if (needsSolar && (!solarFile || !systemFile)) {
      return res.status(422).json({
        success: false,
        message: "Both solar_meter_img2 and system_img2 photos are required for 2nd visit.",
      });
    }
    if (needsInverter && (!inverterFile || !inverterNormalized)) {
      return res.status(422).json({
        success: false,
        message: "Inverter photo and serial number are required on the 2nd visit when they were not captured on the 1st visit.",
      });
    }

    const gpsParsed = parseGpsPair(latitude2, longitude2);
    if (!gpsParsed.ok) {
      return res.status(422).json({
        success: false,
        message: gpsParsed.message,
      });
    }

    const gpsConflict = await findUlaGpsConflict(
      gpsParsed.latitude,
      gpsParsed.longitude,
      id
    );
    if (gpsConflict) {
      return res.status(409).json({
        success: false,
        message: gpsConflict.message,
        conflicts: [gpsConflict],
      });
    }

    if (needsInverter) {
      const inverterConflict = await findUlaSerialConflict(
        "inverter_no",
        "inverter_no",
        inverterNormalized,
        "inverter serial number",
        id
      );
      if (inverterConflict) {
        return res.status(409).json({
          success: false,
          message: inverterConflict.message,
          conflicts: [inverterConflict],
        });
      }
    }

    const caFolderKey = sanitizeUlaCaFolder(existing.ca_no);
    const [acdb_img, system_img, solar_meter_img, solar_meter_img2, system_img2, inverter_img] = await Promise.all([
      acdbFile ? persistFileField(acdbFile, caFolderKey, "acdb_img") : null,
      systemPhotoFile ? persistFileField(systemPhotoFile, caFolderKey, "system_img") : null,
      deferredSolarFile ? persistFileField(deferredSolarFile, caFolderKey, "solar_meter_img") : null,
      solarFile ? persistFileField(solarFile, caFolderKey, "solar_meter_img2") : null,
      systemFile ? persistFileField(systemFile, caFolderKey, "system_img2") : null,
      inverterFile ? persistFileField(inverterFile, caFolderKey, "inverter_img") : null,
    ]);

    const surveyorName2 = await resolveUserDisplayName(userId);
    const secondVisitAt = new Date();
    await ensureUlaActiveValueTable();
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.biharUlaSurvey.update({
      where: { id: BigInt(id) },
      data: {
        ...(acdb_img ? { acdb_img } : {}),
        ...(system_img ? { system_img } : {}),
        ...(solar_meter_img ? { solar_meter_img } : {}),
        ...(solar_meter_img2 ? { solar_meter_img2 } : {}),
        ...(system_img2 ? { system_img2 } : {}),
        ...(inverter_img ? { inverter_img, inverter_no: inverterNormalized } : {}),
        latitude2: gpsParsed.latitude,
        longitude2: gpsParsed.longitude,
        user_id2: clip(String(userId).trim(), 50),
        second_visit_at: secondVisitAt,
        remarks: mergeSurveyRemarksMeta(existing.remarks, {
          surveyor_name2: surveyorName2,
          second_visit_at: secondVisitAt.toISOString(),
          ...(clip(visit2NoteBody, 500)
            ? { visit2_note: clip(visit2NoteBody, 500) }
            : {}),
        }),
        updated_at: new Date(),
      },
    });
      await syncUlaActiveValues(tx, row);
      return row;
    });

    return res.json({
      success: true,
      message: "Bihar ULA 2nd visit saved successfully.",
      data: await serializeSurveyResponse(req, updated),
    });
  } catch (error) {
    console.error("BIHAR ULA 2ND VISIT ERROR:", error);
    const status = error?.statusCode && Number(error.statusCode) < 600 ? Number(error.statusCode) : 500;
    return res.status(status).json({
      success: false,
      message: error.statusCode ? error.message : error.message || "Failed to save ULA 2nd visit.",
    });
  }
};

const surveyMatchesPortalCompany = (row, portalCompanyId) =>
  Boolean(
    row &&
      portalCompanyId &&
      String(row.company_id || "").trim() === String(portalCompanyId).trim()
  );

export const listBiharUlaSurveys = async (req, res) => {
  try {
    await ensureUlaActiveValueTable();
    const jwtUserId = String(resolveJwtUserId(req) || "").trim();
    const portalCompanyId = req.portalCompanyId
      ? String(req.portalCompanyId).trim()
      : "";
    let where;

    const adminView = jwtUserId ? await requesterIsAdmin(req) : false;

    if (adminView) {
      where = {};
    } else if (jwtUserId) {
      // DLE app: rows where this user did 1st visit (user_id) or 2nd visit (user_id2).
      where = {
        OR: [{ user_id: jwtUserId }, { user_id2: jwtUserId }],
      };
    } else if (portalCompanyId) {
      where = { company_id: portalCompanyId };
    } else {
      return res.status(401).json({
        success: false,
        message: "Login required to list your ULA surveys.",
      });
    }

    const findArgs = {
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    };
    if (!portalCompanyId && !adminView) {
      const limitRaw = req.query.limit;
      if (
        limitRaw != null &&
        limitRaw !== "" &&
        String(limitRaw).toLowerCase() !== "all"
      ) {
        findArgs.take = Math.max(1, Number(limitRaw) || 200);
      } else {
        findArgs.take = 500;
      }
    }

    const rows = await prisma.biharUlaSurvey.findMany(findArgs);

    let data = await enrichSurveysWithUserNames(req, rows);
    const approvalFilter = req.query.approval_status;
    if (approvalFilter != null && String(approvalFilter).trim() !== "") {
      const status = Number(approvalFilter);
      data = data.filter((row) => Number(row.approval_status ?? 0) === status);
    }

    return res.json({
      success: true,
      meta: {
        scope: portalCompanyId ? "company" : adminView ? "all" : "mine",
        approval_status_filter:
          approvalFilter != null && String(approvalFilter).trim() !== ""
            ? Number(approvalFilter)
            : null,
        total: data.length,
      },
      data,
    });
  } catch (error) {
    console.error("BIHAR ULA LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list ULA records.",
    });
  }
};

const countValue = (value) => Number(value || 0);

/** District totals for every surveyor. Field users see their company; admins see every company. */
const findUlaDistrictSummary = async (companyId) => {
  const filled = (column) => `\`${column}\` IS NOT NULL AND TRIM(\`${column}\`) <> ''`;
  const firstDone = `(${filled("panel_one_img")} OR ${filled("system_img")})`;
  const complete = `(${firstDone}) AND (${filled("acdb_img")}) AND (${filled("system_img")}) AND (${filled("inverter_no")}) AND (${filled("inverter_img")}) AND ((${filled("solar_meter_img")}) OR ((${filled("system_img2")}) AND (${filled("solar_meter_img2")})))`;
  const companySql = companyId ? Prisma.sql`WHERE company_id = ${String(companyId)}` : Prisma.empty;
  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(NULLIF(TRIM(district), ''), 'Not set') AS district,
      COUNT(*) AS sites,
      SUM(CASE WHEN ${Prisma.raw(firstDone)} THEN 1 ELSE 0 END) AS first_done,
      SUM(CASE WHEN NOT (${Prisma.raw(firstDone)}) THEN 1 ELSE 0 END) AS first_incomplete,
      SUM(CASE WHEN (${Prisma.raw(firstDone)}) AND NOT (${Prisma.raw(complete)}) THEN 1 ELSE 0 END) AS second_pending,
      SUM(CASE WHEN ${Prisma.raw(complete)} THEN 1 ELSE 0 END) AS complete
    FROM bihar_ula_site_survey
    ${companySql}
    GROUP BY COALESCE(NULLIF(TRIM(district), ''), 'Not set')
    ORDER BY sites DESC, district ASC
  `;
  return rows.map((row) => ({
    district: String(row.district || "Not set"),
    sites: countValue(row.sites),
    firstDone: countValue(row.first_done),
    firstIncomplete: countValue(row.first_incomplete),
    secondPending: countValue(row.second_pending),
    complete: countValue(row.complete),
  }));
};

/** Admin sees every site. A field user sees their own surveys, or every company site when scope=all. */
export const getBiharUlaReport = async (req, res) => {
  try {
    const portalCompanyId = req.portalCompanyId
      ? String(req.portalCompanyId).trim()
      : "";
    const jwtUserId = String(resolveJwtUserId(req) || "").trim();
    if (!jwtUserId && !portalCompanyId) {
      return res.status(401).json({
        success: false,
        message: "Login required to open the ULA dashboard.",
      });
    }

    const adminView = Boolean(portalCompanyId) || (await requesterIsAdmin(req));
    const wantAll = String(req.query.scope || "").trim().toLowerCase() === "all";
    const fieldCompanyId = adminView || portalCompanyId
      ? ""
      : (resolveJwtUserCompanyId(req) || await resolveUserCompanyFromDb(jwtUserId));
    let where;
    let scope = adminView ? "all" : "mine";
    if (portalCompanyId) {
      where = { company_id: portalCompanyId };
    } else if (adminView) {
      where = {};
    } else if (wantAll) {
      if (!fieldCompanyId) {
        return res.status(422).json({
          success: false,
          message: "Company is required to open the all-sites report.",
        });
      }
      where = { company_id: fieldCompanyId };
      scope = "all";
    } else {
      where = { OR: [{ user_id: jwtUserId }, { user_id2: jwtUserId }] };
    }

    const rows = await prisma.biharUlaSurvey.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
    const data = await enrichSurveysWithUserNames(req, rows);
    const summaryCompanyId = portalCompanyId || (adminView ? "" : fieldCompanyId);
    const districts = await findUlaDistrictSummary(summaryCompanyId);
    return res.json({
      success: true,
      meta: {
        scope,
        total: data.length,
        districts,
      },
      data,
    });
  } catch (error) {
    console.error("BIHAR ULA REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to build ULA report.",
    });
  }
};

export const updateBiharUlaApproval = async (req, res) => {
  try {
    const id = String(req.params.id || req.body?.id || "").trim();
    if (!/^\d+$/.test(id)) {
      return res.status(422).json({
        success: false,
        message: "Valid ULA record id is required.",
      });
    }

    const existing = await prisma.biharUlaSurvey.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }
    const portalCompanyId = req.portalCompanyId
      ? String(req.portalCompanyId).trim()
      : "";
    if (portalCompanyId && String(existing.company_id || "").trim() !== portalCompanyId) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }

    const { approval_status, approval_remarks } = req.body || {};
    if (Number(approval_status) === AMC_DOC_APPROVAL.APPROVED && !siteVisitsAreComplete(existing)) {
      return res.status(422).json({
        success: false,
        message:
          "Approve this site only after both visits are complete, or the first visit already includes the solar meter photo.",
      });
    }
    if (Number(approval_status) === AMC_DOC_APPROVAL.REJECTED && !String(approval_remarks || "").trim()) {
      return res.status(422).json({
        success: false,
        message: "Remarks are required when rejecting a ULA survey.",
      });
    }

    const approvalBy =
      String(req.actorUser?.name || req.actorUser?.email || "").trim() ||
      resolveJwtUserId(req) ||
      (req.portalApiCredentialId ? `portal:${req.portalApiCredentialId}` : "external-portal");

    const data = buildAmcApprovalUpdateData({
      approval_status,
      approval_remarks,
      approval_by: approvalBy,
    });

    await ensureUlaApprovalColumns();
    await ensureUlaActiveValueTable();
    const updated = await prisma.$transaction(async (tx) => {
      if (ulaClientHasApprovalField()) {
        await tx.biharUlaSurvey.update({
          where: { id: BigInt(id) },
          data,
        });
      } else {
        await tx.$executeRaw`
          UPDATE bihar_ula_site_survey
          SET approval_status = ${data.approval_status},
              approval_remarks = ${data.approval_remarks},
              approval_by = ${data.approval_by},
              approval_date = ${data.approval_date},
              updated_at = ${data.updated_at}
          WHERE id = ${BigInt(id)}
        `;
      }
      const row = await tx.biharUlaSurvey.findUnique({
        where: { id: BigInt(id) },
      });
      await syncUlaActiveValues(tx, { ...row, approval_status: data.approval_status });
      return row;
    });

    const status = Number(data.approval_status);
    const message =
      status === 1
        ? "ULA survey approved."
        : status === 2
          ? "ULA survey rejected."
          : "ULA survey set to pending.";

    return res.json({
      success: true,
      message,
      data: await serializeSurveyResponse(req, updated),
    });
  } catch (error) {
    console.error("BIHAR ULA APPROVAL ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update ULA approval.",
    });
  }
};

export const uploadBiharUlaConsentForm = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!/^\d+$/.test(id)) {
      return res.status(422).json({
        success: false,
        message: "Valid ULA record id is required.",
      });
    }

    const existing = await prisma.biharUlaSurvey.findUnique({
      where: { id: BigInt(id) },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }

    const consentFile = req.files?.consent_form?.[0];
    const simFile = req.files?.sim_img?.[0];
    const imei = clip(String(req.body?.imei_no || "").trim(), 255) || null;
    const caFolder = sanitizeUlaCaFolder(existing.ca_no);
    const [consentForm, simImg] = await Promise.all([
      consentFile ? persistFileField(consentFile, caFolder, "consent_form") : null,
      simFile ? persistFileField(simFile, caFolder, "sim_img") : null,
    ]);
    const nextConsent = consentForm || existing.consent_form || null;
    const nextSim = simImg || existing.sim_img || null;
    if (!nextConsent && !nextSim && !imei) {
      return res.status(422).json({
        success: false,
        message: "Add a consent form, an IMEI number, or a SIM photo.",
      });
    }

    const updated = await prisma.biharUlaSurvey.update({
      where: { id: BigInt(id) },
      data: {
        consent_form: nextConsent,
        sim_img: nextSim,
        imei_no: imei,
        updated_at: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Consent form, IMEI, and SIM photo saved.",
      data: await serializeSurveyResponse(req, updated),
    });
  } catch (error) {
    console.error("BIHAR ULA CONSENT FORM ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload the consent form.",
    });
  }
};

export const downloadBiharUlaImagesZip = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(422).json({ success: false, message: "Record id is required." });
    }

    const row = await prisma.biharUlaSurvey.findUnique({
      where: { id: BigInt(id) },
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }

    const jwtUserId = resolveJwtUserId(req);
    const portalCompanyId = req.portalCompanyId
      ? String(req.portalCompanyId).trim()
      : "";
    if (jwtUserId) {
      if (!(await surveyAccessibleByDleUser(req, row))) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to download images for this ULA record.",
        });
      }
    } else if (portalCompanyId) {
      if (!surveyMatchesPortalCompany(row, portalCompanyId)) {
        return res.status(403).json({
          success: false,
          message: "ULA record does not belong to this company.",
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: "Login required.",
      });
    }

    const entries = collectUlaImageEntries(row);
    if (!entries.length) {
      return res.status(404).json({
        success: false,
        message: "No images found for this CA record.",
      });
    }

    const zipFilename = `${sanitizeUlaCaFolder(row.ca_no)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    const { default: archiver } = await import("archiver");
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("BIHAR ULA ZIP ARCHIVE ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to build ZIP." });
      }
    });
    archive.pipe(res);

    const zippedFiles = await Promise.all(
      entries.map(async ({ stored, zipName }) => ({
        zipName,
        buffer: await readStoredFileBuffer(stored),
      }))
    );
    for (const { buffer, zipName } of zippedFiles) {
      if (buffer?.length) {
        archive.append(buffer, { name: zipName });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("BIHAR ULA ZIP DOWNLOAD ERROR:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to download images ZIP.",
      });
    }
  }
};

const PORTAL_ULA_EDIT_FILE_MAP = [
  ...VISIT1_FILE_MAP,
  ["structure_img", "structure_img"],
  ["solar_meter_img2", "solar_meter_img2"],
  ["system_img2", "system_img2"],
];

const bodyFieldProvided = (body, key) =>
  Object.prototype.hasOwnProperty.call(body || {}, key);

/** External portal — correct survey text fields and optionally replace photos (API key + write scope). */
export const updateBiharUlaSurveyPortal = async (req, res) => {
  try {
    const portalCompanyId = req.portalCompanyId
      ? String(req.portalCompanyId).trim()
      : "";
    if (!portalCompanyId || req.portalAuthMode === "jwt") {
      return res.status(403).json({
        success: false,
        message:
          "ULA edit is only available via external portal API key with write or all scope.",
      });
    }

    const id = req.params.id;
    if (!id || !/^\d+$/.test(String(id))) {
      return res.status(422).json({
        success: false,
        message: "Valid ULA record id is required.",
      });
    }

    const existing = await prisma.biharUlaSurvey.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }

    if (!surveyMatchesPortalCompany(existing, portalCompanyId)) {
      return res.status(403).json({
        success: false,
        message: "ULA record does not belong to this company.",
      });
    }

    const body = req.body || {};
    const data = {};
    let remarksMetaPatch = {};

    if (bodyFieldProvided(body, "ca_no")) {
      const caParsed = parseCaNo(body.ca_no);
      if (!caParsed.ok) {
        return res.status(422).json({ success: false, message: caParsed.message });
      }
      data.ca_no = clip(caParsed.value, 100);
    }

    if (bodyFieldProvided(body, "ca_name")) {
      data.ca_name = clip(body.ca_name, 100);
    }
    if (bodyFieldProvided(body, "beneficiary_name")) {
      data.beneficiary_name = clip(body.beneficiary_name, 255);
    }
    if (bodyFieldProvided(body, "beneficiary_contact")) {
      const mobileParsed = parseBeneficiaryMobile(body.beneficiary_contact);
      if (!mobileParsed.ok) {
        return res.status(422).json({ success: false, message: mobileParsed.message });
      }
      data.beneficiary_contact = clip(mobileParsed.value, 20);
    }
    if (bodyFieldProvided(body, "district")) {
      data.district = String(body.district || "").trim() || null;
    }
    if (bodyFieldProvided(body, "block")) {
      data.block = String(body.block || "").trim() || null;
    }
    if (bodyFieldProvided(body, "panchayat")) {
      data.panchayat = String(body.panchayat || "").trim() || null;
    }
    if (bodyFieldProvided(body, "village")) {
      data.village = clip(String(body.village || "").trim(), 255);
    }
    if (bodyFieldProvided(body, "survey_date")) {
      data.survey_date = parseSurveyDate(body.survey_date);
    }
    if (bodyFieldProvided(body, "latitude")) {
      data.latitude = String(body.latitude || "").trim() || null;
    }
    if (bodyFieldProvided(body, "longitude")) {
      data.longitude = String(body.longitude || "").trim() || null;
    }
    if (bodyFieldProvided(body, "latitude2")) {
      data.latitude2 = String(body.latitude2 || "").trim() || null;
    }
    if (bodyFieldProvided(body, "longitude2")) {
      data.longitude2 = String(body.longitude2 || "").trim() || null;
    }
    if (bodyFieldProvided(body, "modification")) {
      data.modification = clip(body.modification, 50) || null;
    }
    if (bodyFieldProvided(body, "panel_one_no")) {
      data.panel_one_no = normalizeUlaSerialNumber(body.panel_one_no);
    }
    if (bodyFieldProvided(body, "panel_two_no")) {
      data.panel_two_no = normalizeUlaSerialNumber(body.panel_two_no);
    }
    if (bodyFieldProvided(body, "inverter_no")) {
      data.inverter_no = normalizeUlaSerialNumber(body.inverter_no);
    }
    if (bodyFieldProvided(body, "visit1_note")) {
      remarksMetaPatch.visit1_note = clip(body.visit1_note, 500) || null;
    }
    if (bodyFieldProvided(body, "visit2_note")) {
      remarksMetaPatch.visit2_note = clip(body.visit2_note, 500) || null;
    }

    const caFolderKey = sanitizeUlaCaFolder(data.ca_no ?? existing.ca_no);
    const files = req.files || {};

    const uploadedFields = (
      await Promise.all(
        PORTAL_ULA_EDIT_FILE_MAP.map(async ([fieldName, objectBasename]) => {
          const file = files[fieldName]?.[0];
          if (!file) return null;
          return [fieldName, await persistFileField(file, caFolderKey, objectBasename)];
        })
      )
    ).filter(Boolean);

    for (const [fieldName, storedPath] of uploadedFields) {
      if (fieldName === "structure_img") {
        remarksMetaPatch.structure_img = storedPath;
        continue;
      }
      data[fieldName] = storedPath;
    }

    const nextCa = data.ca_no ?? existing.ca_no;
    const nextContact = data.beneficiary_contact ?? existing.beneficiary_contact;
    const nextPanelOne = Object.prototype.hasOwnProperty.call(data, "panel_one_no")
      ? data.panel_one_no
      : existing.panel_one_no;
    const nextPanelTwo = Object.prototype.hasOwnProperty.call(data, "panel_two_no")
      ? data.panel_two_no
      : existing.panel_two_no;
    const nextInverter = Object.prototype.hasOwnProperty.call(data, "inverter_no")
      ? data.inverter_no
      : existing.inverter_no;

    const gpsChecks = [];
    if (bodyFieldProvided(body, "latitude") || bodyFieldProvided(body, "longitude")) {
      gpsChecks.push([
        Object.prototype.hasOwnProperty.call(data, "latitude") ? data.latitude : existing.latitude,
        Object.prototype.hasOwnProperty.call(data, "longitude")
          ? data.longitude
          : existing.longitude,
      ]);
    }
    if (bodyFieldProvided(body, "latitude2") || bodyFieldProvided(body, "longitude2")) {
      gpsChecks.push([
        Object.prototype.hasOwnProperty.call(data, "latitude2")
          ? data.latitude2
          : existing.latitude2,
        Object.prototype.hasOwnProperty.call(data, "longitude2")
          ? data.longitude2
          : existing.longitude2,
      ]);
    }

    const conflicts = await findUlaRegistrationConflicts({
      caNo: nextCa,
      beneficiaryContact: nextContact,
      panelOneNo: nextPanelOne,
      panelTwoNo: nextPanelTwo,
      inverterNo: nextInverter,
      excludeSurveyId: id,
    });

    for (const [lat, lng] of gpsChecks) {
      if (!String(lat ?? "").trim() || !String(lng ?? "").trim()) continue;
      const gpsConflict = await findUlaGpsConflict(lat, lng, id);
      if (gpsConflict) conflicts.push(gpsConflict);
    }

    if (conflicts.length) {
      const primary = conflicts[0];
      return res.status(409).json({
        success: false,
        message: primary.message,
        conflicts,
      });
    }

    if (Object.keys(remarksMetaPatch).length) {
      data.remarks = mergeSurveyRemarksMeta(existing.remarks, remarksMetaPatch);
    }

    if (!Object.keys(data).length) {
      return res.status(422).json({
        success: false,
        message:
          "No fields to update. Send JSON and/or multipart files (panel_one_img, inverter_img, etc.).",
      });
    }

    data.updated_at = new Date();

    await ensureUlaActiveValueTable();
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.biharUlaSurvey.update({
        where: { id: BigInt(id) },
        data,
      });
      await syncUlaActiveValues(tx, row);
      return row;
    });

    return res.json({
      success: true,
      message: "Bihar ULA record updated successfully.",
      data: await serializeSurveyResponse(req, updated),
    });
  } catch (error) {
    console.error("BIHAR ULA PORTAL UPDATE ERROR:", error);
    const code = error?.code;
    if (code === "P2002" || isDuplicateKeyError(error) || error?.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error?.statusCode === 409 ? error.message : ulaDuplicateConflictMessage(),
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update ULA record.",
    });
  }
};

export const getBiharUlaSurvey = async (req, res) => {
  try {
    const jwtUserId = resolveJwtUserId(req);
    const portalCompanyId = req.portalCompanyId
      ? String(req.portalCompanyId).trim()
      : "";

    if (!jwtUserId && !portalCompanyId) {
      return res.status(401).json({
        success: false,
        message: "Login required to view ULA record.",
      });
    }

    const id = req.params.id;
    const row = await prisma.biharUlaSurvey.findUnique({
      where: { id: BigInt(id) },
    });

    if (!row) {
      return res.status(404).json({ success: false, message: "ULA record not found." });
    }

    if (jwtUserId) {
      if (!(await surveyAccessibleByDleUser(req, row))) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to view this ULA record.",
        });
      }
    } else if (!surveyMatchesPortalCompany(row, portalCompanyId)) {
      return res.status(403).json({
        success: false,
        message: "ULA record does not belong to this company.",
      });
    }

    return res.json({
      success: true,
      data: await serializeSurveyResponse(req, row),
    });
  } catch (error) {
    console.error("BIHAR ULA GET ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ULA record.",
    });
  }
};
