import prisma from "../../Config/Prisma.js";
import { getISTDateString, istDateToUTCDate } from "../../Utils/attendance-utils.js";
import { getAllDistricts as getBiharDistricts } from "./Bihar-SSL/Bihar_amc_controller.js";
import { getAllDistricts as getUpDistricts } from "./UP-SSL/UP_amc_controller.js";
import { getDailyWorkReport } from "./daily-work-report-controller.js";
import { findLightAmcs, serializeLightAmc } from "../../Model/DLE-Model/light-amc-model.js";

const invokeJson = (handler, req) =>
  new Promise((resolve, reject) => {
    let status = 200;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json(body) {
        resolve({ status, body });
        return body;
      },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });

const fieldSummary = (rows) => {
  const working = rows.filter((row) => row.light_working === "Yes").length;
  const districts = new Set(rows.map((row) => String(row.district || "").trim()).filter(Boolean));
  return {
    total: rows.length,
    working,
    not_working: rows.length - working,
    districts: districts.size,
    recent: rows.slice(0, 8).map((row) => ({
      id: row.id,
      amc_date: row.amc_date,
      unique_id: row.unique_id || row.ssl_id || null,
      pole_no: row.pole_no || null,
      district: row.district || null,
      block: row.block || null,
      panchayat: row.panchayat || null,
      light_working: row.light_working,
      latitude: row.latitude || null,
      longitude: row.longitude || null,
    })),
  };
};

const ulaSummary = (rows) => {
  const summary = {
    total: rows.length,
    first_incomplete: 0,
    second_pending: 0,
    visits_complete: 0,
    complete_on_first: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  rows.forEach((row) => {
    const firstDone = Boolean(String(row.system_img || "").trim());
    const secondDone = Boolean(
      String(row.system_img2 || "").trim() && String(row.solar_meter_img2 || "").trim()
    );
    const solarOnFirst = Boolean(String(row.solar_meter_img || "").trim());
    const complete = firstDone && (secondDone || solarOnFirst);
    if (!firstDone) summary.first_incomplete += 1;
    else if (!complete) summary.second_pending += 1;
    else summary.visits_complete += 1;
    if (firstDone && solarOnFirst && !secondDone) summary.complete_on_first += 1;
    const approval = Number(row.approval_status || 0);
    if (approval === 1) summary.approved += 1;
    else if (approval === 2) summary.rejected += 1;
    else summary.pending += 1;
  });
  return summary;
};

export const getDlePortalDashboard = async (req, res) => {
  try {
    const companyId = String(req.portalCompanyId || "").trim();
    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Use the portal API key and secret to open the DLE dashboard.",
      });
    }

    const dateStr = String(req.query.date || getISTDateString(new Date())).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(422).json({ success: false, message: "Date must be YYYY-MM-DD." });
    }

    const portalReq = {
      portalCompanyId: companyId,
      portalAuthMode: req.portalAuthMode,
      query: { date: dateStr },
      user: null,
    };

    const [biharDocs, upDocs, biharField, upField, ulaRows, attendance, work] = await Promise.all([
      invokeJson(getBiharDistricts, portalReq),
      invokeJson(getUpDistricts, portalReq),
      findLightAmcs({ companyId, state: "Bihar" }),
      findLightAmcs({ companyId, state: "Uttar Pradesh" }),
      prisma.biharUlaSurvey.findMany({
        where: { company_id: companyId },
        select: {
          system_img: true,
          solar_meter_img: true,
          system_img2: true,
          solar_meter_img2: true,
          approval_status: true,
        },
      }),
      prisma.attendance.findMany({
        where: {
          company_id: companyId,
          attendance_date: istDateToUTCDate(dateStr),
        },
        select: { punch_out_at: true },
      }),
      invokeJson(getDailyWorkReport, portalReq),
    ]);

    if (!biharDocs.body?.success) {
      return res.status(biharDocs.status || 500).json(biharDocs.body);
    }
    if (!upDocs.body?.success) {
      return res.status(upDocs.status || 500).json(upDocs.body);
    }
    if (!work.body?.success) {
      return res.status(work.status || 500).json(work.body);
    }

    const stillOpen = attendance.filter((row) => !row.punch_out_at).length;
    const workUsers = work.body.users || [];

    return res.json({
      success: true,
      date: dateStr,
      company_id: companyId,
      bihar: {
        documentation: {
          summary: biharDocs.body.summary,
          districts: biharDocs.body.districts || [],
        },
        field_amc: fieldSummary(biharField.map(serializeLightAmc)),
      },
      up: {
        documentation: {
          summary: upDocs.body.summary,
          districts: upDocs.body.districts || [],
        },
        field_amc: fieldSummary(upField.map(serializeLightAmc)),
      },
      ula: ulaSummary(ulaRows),
      attendance: {
        records: attendance.length,
        still_open: stillOpen,
        punched_out: attendance.length - stillOpen,
      },
      daily_work: {
        people: workUsers.length,
        sites: workUsers.reduce((sum, user) => sum + Number(user.site_count || 0), 0),
        distance_km:
          Math.round(workUsers.reduce((sum, user) => sum + Number(user.distance_km || 0), 0) * 100) / 100,
        users: workUsers,
      },
      endpoints: {
        dle_dashboard: "/api/portal/integration/dle-dashboard",
        bihar_documentation: "/api/bihar/amc/get",
        bihar_documentation_dashboard: "/api/bihar/amc/dashboard/district",
        bihar_field_amc: "/api/bihar/amc/light/list",
        bihar_field_working: "/api/bihar/amc/light/list?working=Yes",
        bihar_field_not_working: "/api/bihar/amc/light/list?working=No",
        bihar_approve: "/api/bihar/amc/approval/status",
        up_documentation: "/api/up/amc/get",
        up_documentation_dashboard: "/api/up/amc/dashboard/district",
        up_field_amc: "/api/up/amc/light/list",
        up_field_working: "/api/up/amc/light/list?working=Yes",
        up_field_not_working: "/api/up/amc/light/list?working=No",
        up_approve: "/api/up/amc/approval/status",
        ula_report: "/api/bihar/ula/report",
        ula_list: "/api/bihar/ula/list",
        ula_pending: "/api/bihar/ula/approval/pending",
        ula_approve: "/api/bihar/ula/approval/status",
        attendance: "/api/attendance/integration/list",
        daily_work: "/api/attendance/integration/work-report",
      },
    });
  } catch (error) {
    console.error("DLE PORTAL DASHBOARD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load the DLE dashboard.",
    });
  }
};
