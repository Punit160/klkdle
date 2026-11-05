import prisma from "../../../Config/Prisma.js";
import { persistModuleUpload } from "../../../Utils/amcObjectStorage.js";
import { resolveStoredFileUrl } from "../../../Utils/publicUrl.js";
import { R2_PREFIX } from "../../../Utils/r2ObjectPrefixes.js";
import { resolveJwtUserId } from "../../../Utils/requestUser.js";
import { AMC_DOC_APPROVAL, buildAmcApprovalUpdateData } from "../../../Utils/amcApproval.js";
import { isUserMasterAdmin } from "../../../Utils/userRoles.js";
import { findUserById } from "../../../Model/DLE-Model/dle-user-model.js";

const OK_PENDING = ["OK", "NOT OK", "PENDING"];

export const ULA_INSPECTION_ITEMS = [
  { key: "mms_structure", label: "MMS Structure", options: OK_PENDING },
  { key: "mms_foundation", label: "MMS Structure Foundation (300mmx300mmx300mm)", options: OK_PENDING, photo: true },
  { key: "pv_panel", label: "PV Panel", options: OK_PENDING },
  { key: "shadow_pv", label: "Shadow on PV Panel", options: OK_PENDING, photo: true },
  { key: "inverter", label: "Inverter", options: OK_PENDING },
  { key: "acdb", label: "ACDB", options: OK_PENDING },
  { key: "solar_meter", label: "Solar Meter", options: OK_PENDING },
  { key: "plant_status", label: "Plant Status", options: ["HEALTHY", "NOT HEALTHY", "PENDING"] },
  { key: "la", label: "LA (Lightning Arrester)", options: OK_PENDING },
  { key: "la_foundation", label: "LA Foundation", options: OK_PENDING, photo: true },
  { key: "la_height", label: "Height of LA", options: ["ABOVE STRUCTURE", "BELOW STRUCTURE", "PENDING"] },
  { key: "dc_cable", label: "DC Cable", options: OK_PENDING },
  { key: "dc_cable_dressing", label: "DC Cable Dressing", options: OK_PENDING },
  { key: "ac_cable", label: "AC Cable", options: OK_PENDING },
  { key: "ac_cable_dressing", label: "AC Cable Dressing", options: OK_PENDING },
  { key: "earthing_cable", label: "Earthing Cable", options: OK_PENDING },
  { key: "earthing_cable_dressing", label: "Earthing Cable Dressing", options: OK_PENDING },
  { key: "earthing_electrode", label: "Earthing (Earth Electrode)", options: OK_PENDING },
  { key: "earth_distance", label: "Distance Between Each Earth Electrode (Minimum 1 Meter Distance)", options: OK_PENDING, remarksRequired: true },
  { key: "rms", label: "RMS", options: OK_PENDING, photo: true },
  { key: "rms_sim", label: "RMS SIM", options: OK_PENDING, photo: true },
  { key: "portal_upload", label: "Portal Upload", options: OK_PENDING },
];

const digitsOnly = (value, maxLen) =>
  String(value ?? "").replace(/\D/g, "").slice(0, maxLen);

const clip = (value, maxLen) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) : text;
};

const filled = (value) => Boolean(String(value ?? "").trim());

const siteVisitsAreComplete = (row) => {
  const inverter = filled(row?.inverter_no) && filled(row?.inverter_img);
  const solar =
    filled(row?.solar_meter_img) ||
    (filled(row?.solar_meter_img2) && filled(row?.system_img2));
  return (
    (filled(row?.panel_one_img) || filled(row?.system_img)) &&
    filled(row?.acdb_img) &&
    filled(row?.system_img) &&
    inverter &&
    solar
  );
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

const companyIdOf = (req) =>
  String(req.body?.company_id || req.user?.company_id || req.user?.companyId || "").trim();

const parseAnswers = (raw) => {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const publicAnswers = (req, answers) => {
  const source = parseAnswers(answers);
  const next = {};
  for (const item of ULA_INSPECTION_ITEMS) {
    const entry = source[item.key] || {};
    const photo = String(entry.photo || "").trim();
    next[item.key] = {
      status: String(entry.status || ""),
      remarks: String(entry.remarks || ""),
      photo: photo || "",
      photo_url: photo ? resolveStoredFileUrl(req, photo) || photo : "",
    };
  }
  return next;
};

const monthKeyOf = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 7);
  }
  const match = String(value || "").match(/^(\d{4}-\d{2})/);
  return match ? match[1] : "";
};

const monthBounds = (month) => {
  const [yearText, monthText] = String(month || "").split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  if (!year || monthIndex < 1 || monthIndex > 12) return null;
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 1));
  return { start, end };
};

