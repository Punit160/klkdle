import path from "node:path";
import prisma from "../../../Config/Prisma.js";
import { resolveStoredFileUrl } from "../../../Utils/publicUrl.js";
import { persistModuleUpload } from "../../../Utils/amcObjectStorage.js";
import { R2_PREFIX } from "../../../Utils/r2ObjectPrefixes.js";
import {
  parseR2StoredValue,
  readStoredFileBuffer,
} from "../../../Utils/objectStorage.js";
import { resolveJwtUserId } from "../../../Utils/requestUser.js";

const surveyOwnedByUser = (row, userId) =>
  Boolean(row && userId && String(row.user_id) === String(userId));

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
    map.set(String(Number(key)), label);
  }

  return map;
};

const nameFromMap = (nameMap, userId) => {
  if (userId == null || userId === "") return null;
  const key = String(userId).trim();
  return nameMap.get(key) || nameMap.get(String(Number(key))) || null;
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
  return serialized;
};

const enrichSurveysWithUserNames = async (req, rows) => {
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
];

const zipEntryNameFromStored = (stored, fallbackBase) => {
  const r2Key = parseR2StoredValue(stored);
  if (r2Key) return path.basename(r2Key);
  const raw = String(stored || "").trim();
  if (raw.includes("/")) return path.basename(raw.split("?")[0]);
  return `${fallbackBase}.jpg`;
};

const secondVisitIsComplete = (row) =>
  Boolean(
    String(row?.system_img2 ?? "").trim() &&
      String(row?.solar_meter_img2 ?? "").trim()
  );

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
    first_visit_complete: Boolean(row.system_img),
    second_visit_complete: secondVisitIsComplete(row),
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

/** Indian mobile — 10 digits, starts with 6–9. Empty → "-". */
const parseBeneficiaryMobile = (raw) => {
  const mobile = digitsOnly(raw, 10);
  if (!mobile) {
    return { ok: true, value: "-" };
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return {
      ok: false,
      message:
        "Beneficiary contact must be a valid 10-digit mobile number (digits only, starts with 6–9).",
    };
  }
  return { ok: true, value: mobile };
};

