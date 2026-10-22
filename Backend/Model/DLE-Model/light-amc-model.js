import prisma from "../../Config/Prisma.js";
import { serializeAmcApprovalFields } from "../../Utils/amcApproval.js";

const VISIT_REGIONS = {
  kusumc: { site: "pump_id", working: "pump_working" },
  powerpack: { site: "powerpack_id", working: "powerpack_working", scheme: true },
  offgrid: { site: "offgrid_id", working: "working_status", scheme: true, place: true },
  ongrid: { site: "ongrid_id", working: "working_status", scheme: true, place: true },
};

export const visitRegionProfile = (region) => VISIT_REGIONS[region] || null;

export const lightAmcRegionOf = (value) => {
  const text = String(value || "").trim().toLowerCase();
  const compact = text.replace(/[\s_-]/g, "");
  if (!text) return null;
  if (compact.includes("powerpack")) return "powerpack";
  if (compact.includes("offgrid")) return "offgrid";
  if (compact.includes("ongrid")) return "ongrid";
  if (text === "kusumc" || text.includes("kusum")) return "kusumc";
  if (text === "up" || text.includes("uttar")) return "up";
  if (text === "bihar" || text === "br" || text.includes("bihar")) return "bihar";
  return null;
};

export const isUpStyleAmcRegion = (region) =>
  region === "up" || Boolean(visitRegionProfile(region));

const knownLightAmcRegion = (region) =>
  region === "up" || region === "bihar" || visitRegionProfile(region) ? region : null;

export const lightAmcTable = (region) => {
  if (region === "powerpack") return prisma.upPowerPackAmc;
  if (region === "offgrid") return prisma.upOffgridAmc;
  if (region === "ongrid") return prisma.upOngridAmc;
  if (region === "kusumc") return prisma.upKusmcAmc;
  if (region === "up") return prisma.upLightAmc;
  return prisma.biharLightAmc;
};

const workingValue = (data) =>
  data.light_working || data.pump_working || data.powerpack_working || data.working_status || null;

const tableFor = ({ region, state } = {}) =>
  lightAmcTable(knownLightAmcRegion(region) || lightAmcRegionOf(state) || "bihar");

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseStoredVisitAnswers = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const serializeLightAmc = (row) => {
  if (!row) return null;

  const iso = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  return {
    ...row,
    id: row.id?.toString(),
    ...(row.ssl_id == null && (row.pump_id != null || row.powerpack_id != null || row.offgrid_id != null || row.ongrid_id != null)
      ? {
          ssl_id: row.ongrid_id ?? row.offgrid_id ?? row.powerpack_id ?? row.pump_id,
          panchayat: row.village ?? null,
        }
      : {}),
    ...(row.light_working == null
      ? { light_working: row.pump_working ?? row.powerpack_working ?? row.working_status ?? null }
      : {}),
    amc_date: iso(row.amc_date),
    next_amc_date: iso(row.next_amc_date),
    period_start: iso(row.period_start),
    period_end: iso(row.period_end),
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...(Object.prototype.hasOwnProperty.call(row, "visit_answers")
      ? { visit_answers: parseStoredVisitAnswers(row.visit_answers) }
      : {}),
    ...serializeAmcApprovalFields(row),
  };
};

export const findLastLightAmc = async (sslId, companyId, region = "bihar") => {
  const profile = visitRegionProfile(region);
  const where = profile ? { [profile.site]: String(sslId) } : { ssl_id: String(sslId) };
  if (companyId) where.company_id = String(companyId);

  const row = await lightAmcTable(region).findFirst({
    where,
    orderBy: { amc_date: "desc" },
  });

  return row;
};

const scopeWhere = ({ companyId, state, userId } = {}) => {
  const where = {};
  if (companyId) where.company_id = String(companyId);
  if (state) where.state = String(state);
  if (userId) where.user_id = String(userId);
  return where;
};

const workingFieldOf = (region) => visitRegionProfile(region)?.working || "light_working";

/** First saved visit is quarter 1. Each later visit is the next number, up to 20. */
export const nextLightAmcQuarter = (lastQuarter) => {
  const previous = Number(lastQuarter);
  if (!Number.isFinite(previous) || previous < 1) return 1;
  return Math.min(20, previous + 1);
};

const siteFieldOf = (region) => visitRegionProfile(region)?.site || "ssl_id";