const monthLabel = (month) => {
  const bounds = monthBounds(month);
  if (!bounds) return month || "";
  return bounds.start.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const inspectionInMonth = (caNo, month, rejected) => {
  const bounds = monthBounds(month);
  if (!bounds) return Promise.resolve(null);
  return prisma.biharUlaSiteInspection.findFirst({
    where: {
      ca_no: caNo,
      approval_status: rejected
        ? AMC_DOC_APPROVAL.REJECTED
        : { not: AMC_DOC_APPROVAL.REJECTED },
      inspection_date: { gte: bounds.start, lt: bounds.end },
    },
    orderBy: { id: "desc" },
  });
};

const inspectionSummary = (row) =>
  row
    ? {
        id: row.id?.toString?.() ?? String(row.id),
        inspection_date: row.inspection_date,
        approval_status: Number(row.approval_status ?? 0),
      }
    : null;

const photoCountOf = (answers) => {
  const source = parseAnswers(answers);
  return ULA_INSPECTION_ITEMS.filter((item) => String(source[item.key]?.photo || "").trim()).length;
};

const userNameMap = async (rows) => {
  const ids = [
    ...new Set(
      rows
        .map((row) => String(row.user_id || "").trim())
        .filter((id) => /^\d+$/.test(id))
    ),
  ];
  const map = new Map();
  await Promise.all(
    ids.map(async (id) => {
      const user = await findUserById(id);
      if (user?.name) map.set(id, String(user.name));
    })
  );
  return map;
};

const listPayload = (row, names) => ({
  id: row.id?.toString?.() ?? String(row.id),
  ca_no: row.ca_no,
  consumer_name: row.consumer_name || "",
  mobile: row.mobile || "",
  district: row.district || "",
  block: row.block || "",
  panchayat: row.panchayat || "",
  village: row.village || "",
  latitude: row.latitude || "",
  longitude: row.longitude || "",
  inspection_date: row.inspection_date,
  survey_id: row.survey_id != null ? row.survey_id.toString() : null,
  user_id: row.user_id || "",
  user_name: names.get(String(row.user_id || "")) || "",
  approval_status: Number(row.approval_status ?? 0),
  approval_date: row.approval_date,
  approval_remarks: row.approval_remarks || "",
  approval_by: row.approval_by || "",
  photo_count: photoCountOf(row.answers),
  created_at: row.created_at,
});

const detailPayload = (req, row, names) => ({
  ...listPayload(row, names),
  answers: publicAnswers(req, row.answers),
});

const canReadInspection = async (req, row) => {
  const userId = String(resolveJwtUserId(req) || "");
  if (userId && (await requesterIsAdmin(req))) return true;
  if (userId && String(row.user_id || "") === userId) return true;
  const portalCompanyId = req.portalCompanyId ? String(req.portalCompanyId).trim() : "";
  return Boolean(portalCompanyId && String(row.company_id || "") === portalCompanyId);
};

const sitePayload = (row) => ({
  id: row.id?.toString?.() ?? String(row.id),
  ca_no: row.ca_no,
  consumer_name: row.ca_name || row.beneficiary_name || "",
  mobile: row.beneficiary_contact || "",
  district: row.district || "",
  block: row.block || "",
  panchayat: row.panchayat || "",
  village: row.village || "",
  latitude: row.latitude || "",
  longitude: row.longitude || "",
  latitude2: row.latitude2 || "",
  longitude2: row.longitude2 || "",
  created_at: row.created_at,
  second_visit_at: row.second_visit_at,
  visits_complete: siteVisitsAreComplete(row),
});

const findSurveyByCa = async (caNo) =>
  prisma.biharUlaSurvey.findFirst({
    where: { ca_no: caNo },
    orderBy: { id: "desc" },
  });

export const lookupBiharUlaInspectionSite = async (req, res) => {
  try {
    const caNo = digitsOnly(req.query.ca_no, 20);
    if (caNo.length < 4) {
      return res.status(422).json({
        success: false,
        message: "CA number must be at least 4 digits.",
      });
    }

    const survey = await findSurveyByCa(caNo);
    if (!survey) {
      return res.json({
        success: true,
        found: false,
        visits_complete: false,
        message: "No Bihar ULA site is registered for this CA number.",
      });
    }

    const admin = await requesterIsAdmin(req);
    const userId = String(resolveJwtUserId(req) || "");
    const companyId = companyIdOf(req);
    const sameCompany = companyId && String(survey.company_id || "") === companyId;
    const ownVisit = userId && (String(survey.user_id || "") === userId || String(survey.user_id2 || "") === userId);
    if (!admin && !sameCompany && !ownVisit) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this ULA site.",
      });
    }

    const month = monthKeyOf(req.query.inspection_date) || monthKeyOf(new Date());
    const open = await inspectionInMonth(caNo, month, false);
    const rejected = open ? null : await inspectionInMonth(caNo, month, true);
    const label = monthLabel(month);
    let message = "Bihar ULA site found. Site details are shown below.";
    if (open) {
      message = `This CA already has a site inspection for ${label}. One inspection is allowed each month. Another inspection in the same month is allowed only after an admin rejects it.`;
    } else if (rejected) {
      message = `The inspection for ${label} was rejected. You can submit a new inspection for this CA.`;
    }

    return res.json({
      success: true,
      found: true,
      visits_complete: siteVisitsAreComplete(survey),
      can_inspect: !open,
      month,
      message,
      site: sitePayload(survey),
      blocking_inspection: inspectionSummary(open),
      rejected_inspection: inspectionSummary(rejected),
    });
  } catch (error) {
    console.error("BIHAR ULA INSPECTION LOOKUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not look up this CA number.",
    });
  }
};

