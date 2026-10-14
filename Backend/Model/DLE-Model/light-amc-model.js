import prisma from "../../Config/Prisma.js";
import { serializeAmcApprovalFields } from "../../Utils/amcApproval.js";

export const lightAmcRegionOf = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  if (text === "up" || text.includes("uttar")) return "up";
  if (text === "bihar" || text === "br" || text.includes("bihar")) return "bihar";
  return null;
};

export const lightAmcTable = (region) =>
  region === "up" ? prisma.upLightAmc : prisma.biharLightAmc;

const tableFor = ({ region, state } = {}) =>
  lightAmcTable(
    region === "up" || region === "bihar" ? region : lightAmcRegionOf(state) || "bihar"
  );

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
  const where = { ssl_id: String(sslId) };
  if (companyId) where.company_id = String(companyId);

  const row = await lightAmcTable(region).findFirst({
    where,
    orderBy: { amc_date: "desc" },
  });

  return row;
};

export const findLightAmcs = async ({ companyId, state, userId, region } = {}) => {
  const where = {};
  if (companyId) where.company_id = String(companyId);
  if (state) where.state = String(state);
  if (userId) where.user_id = String(userId);

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
    if (panchayat && norm(row.panchayat) && norm(row.panchayat) !== norm(panchayat)) return false;
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
    if (panchayat && norm(row.panchayat) && norm(row.panchayat) !== norm(panchayat)) return false;
    return true;
  });
};

export const createLightAmc = async (data) => {
  const region = data.region === "up" || data.region === "bihar" ? data.region : lightAmcRegionOf(data.state) || "bihar";
  const row = await lightAmcTable(region).create({
    data: {
      company_id: String(data.company_id),
      user_id: String(data.user_id),
      state: data.state || "",
      district: data.district || null,
      block: data.block || null,
      panchayat: data.panchayat || null,
      ward_no: data.ward_no || null,
      volume: data.volume || null,
      ssl_id: String(data.ssl_id),
      unique_id: data.unique_id || null,
      pole_no: data.pole_no || null,
      amc_date: toDate(data.amc_date),
      next_amc_date: toDate(data.next_amc_date),
      period_start: toDate(data.period_start),
      period_end: toDate(data.period_end),
      quarter_no: Number(data.quarter_no) || 1,
      beneficiary_name: data.beneficiary_name,
      beneficiary_contact: data.beneficiary_contact,
      light_working: data.light_working,
      complaint_raised: data.complaint_raised ? 1 : 0,
      complaint_ref: data.complaint_ref || null,
      image_1: data.image_1 || null,
      image_2: data.image_2 || null,
      ...(region === "up"
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