const TABLE_SQL = {
  bihar: { table: "bihar_light_amcs", site: "ssl_id" },
  up: { table: "up_light_amcs", site: "ssl_id" },
  kusumc: { table: "up_kusumc_amcs", site: "pump_id" },
  powerpack: { table: "up_powerpack_amcs", site: "powerpack_id" },
  offgrid: { table: "up_off_grid_amcs", site: "offgrid_id" },
  ongrid: { table: "up_on_grid_amcs", site: "ongrid_id" },
};

const listWhere = ({ companyId, state, userId, region, working, district } = {}) => {
  const where = scopeWhere({ companyId, state, userId });
  const districtText = String(district || "").trim();
  if (districtText) where.district = districtText;
  const field = workingFieldOf(region);
  if (working === "Yes") where[field] = "Yes";
  else if (working === "No") where[field] = { not: "Yes" };
  return where;
};

const countDistinctSites = async (region, { companyId, state, userId } = {}) => {
  const sql = TABLE_SQL[knownLightAmcRegion(region) || lightAmcRegionOf(region) || "bihar"];
  if (!sql) return 0;
  const filters = ["1=1"];
  if (companyId) filters.push(`company_id = '${String(companyId).replace(/'/g, "''")}'`);
  if (state) filters.push(`state = '${String(state).replace(/'/g, "''")}'`);
  if (userId) filters.push(`user_id = '${String(userId).replace(/'/g, "''")}'`);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT \`${sql.site}\`) AS total FROM \`${sql.table}\` WHERE ${filters.join(" AND ")}`
  );
  return Number(rows?.[0]?.total || 0);
};

