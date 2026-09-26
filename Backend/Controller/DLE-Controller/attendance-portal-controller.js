import prisma from "../../Config/Prisma.js";
import {
  findAttendanceByIdForPortal,
  findAttendanceForPortal,
  findCompanyUserIds,
} from "../../Model/DLE-Model/attendance-portal-model.js";
import { serializeAttendance } from "../../Utils/attendance-utils.js";
import { resolvePortalCompanyId } from "../../Utils/portalCompany.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const enrichAttendanceRows = async (records) => {
  if (!records.length) return [];

  const userIdSet = new Set(records.map((r) => String(r.user_id)));
  const users = await prisma.user.findMany({
    where: {
      id: { in: [...userIdSet].map((id) => BigInt(id)) },
    },
    select: {
      id: true,
      name: true,
      email: true,
      contact_no: true,
      state: true,
      district: true,
      block: true,
      panchayat: true,
      company_id: true,
    },
  });

  const userMap = new Map(users.map((u) => [String(u.id), u]));

  return records.map((record) => {
    const base = serializeAttendance(record);
    const user = userMap.get(String(record.user_id));
    return {
      ...base,
      user_name: user?.name ?? null,
      user_email: user?.email ?? null,
      user_contact_no: user?.contact_no ?? null,
      user_state: user?.state ?? null,
      user_district: user?.district ?? null,
      user_block: user?.block ?? null,
      user_panchayat: user?.panchayat ?? null,
    };
  });
};

export const listAttendanceForPortal = async (req, res) => {
  try {
    const companyId = resolvePortalCompanyId(req);
    if (!companyId) {
      return res.status(422).json({
        success: false,
        message: "company_id is required (or use portal API key authentication).",
      });
    }

    const dateFrom = String(req.query.date_from || req.query.from || "").trim();
    const dateTo = String(req.query.date_to || req.query.to || "").trim();
    const year = req.query.year != null ? Number(req.query.year) : null;
    const month = req.query.month != null ? Number(req.query.month) : null;
    const userId = String(req.query.user_id || "").trim();

    if (dateFrom && !DATE_RE.test(dateFrom)) {
      return res.status(422).json({
        success: false,
        message: "date_from must be YYYY-MM-DD.",
      });
    }
    if (dateTo && !DATE_RE.test(dateTo)) {
      return res.status(422).json({
        success: false,
        message: "date_to must be YYYY-MM-DD.",
      });
    }
    if (userId && !/^\d+$/.test(userId)) {
      return res.status(422).json({
        success: false,
        message: "user_id must be numeric.",
      });
    }

    const companyUserIds = await findCompanyUserIds(companyId);

    const records = await findAttendanceForPortal({
      companyId,
      userId: userId || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      year: Number.isFinite(year) ? year : null,
      month: Number.isFinite(month) ? month : null,
    });

    const data = await enrichAttendanceRows(records);

    return res.json({
      success: true,
      message: "Attendance records fetched successfully.",
      meta: {
        company_id: companyId,
        users_in_company: companyUserIds.length,
        count: data.length,
        filters: {
          user_id: userId || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
          year: Number.isFinite(year) ? year : null,
          month: Number.isFinite(month) ? month : null,
        },
      },
      data,
    });
  } catch (error) {
    console.error("PORTAL ATTENDANCE LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance records.",
    });
  }
};

export const getAttendanceForPortal = async (req, res) => {
  try {
    const companyId = resolvePortalCompanyId(req);
    if (!companyId) {
      return res.status(422).json({
        success: false,
        message: "company_id is required (or use portal API key authentication).",
      });
    }

    const id = req.params.id;
    if (!id || !/^\d+$/.test(String(id))) {
      return res.status(422).json({
        success: false,
        message: "Valid attendance record id is required.",
      });
    }

    const record = await findAttendanceByIdForPortal(id, companyId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found.",
      });
    }

    const [data] = await enrichAttendanceRows([record]);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("PORTAL ATTENDANCE VIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch attendance record.",
    });
  }
};
