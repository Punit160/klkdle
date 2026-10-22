import {
  createLightAmc,
  findLastLightAmc,
  findLightAmcById,
  findLightAmcs,
  findLightAmcsInPeriod,
  findRecentLightAmcs,
  isUpStyleAmcRegion,
  lightAmcRegionOf,
  serializeLightAmc,
  visitRegionProfile,
} from "../../Model/DLE-Model/light-amc-model.js";
import { storedPathFromUploadedFile } from "../../Utils/amcStoredUploadPath.js";
import { resolveJwtUserId, resolveRequestUserId } from "../../Utils/requestUser.js";
import { isUserMasterAdmin } from "../../Utils/userRoles.js";

const stateFilterForRegion = (region) => {
  if (isUpStyleAmcRegion(region)) return "Uttar Pradesh";
  if (region === "bihar") return "Bihar";
  return null;
};

const REGION_REQUIRED = "region or state is required (bihar, up, kusumc, powerpack, offgrid, or ongrid).";

const UP_VISIT_ANSWER_KEYS = [
  "plant_status",
  "functional_duration_value",
  "functional_duration_unit",
  "backup_hours_per_day",
  "breakdown_count",
  "last_repair_date",
  "ro_purified_water_available",
  "panel_cleaning_done",
  "battery_electrolyte_topup",
  "battery_bank_condition",
  "battery_terminal_cleaned",
  "battery_petroleum_jelly_applied",
  "luminaires_cleaned_wiring",
  "fans_oiling_greasing_done",
  "wiring_checked_loose_wires",
  "ro_servicing_filters_replaced",
  "ro_storage_tank_cleaned",
  "ro_water_tds_value",
  "ro_solar_pump_serviced",
  "ro_pipelines_taps_fixed",
];

const normalizeUpVisitAnswers = (value) => {
  let source = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    try {
      source = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;

  const answers = {};
  for (const key of UP_VISIT_ANSWER_KEYS) {
    const raw = source[key];
    answers[key] = raw == null ? "" : String(raw).trim();
  }
  return answers;
};

const requestLightRegion = (req, stateValue) => {
  if (lightAmcRegionOf(req.lightAmcRegion)) return lightAmcRegionOf(req.lightAmcRegion);
  return (
    lightAmcRegionOf(req.query?.region) ||
    lightAmcRegionOf(req.body?.region) ||
    lightAmcRegionOf(stateValue) ||
    lightAmcRegionOf(req.query?.state) ||
    lightAmcRegionOf(req.body?.state) ||
    null
  );
};

const resolveLightAmcReadScope = (req) => {
  const portalCompanyId = req.portalCompanyId
    ? String(req.portalCompanyId).trim()
    : "";
  const jwtUserId = resolveJwtUserId(req);
  const userId = resolveRequestUserId(req);

  const stateFromQuery = req.query.state?.trim();
  const regionHint = requestLightRegion(req, stateFromQuery);
  const state = stateFromQuery || stateFilterForRegion(regionHint) || undefined;

  if (portalCompanyId && !jwtUserId) {
    return {
      ok: true,
      companyId: portalCompanyId,
      state,
      userId: null,
    };
  }

  if (jwtUserId || userId) {
    const adminAll = isUserMasterAdmin(req.user);
    return {
      ok: true,
      companyId: adminAll ? null : req.query.company_id,
      state,
      userId: adminAll ? null : userId,
      scope: adminAll ? "all" : "mine",
    };
  }

  return {
    ok: false,
    status: 401,
    message: "User authentication required",
  };
};

const addMonths = (value, months) => {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date;
};

const toISODate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Indian financial year label for an AMC date, for example 2026-10-14 -> 2026-27. */
const financialYearLabel = (isoDate) => {
  const match = String(isoDate || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || !month) return null;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
};

const normalizeAmcTime = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return false;
  return `${match[1]}:${match[2]}`;
};

const monthDiff = (from, to) => {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};

const parseInstallDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getLastLightAmc = async (req, res) => {
  try {
    const sslId = req.query.ssl_id || req.query.pump_id;
    const companyId = req.query.company_id;

    if (!sslId) {
      return res.status(400).json({
        success: false,
        message: "ssl_id is required",
      });
    }

    const region = requestLightRegion(req);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const last = await findLastLightAmc(sslId, companyId, region);
    const serialized = serializeLightAmc(last);

    let nextAmcDate = null;
    let periodStart = serialized?.period_start || null;
    let periodEnd = serialized?.period_end || null;

    if (serialized?.amc_date) {
      nextAmcDate = toISODate(addMonths(serialized.amc_date, 3));
    }

    return res.status(200).json({
      success: true,
      data: serialized
        ? {
            ...serialized,
            next_amc_date: nextAmcDate || serialized.next_amc_date,
            period_start: periodStart,
            period_end: periodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error("GET LAST LIGHT AMC ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch last AMC",
    });
  }
};

export const getLightAmcs = async (req, res) => {
  try {
    const scope = resolveLightAmcReadScope(req);
    if (!scope.ok) {
      return res.status(scope.status).json({
        success: false,
        message: scope.message,
      });
    }

    const region = requestLightRegion(req, scope.state);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const rows = await findLightAmcs({
      companyId: scope.companyId,
      state: scope.state,
      userId: scope.userId,
      region,
    });

    const working = String(req.query.working || "").trim();
    const district = String(req.query.district || "").trim().toLowerCase();
    const data = rows.map(serializeLightAmc).filter((row) => {
      if (working === "Yes" && row.light_working !== "Yes") return false;
      if (working === "No" && row.light_working === "Yes") return false;
      if (district && String(row.district || "").trim().toLowerCase() !== district) return false;
      return true;
    });

    return res.status(200).json({
      success: true,
      meta: {
        state: scope.state || "all",
        company_id: scope.companyId ? String(scope.companyId) : null,
        scope: scope.scope || (scope.userId ? "mine" : "company"),
        working: working || null,
        district: district || null,
      },
      data,
    });
  } catch (error) {
    console.error("GET LIGHT AMCS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AMC records",
    });
  }
};

export const getRecentLightAmcs = async (req, res) => {
  try {
    const {
      company_id,
      state,
      district,
      block,
      panchayat,
      within_days,
    } = req.query;

    const userId = resolveRequestUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const withinDays = Math.max(1, Number(within_days) || 80);
    const region = requestLightRegion(req, state);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }
    const rows = await findRecentLightAmcs({
      companyId: company_id,
      state,
      userId,
      district,
      block,
      panchayat,
      withinDays,
      region,
    });

    return res.status(200).json({
      success: true,
      within_days: withinDays,
      data: rows.map((row) => {
        const serialized = serializeLightAmc(row);
        return {
          ssl_id: serialized.ssl_id,
          unique_id: serialized.unique_id,
          pole_no: serialized.pole_no,
          amc_date: serialized.amc_date,
          next_amc_date: serialized.next_amc_date,
        };
      }),
    });
  } catch (error) {
    console.error("GET RECENT LIGHT AMCS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch recent AMC records",
    });
  }
};

export const getLightAmcsInPeriod = async (req, res) => {
  try {
    const {
      company_id,
      district,
      block,
      panchayat,
      start_month_year,
      end_month_year,
    } = req.query;

    if (!start_month_year) {
      return res.status(400).json({
        success: false,
        message: "start_month_year is required",
      });
    }

    const userId = resolveRequestUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const region = requestLightRegion(req, req.query.state);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const rows = await findLightAmcsInPeriod({
      companyId: company_id,
      userId,
      district,
      block,
      panchayat,
      startMonth: start_month_year,
      endMonth: end_month_year,
      state: req.query.state,
      region,
    });

    return res.status(200).json({
      success: true,
      data: rows.map((row) => {
        const serialized = serializeLightAmc(row);
        return {
          ssl_id: serialized.ssl_id,
          unique_id: serialized.unique_id,
          pole_no: serialized.pole_no,
          amc_date: serialized.amc_date,
          district: serialized.district,
          block: serialized.block,
          panchayat: serialized.panchayat,
        };
      }),
    });
  } catch (error) {
    console.error("GET LIGHT AMCS IN PERIOD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Light AMC records for this period",
    });
  }
};

export const getLightAmcById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const scope = resolveLightAmcReadScope(req);
    if (!scope.ok) {
      return res.status(scope.status).json({
        success: false,
        message: scope.message,
      });
    }

    const region = requestLightRegion(req, scope.state);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const row = await findLightAmcById(
      id,
      scope.companyId,
      scope.userId,
      region
    );
    if (!row) {
      return res.status(404).json({
        success: false,
        message: "AMC record not found",
      });
    }

    const regionState = stateFilterForRegion(region);
    if (
      regionState &&
      String(row.state || "").trim() !== regionState
    ) {
      return res.status(404).json({
        success: false,
        message: "AMC record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeLightAmc(row),
    });
  } catch (error) {
    console.error("GET LIGHT AMC BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AMC record",
    });
  }
};