const persistInspectionPhoto = async (file, caNo, key) => {
  if (!file) return null;
  const safeCa = String(caNo).replace(/[^a-zA-Z0-9._-]+/g, "_") || "ca";
  const result = await persistModuleUpload({
    file,
    r2Prefix: `${R2_PREFIX.BIHAR_ULA}/${safeCa}/inspection`,
    localRelativeFolder: `bihar/ula/${safeCa}/inspection`,
    moduleLabel: "Bihar ULA inspection",
    fixedBasename: key,
  });
  return result.storedValue;
};

export const storeBiharUlaInspection = async (req, res) => {
  try {
    const userId = resolveJwtUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required." });
    }
    const caNo = digitsOnly(req.body?.ca_no, 20);
    if (caNo.length < 4) {
      return res.status(422).json({ success: false, message: "CA number must be at least 4 digits." });
    }

    const survey = await findSurveyByCa(caNo);
    if (!survey) {
      return res.status(422).json({
        success: false,
        message: "No Bihar ULA site is registered for this CA number.",
      });
    }

    const dateText = String(req.body?.inspection_date || "").trim();
    const inspectionDateText = /^\d{4}-\d{2}-\d{2}$/.test(dateText)
      ? dateText
      : new Date().toISOString().slice(0, 10);
    const month = monthKeyOf(inspectionDateText);
    const open = await inspectionInMonth(caNo, month, false);
    if (open) {
      return res.status(409).json({
        success: false,
        message: `This CA already has a site inspection for ${monthLabel(month)}. One inspection is allowed each month. Another inspection in the same month is allowed only after an admin rejects it.`,
        inspection_id: open.id?.toString?.() ?? String(open.id),
      });
    }

    const incoming = parseAnswers(req.body?.answers);
    const files = req.files || {};
    const next = {};

    for (const item of ULA_INSPECTION_ITEMS) {
      const entry = incoming[item.key] || {};
      const status = String(entry.status || "").trim();
      const remarks = clip(entry.remarks, 500);
      if (!item.options.includes(status)) {
        return res.status(422).json({
          success: false,
          message: `Choose a status for ${item.label}.`,
        });
      }
      if (item.remarksRequired && !remarks) {
        return res.status(422).json({
          success: false,
          message: "Remarks are compulsory for the distance between earth electrodes.",
        });
      }
      const uploaded = files[item.key]?.[0];
      const photo = uploaded ? await persistInspectionPhoto(uploaded, caNo, item.key) : "";
      if (item.photo && !photo) {
        return res.status(422).json({
          success: false,
          message: `Photo is compulsory for ${item.label}.`,
        });
      }
      next[item.key] = { status, remarks, photo: photo || "" };
    }

    const inspectionDate = new Date(`${inspectionDateText}T00:00:00.000Z`);

    const data = {
      company_id: clip(survey.company_id || companyIdOf(req), 100),
      user_id: clip(String(userId), 50),
      survey_id: survey.id,
      ca_no: caNo,
      consumer_name: clip(survey.ca_name || survey.beneficiary_name || caNo, 255),
      mobile: clip(survey.beneficiary_contact, 20) || null,
      district: survey.district || null,
      block: survey.block || null,
      panchayat: survey.panchayat || null,
      village: survey.village || null,
      latitude: survey.latitude || null,
      longitude: survey.longitude || null,
      inspection_date: inspectionDate,
      answers: JSON.stringify(next),
      approval_status: AMC_DOC_APPROVAL.PENDING,
      updated_at: new Date(),
    };

    const stillOpen = await inspectionInMonth(caNo, month, false);
    if (stillOpen) {
      return res.status(409).json({
        success: false,
        message: `This CA already has a site inspection for ${monthLabel(month)}. One inspection is allowed each month. Another inspection in the same month is allowed only after an admin rejects it.`,
        inspection_id: stillOpen.id?.toString?.() ?? String(stillOpen.id),
      });
    }

    const saved = await prisma.biharUlaSiteInspection.create({ data });

    return res.status(201).json({
      success: true,
      message: "ULA site inspection saved.",
      data: {
        id: saved.id?.toString?.() ?? String(saved.id),
        ca_no: saved.ca_no,
        inspection_date: saved.inspection_date,
        approval_status: Number(saved.approval_status ?? 0),
        answers: publicAnswers(req, saved.answers),
      },
    });
  } catch (error) {
    console.error("BIHAR ULA INSPECTION SAVE ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not save the site inspection.",
    });
  }
};