export const findLightAmcSummary = async ({ companyId, state, userId, region } = {}) => {
  const table = tableFor({ region, state });
  const where = scopeWhere({ companyId, state, userId });
  const field = workingFieldOf(region);
  const [total, working, districtGroups, districts] = await Promise.all([
    table.count({ where }),
    table.count({ where: { ...where, [field]: "Yes" } }),
    table.groupBy({
      by: ["district", field],
      where,
      _count: { _all: true },
    }),
    table.findMany({
      where,
      distinct: ["district"],
      select: { district: true },
    }),
  ]);

  const byDistrict = new Map();
  districtGroups.forEach((group) => {
    const name = String(group.district || "").trim();
    if (!name) return;
    const current = byDistrict.get(name) || { district: name, total: 0, working: 0, notWorking: 0 };
    const count = group._count?._all || 0;
    current.total += count;
    if (group[field] === "Yes") current.working += count;
    else current.notWorking += count;
    byDistrict.set(name, current);
  });

  return {
    total,
    working,
    notWorking: Math.max(0, total - working),
    uniqueAssets: await countDistinctSites(region, { companyId, state, userId }),
    districts: districts
      .map((row) => String(row.district || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
    districtRows: [...byDistrict.values()].sort((a, b) => b.total - a.total),
  };
};

export const findLightAmcPage = async ({
  companyId,
  state,
  userId,
  region,
  working,
  district,
  page = 1,
  limit = 20,
} = {}) => {
  const table = tableFor({ region, state });
  const where = listWhere({ companyId, state, userId, region, working, district });
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const [rows, total, summary] = await Promise.all([
    table.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    table.count({ where }),
    findLightAmcSummary({ companyId, state, userId, region }),
  ]);

  return {
    rows,
    total,
    page: safePage,
    limit: safeLimit,
    summary,
  };
};

export const findLightAmcs = async ({ companyId, state, userId, region } = {}) => {
  const where = scopeWhere({ companyId, state, userId });

  const rows = await tableFor({ region, state }).findMany({
    where,
    orderBy: { created_at: "desc" },
  });

  return rows;
};

export const findLightAmcById = async (id, companyId, userId, region = "bihar") => {
  if (!id) return null;

  try {
    const where = { id: BigInt(id) };
    if (companyId) where.company_id = String(companyId);
    if (userId) where.user_id = String(userId);
    return await lightAmcTable(region).findFirst({ where });
  } catch {
    return null;
  }
};

export const findRecentLightAmcs = async ({
  companyId,
  state,
  userId,
  district,
  block,
  panchayat,
  withinDays = 80,
  region,
} = {}) => {
  const days = Math.max(1, Number(withinDays) || 80);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const where = {
    amc_date: {
      gte: cutoff,
    },
  };

  if (companyId) where.company_id = String(companyId);
  if (state) where.state = String(state);
  if (userId) where.user_id = String(userId);

  const rows = await tableFor({ region, state }).findMany({
    where,
    orderBy: { amc_date: "desc" },
  });

  const norm = (value) => String(value || "").trim().toLowerCase();
  return rows.filter((row) => {
    if (district && norm(row.district) && norm(row.district) !== norm(district)) return false;
    if (block && norm(row.block) && norm(row.block) !== norm(block)) return false;
    const locality = row.panchayat || row.village;
    if (panchayat && norm(locality) && norm(locality) !== norm(panchayat)) return false;
    return true;
  });
};

export const findLightAmcsInPeriod = async ({
  companyId,
  userId,
  district,
  block,
  panchayat,
  startMonth,
  endMonth,
  state,
  region,
} = {}) => {
  if (!startMonth) return [];

  const [startYear, startMon] = String(startMonth).split("-").map(Number);
  const [endYear, endMon] = String(endMonth || startMonth).split("-").map(Number);
  if (!startYear || !startMon || !endYear || !endMon) return [];

  const periodStart = new Date(startYear, startMon - 1, 1);
  const periodEnd = new Date(endYear, endMon, 0, 23, 59, 59, 999);

  const where = {
    amc_date: {
      gte: periodStart,
      lte: periodEnd,
    },
  };

  if (companyId) where.company_id = String(companyId);
  if (userId) where.user_id = String(userId);

  const rows = await tableFor({ region, state }).findMany({
    where,
    orderBy: { amc_date: "desc" },
  });

  const norm = (value) => String(value || "").trim().toLowerCase();
  return rows.filter((row) => {
    if (district && norm(row.district) && norm(row.district) !== norm(district)) return false;
    if (block && norm(row.block) && norm(row.block) !== norm(block)) return false;
    const locality = row.panchayat || row.village;
    if (panchayat && norm(locality) && norm(locality) !== norm(panchayat)) return false;
    return true;
  });
};

export const createLightAmc = async (data) => {
  const region = knownLightAmcRegion(data.region) || lightAmcRegionOf(data.state) || "bihar";
  const upStyle = isUpStyleAmcRegion(region);
  const row = await lightAmcTable(region).create({
    data: {
      company_id: String(data.company_id),
      user_id: String(data.user_id),
      state: data.state || "",
      district: data.district || null,
      block: data.block || null,
      volume: data.volume || null,
      ...(visitRegionProfile(region)
        ? {
            village: data.village || data.panchayat || null,
            work_order_no: data.work_order_no || null,
            capacity: data.capacity || null,
            [visitRegionProfile(region).site]: String(data[visitRegionProfile(region).site] || data.ssl_id),
            [visitRegionProfile(region).working]: workingValue(data),
            ...(visitRegionProfile(region).scheme
              ? {
                  uid_date: data.uid_date || null,
                  scheme_name: data.scheme_name || "",
                  order_no: data.order_no || "",
                }
              : {}),
            ...(visitRegionProfile(region).place
              ? { installed_place: data.installed_place || null }
              : {}),
          }
        : {
            panchayat: data.panchayat || null,
            ward_no: data.ward_no || null,
            ssl_id: String(data.ssl_id),
            unique_id: data.unique_id || null,
            pole_no: data.pole_no || null,
            light_working: workingValue(data),
          }),
      ...(upStyle
        ? {
            uid: data.uid || null,
            fy_year: data.fy_year || null,
            amc_time: data.amc_time || null,
          }
        : {}),
      amc_date: toDate(data.amc_date),
      next_amc_date: toDate(data.next_amc_date),
      period_start: toDate(data.period_start),
      period_end: toDate(data.period_end),
      quarter_no: Number(data.quarter_no) || 1,
      beneficiary_name: data.beneficiary_name,
      beneficiary_contact: data.beneficiary_contact,
      complaint_raised: data.complaint_raised ? 1 : 0,
      complaint_ref: data.complaint_ref || null,
      image_1: data.image_1 || null,
      image_2: data.image_2 || null,
      ...(upStyle
        ? {
            image_3: data.image_3 || null,
            visit_answers: data.visit_answers || null,
          }
        : {}),
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      remarks: data.remarks || null,
    },
  });

  return row;
};

export const updateLightAmcById = async (id, region, data) => {
  const next = { ...data };
  const profile = visitRegionProfile(region);
  if (profile) {
    const working = next.light_working ?? next.pump_working ?? next.powerpack_working ?? next.working_status;
    delete next.light_working;
    delete next.pump_working;
    delete next.powerpack_working;
    delete next.working_status;
    delete next.ssl_id;
    delete next.panchayat;
    delete next.ward_no;
    delete next.unique_id;
    delete next.pole_no;
    if (working != null) next[profile.working] = working;
  }
  return lightAmcTable(region).update({
    where: { id: BigInt(id) },
    data: next,
  });
};