export const storeLightAmc = async (req, res) => {
  try {
    const {
      company_id,
      user_id,
      state,
      district,
      block,
      panchayat,
      village,
      ward_no,
      volume,
      ssl_id,
      pump_id,
      powerpack_id,
      offgrid_id,
      ongrid_id,
      scheme_name,
      order_no,
      uid_date,
      installed_place,
      unique_id,
      uid,
      pole_no,
      work_order_no,
      capacity,
      amc_date,
      amc_time,
      beneficiary_name,
      beneficiary_contact,
      light_working,
      complaint_raised,
      complaint_ref,
      remarks,
      date_of_installation,
      latitude,
      longitude,
    } = req.body;

    const region = requestLightRegion(req, state);
    if (!region) {
      return res.status(422).json({
        success: false,
        message: REGION_REQUIRED,
      });
    }

    const profile = visitRegionProfile(region);
    const siteId = String((profile ? req.body[profile.site] || ssl_id : ssl_id) || "").trim();
    if (!company_id || !user_id || !siteId || !amc_date || !beneficiary_name || !beneficiary_contact || !light_working) {
      return res.status(400).json({
        success: false,
        message: "Required AMC fields are missing",
      });
    }

    const upStyle = isUpStyleAmcRegion(region);
    const image1 = req.files?.image_1?.[0];
    const image2 = req.files?.image_2?.[0];
    const image3 = req.files?.image_3?.[0];
    const visitAnswers = upStyle ? normalizeUpVisitAnswers(req.body?.visit_answers) : null;

    if (upStyle && !visitAnswers?.plant_status) {
      return res.status(400).json({
        success: false,
        message: "Please select whether the light is functional",
      });
    }

    if (!image1 || !image2 || (upStyle && !image3)) {
      return res.status(400).json({
        success: false,
        message: upStyle
          ? "Please upload the visit slip and both light photos"
          : "Please upload 2 AMC images",
      });
    }

    const amcDate = startOfDay(amc_date);
    if (Number.isNaN(amcDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid AMC date",
      });
    }
    const last = await findLastLightAmc(siteId, company_id, region);
    const installDate = parseInstallDate(date_of_installation);

    let periodStart = last?.period_start
      ? startOfDay(last.period_start)
      : startOfDay(installDate || amcDate);
    const periodEnd = last?.period_end
      ? startOfDay(last.period_end)
      : addMonths(periodStart, 60);

    if (amcDate > periodEnd) {
      return res.status(400).json({
        success: false,
        message: "AMC period of 5 years has ended for this light",
      });
    }

    if (last?.amc_date && !isUserMasterAdmin(req.user)) {
      const dueDate = startOfDay(addMonths(last.amc_date, 3));
      if (amcDate < dueDate) {
        return res.status(400).json({
          success: false,
          message: `Next AMC for this light is due on ${toISODate(dueDate)}`,
        });
      }
    }

    const visitTime = upStyle ? normalizeAmcTime(amc_time) : null;
    if (visitTime === false) {
      return res.status(400).json({
        success: false,
        message: "Enter the visit time as HH:MM",
      });
    }

    const nextAmcDate = addMonths(amcDate, 3);
    const months = Math.max(0, monthDiff(periodStart, amcDate));
    const quarterNo = Math.min(20, Math.floor(months / 3) + 1);

    const row = await createLightAmc({
      company_id,
      user_id,
      region,
      state: region === "bihar" ? state || "Bihar" : "Uttar Pradesh",
      district,
      block,
      panchayat,
      village: village || panchayat,
      ward_no,
      volume,
      ssl_id: siteId,
      pump_id: siteId,
      powerpack_id: powerpack_id || siteId,
      offgrid_id: offgrid_id || siteId,
      ongrid_id: ongrid_id || siteId,
      scheme_name,
      order_no,
      uid_date,
      installed_place,
      unique_id,
      uid: upStyle ? String(uid || "").trim() || null : null,
      fy_year: upStyle ? financialYearLabel(toISODate(amcDate)) : null,
      amc_time: visitTime,
      pole_no,
      work_order_no,
      capacity,
      amc_date: toISODate(amcDate),
      next_amc_date: toISODate(nextAmcDate),
      period_start: toISODate(periodStart),
      period_end: toISODate(periodEnd),
      quarter_no: quarterNo,
      beneficiary_name,
      beneficiary_contact,
      light_working,
      complaint_raised: String(complaint_raised) === "1" || String(complaint_raised).toLowerCase() === "true" || String(complaint_raised).toLowerCase() === "yes",
      complaint_ref,
      image_1: storedPathFromUploadedFile(image1, (name) => `/uploads/light-amc/${name}`),
      image_2: storedPathFromUploadedFile(image2, (name) => `/uploads/light-amc/${name}`),
      image_3: image3
        ? storedPathFromUploadedFile(image3, (name) => `/uploads/light-amc/${name}`)
        : null,
      visit_answers: visitAnswers ? JSON.stringify(visitAnswers) : null,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
      remarks,
    });

    return res.status(201).json({
      success: true,
      message: region === "kusumc"
        ? "KUSUM-C AMC saved successfully"
        : region === "powerpack"
          ? "Power pack AMC saved successfully"
          : region === "offgrid"
            ? "Off grid AMC saved successfully"
            : region === "ongrid"
              ? "On grid AMC saved successfully"
              : "Light AMC saved successfully",
      data: serializeLightAmc(row),
    });
  } catch (error) {
    console.error("STORE LIGHT AMC ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save AMC",
    });
  }
};