const listScope = async (req) => {
  const userId = String(resolveJwtUserId(req) || "").trim();
  const portalCompanyId = req.portalCompanyId ? String(req.portalCompanyId).trim() : "";
  if (userId && (await requesterIsAdmin(req))) return { where: {}, scope: "all" };
  if (userId) return { where: { user_id: userId }, scope: "mine" };
  if (portalCompanyId) return { where: { company_id: portalCompanyId }, scope: "company" };
  return null;
};

export const listBiharUlaInspections = async (req, res) => {
  try {
    const scope = await listScope(req);
    if (!scope) {
      return res.status(401).json({ success: false, message: "Login required." });
    }
    const findArgs = {
      where: scope.where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    };
    if (scope.scope !== "all") findArgs.take = 500;
    const rows = await prisma.biharUlaSiteInspection.findMany(findArgs);
    const names = await userNameMap(rows);
    return res.json({
      success: true,
      meta: { scope: scope.scope, total: rows.length },
      data: rows.map((row) => listPayload(row, names)),
    });
  } catch (error) {
    console.error("BIHAR ULA INSPECTION LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not list site inspections.",
    });
  }
};

export const getBiharUlaInspection = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!/^\d+$/.test(id)) {
      return res.status(422).json({ success: false, message: "Valid inspection id is required." });
    }
    const row = await prisma.biharUlaSiteInspection.findUnique({ where: { id: BigInt(id) } });
    if (!row || !(await canReadInspection(req, row))) {
      return res.status(404).json({ success: false, message: "Site inspection not found." });
    }
    const names = await userNameMap([row]);
    return res.json({ success: true, data: detailPayload(req, row, names) });
  } catch (error) {
    console.error("BIHAR ULA INSPECTION VIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load this site inspection.",
    });
  }
};

export const updateBiharUlaInspectionApproval = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!/^\d+$/.test(id)) {
      return res.status(422).json({ success: false, message: "Valid inspection id is required." });
    }
    const existing = await prisma.biharUlaSiteInspection.findUnique({ where: { id: BigInt(id) } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Site inspection not found." });
    }

    const { approval_status, approval_remarks } = req.body || {};
    if (
      Number(approval_status) === AMC_DOC_APPROVAL.REJECTED &&
      !String(approval_remarks || "").trim()
    ) {
      return res.status(422).json({
        success: false,
        message: "Remarks are required when rejecting a site inspection.",
      });
    }

    const actorId = resolveJwtUserId(req);
    let approvalBy = String(req.actorUser?.name || req.user?.name || "").trim();
    if (!approvalBy && actorId) {
      const actor = await findUserById(actorId);
      approvalBy = String(actor?.name || actorId);
    }

    const data = buildAmcApprovalUpdateData({
      approval_status,
      approval_remarks,
      approval_by: approvalBy || "admin",
    });
    const saved = await prisma.biharUlaSiteInspection.update({
      where: { id: existing.id },
      data,
    });
    const names = await userNameMap([saved]);
    const status = Number(data.approval_status);
    return res.json({
      success: true,
      message:
        status === AMC_DOC_APPROVAL.APPROVED
          ? "Site inspection approved."
          : status === AMC_DOC_APPROVAL.REJECTED
            ? "Site inspection rejected. A new inspection can be submitted for this CA in the same month."
            : "Site inspection set to pending.",
      data: detailPayload(req, saved, names),
    });
  } catch (error) {
    console.error("BIHAR ULA INSPECTION APPROVAL ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Could not update this site inspection.",
    });
  }
};
