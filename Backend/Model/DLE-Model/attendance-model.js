import prisma from "../../Config/Prisma.js";
import {
  getAutoPunchOutTime,
  getISTDateString,
  istDateToUTCDate,
  shouldAutoPunchOut,
} from "../../Utils/attendance-utils.js";

export const findOpenAttendanceRecords = async (userId) => {
  return prisma.attendance.findMany({
    where: {
      user_id: BigInt(userId),
      punch_out_at: null,
    },
    orderBy: { attendance_date: "asc" },
  });
};

export const findAttendanceByUserAndDate = async (userId, dateStr) => {
  return prisma.attendance.findUnique({
    where: {
      user_id_attendance_date: {
        user_id: BigInt(userId),
        attendance_date: istDateToUTCDate(dateStr),
      },
    },
  });
};

export const findAttendanceForMonth = async (userId, year, month) => {
  const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return prisma.attendance.findMany({
    where: {
      user_id: BigInt(userId),
      attendance_date: {
        gte: istDateToUTCDate(startStr),
        lte: istDateToUTCDate(endStr),
      },
    },
    orderBy: { attendance_date: "asc" },
  });
};

export const createAttendancePunchIn = async ({
  userId,
  companyId,
  dateStr,
  punchInAt,
  latitude,
  longitude,
}) => {
  return prisma.attendance.create({
    data: {
      user_id: BigInt(userId),
      company_id: companyId ?? null,
      attendance_date: istDateToUTCDate(dateStr),
      punch_in_at: punchInAt,
      punch_in_latitude: latitude ?? null,
      punch_in_longitude: longitude ?? null,
    },
  });
};

export const updateAttendancePunchOut = async ({
  id,
  punchOutAt,
  latitude,
  longitude,
  auto = false,
}) => {
  return prisma.attendance.update({
    where: { id: BigInt(id) },
    data: {
      punch_out_at: punchOutAt,
      punch_out_latitude: latitude ?? null,
      punch_out_longitude: longitude ?? null,
      punch_out_auto: auto ? 1 : 0,
      updated_at: new Date(),
    },
  });
};

export const autoPunchOutOpenRecords = async (userId) => {
  const openRecords = await findOpenAttendanceRecords(userId);
  const now = new Date();
  const autoClosed = [];

  for (const record of openRecords) {
    if (!shouldAutoPunchOut(record, now)) continue;

    const updated = await updateAttendancePunchOut({
      id: record.id,
      punchOutAt: getAutoPunchOutTime(record.punch_in_at),
      latitude: null,
      longitude: null,
      auto: true,
    });

    autoClosed.push(updated);
  }

  return autoClosed;
};
