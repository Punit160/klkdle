import prisma from "../../Config/Prisma.js";
import { istDateToUTCDate } from "../../Utils/attendance-utils.js";

export const findCompanyUserIds = async (companyId) => {
  const company = String(companyId || "").trim();
  if (!company) return [];

  const users = await prisma.user.findMany({
    where: { company_id: company },
    select: { id: true },
  });

  return users.map((u) => u.id);
};

export const findAttendanceForPortal = async ({
  companyId,
  userId,
  dateFrom,
  dateTo,
  year,
  month,
}) => {
  const userIds = await findCompanyUserIds(companyId);
  if (!userIds.length) return [];

  let idFilter = userIds;
  if (userId) {
    const uid = BigInt(userId);
    if (!userIds.some((id) => id === uid)) return [];
    idFilter = [uid];
  }

  const where = {
    user_id: { in: idFilter },
  };

  if (dateFrom && dateTo) {
    where.attendance_date = {
      gte: istDateToUTCDate(dateFrom),
      lte: istDateToUTCDate(dateTo),
    };
  } else if (year && month) {
    const y = Number(year);
    const m = Number(month);
    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    where.attendance_date = {
      gte: istDateToUTCDate(startStr),
      lte: istDateToUTCDate(endStr),
    };
  }

  return prisma.attendance.findMany({
    where,
    orderBy: [{ attendance_date: "desc" }, { punch_in_at: "desc" }],
  });
};

export const findAttendanceByIdForPortal = async (id, companyId) => {
  const userIds = await findCompanyUserIds(companyId);
  if (!userIds.length) return null;

  try {
    return await prisma.attendance.findFirst({
      where: {
        id: BigInt(id),
        user_id: { in: userIds },
      },
    });
  } catch {
    return null;
  }
};