/** Safe folder segment: klkdle/biharula/{ca_no}/panel_one_img.jpg (flat — no subfolders per photo). */
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
      solar_meter_on_first_visit,
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

    const caNoNormalized = caParsed.value;

    const existing = await prisma.biharUlaSurvey.findUnique({
      where: { ca_no: caNoNormalized },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This CA number is already registered. Open the existing record for 2nd visit.",
        data: { id: existing.id?.toString?.() ?? String(existing.id) },
      });
    }

    const caFolderKey = sanitizeUlaCaFolder(caNoNormalized);
    const files = req.files || {};
    const stored = {};

    for (const [fieldName, objectBasename] of VISIT1_FILE_MAP) {
      const file = files[fieldName]?.[0];
      if (file) {
        stored[fieldName] = await persistFileField(file, caFolderKey, objectBasename);
      }
    }

    let structurePath = null;
    const structureFile = files.structure_img?.[0];
    if (structureFile) {
      structurePath = await persistFileField(
        structureFile,
        caFolderKey,
        "structure_img"
      );
    }

    const required = [
      "panel_one_img",
      "panel_two_img",
      "inverter_img",
      "smart_meter_img",
      "acdb_img",
      "system_img",
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

    if (!latitude?.trim() || !longitude?.trim()) {
      return res.status(422).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    if (
      String(solar_meter_on_first_visit).toLowerCase() === "true" ||
      solar_meter_on_first_visit === "1"
    ) {
      if (!stored.solar_meter_img) {
        return res.status(422).json({
          success: false,
          message: "Solar meter photo is required when solar meter is available on 1st visit.",
        });
      }
    }

    const surveyorName = await resolveUserDisplayName(userId);
    const created = await prisma.biharUlaSurvey.create({
      data: {
        company_id: clip(companyIdResolved, 100),
        ca_no: clip(caNoNormalized, 100),
        ca_name: clip(ca_name, 100),
        beneficiary_name: clip(beneficiary_name || ca_name, 255),
        beneficiary_contact: clip(mobileParsed.value, 20) || "-",
        state: "Bihar",
        district: district?.trim() || null,
        block: block?.trim() || null,
        panchayat: panchayat?.trim() || null,
        village: village?.trim() || null,
        survey_date: parseSurveyDate(survey_date),
        panel_one_img: stored.panel_one_img,
        panel_one_no: panel_one_no?.trim() || null,
        panel_two_img: stored.panel_two_img,
        panel_two_no: panel_two_no?.trim() || null,
        inverter_img: stored.inverter_img,
        inverter_no: inverter_no?.trim() || null,
        smart_meter_img: stored.smart_meter_img,
        acdb_img: stored.acdb_img,
        system_img: stored.system_img,
        solar_meter_img: stored.solar_meter_img || null,
        latitude: latitude?.trim() || null,
        longitude: longitude?.trim() || null,
        user_id: clip(String(userId).trim(), 50),
        modification: null,
        remarks: mergeSurveyRemarksMeta(null, {
          structure_img: structurePath,
          surveyor_name: surveyorName,
        }),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Bihar ULA 1st visit saved successfully.",
      data: await serializeSurveyResponse(req, created),
    });
  } catch (error) {
    console.error("BIHAR ULA CREATE ERROR:", error);
    const code = error?.code;
    if (code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This CA number is already registered.",
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

    if (!surveyOwnedByUser(existing, userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only update ULA records you created.",
      });
    }

    if (existing.system_img2 && existing.solar_meter_img2) {
      return res.status(409).json({
        success: false,
        message: "2nd visit is already completed for this record.",
      });
    }

    const { latitude2, longitude2, remarks } = req.body;
    const files = req.files || {};

    const solarFile = files.solar_meter_img2?.[0];
    const systemFile = files.system_img2?.[0];

    if (!solarFile || !systemFile) {
      return res.status(422).json({
        success: false,
        message: "Both solar_meter_img2 and system_img2 photos are required for 2nd visit.",
      });
    }

    if (!latitude2?.trim() || !longitude2?.trim()) {
      return res.status(422).json({
        success: false,
        message: "Latitude and longitude are required for 2nd visit.",
      });
    }

    const caFolderKey = sanitizeUlaCaFolder(existing.ca_no);
    const solar_meter_img2 = await persistFileField(
      solarFile,
      caFolderKey,
      "solar_meter_img2"
    );
    const system_img2 = await persistFileField(
      systemFile,
      caFolderKey,
      "system_img2"
    );

    const surveyorName2 = await resolveUserDisplayName(userId);
    const secondVisitAt = new Date();
    const updated = await prisma.biharUlaSurvey.update({
      where: { id: BigInt(id) },
      data: {
        solar_meter_img2,
        system_img2,
        latitude2: latitude2?.trim() || null,
        longitude2: longitude2?.trim() || null,
        user_id2: clip(String(userId).trim(), 50),
        second_visit_at: secondVisitAt,
        remarks: mergeSurveyRemarksMeta(existing.remarks, {
          surveyor_name2: surveyorName2,
          second_visit_at: secondVisitAt.toISOString(),
          ...(remarks?.trim() ? { visit2_note: clip(remarks, 500) } : {}),
        }),
        updated_at: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Bihar ULA 2nd visit saved successfully.",
      data: await serializeSurveyResponse(req, updated),
    });
  } catch (error) {
    console.error("BIHAR ULA 2ND VISIT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save ULA 2nd visit.",
    });
  }
};

export const listBiharUlaSurveys = async (req, res) => {
  try {
    const userId = String(resolveJwtUserId(req) || "").trim();
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required to list your ULA surveys.",
      });
    }

    // Scope by logged-in creator only (ignore company_id query — localStorage can be stale).
    const rows = await prisma.biharUlaSurvey.findMany({
      where: { user_id: userId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: Math.min(Number(req.query.limit) || 200, 500),
    });

    const data = await enrichSurveysWithUserNames(req, rows);

    return res.json({
      success: true,
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

    const userId = resolveJwtUserId(req);
    if (!surveyOwnedByUser(row, userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only download images for your own ULA records.",
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
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("BIHAR ULA ZIP ARCHIVE ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Failed to build ZIP." });
      }
    });
    archive.pipe(res);

    for (const { stored, zipName } of entries) {
      const buffer = await readStoredFileBuffer(stored);
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

export const getBiharUlaSurvey = async (req, res) => {
  try {
    const userId = resolveJwtUserId(req);
    if (!userId) {
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

    if (!surveyOwnedByUser(row, userId)) {
      return res.status(403).json({
        success: false,
        message: "You can only view ULA records you created.",
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
