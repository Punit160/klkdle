import { findUserById } from "../../Model/DLE-Model/dle-user-model.js";
import {
  autoPunchOutOpenRecords,
  createAttendancePunchIn,
  findAttendanceByUserAndDate,
  findAttendanceForMonth,
  updateAttendancePunchOut,
} from "../../Model/DLE-Model/attendance-model.js";
import {
  getISTDateString,
  serializeAttendance,
} from "../../Utils/attendance-utils.js";

const getUserId = (req) => req.user?.id;

export const getAttendanceToday = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const autoClosed = await autoPunchOutOpenRecords(userId);
    const todayStr = getISTDateString(new Date());
    const today = await findAttendanceByUserAndDate(userId, todayStr);

    return res.json({
      success: true,
      today: serializeAttendance(today),
      is_punched_in: !!(today && !today.punch_out_at),
      auto_closed: autoClosed.map(serializeAttendance),
    });
  } catch (error) {
    console.error("GET ATTENDANCE TODAY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load attendance",
    });
  }
};

export const getAttendanceMonth = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    await autoPunchOutOpenRecords(userId);

    const records = await findAttendanceForMonth(userId, year, month);

    return res.json({
      success: true,
      year,
      month,
      records: records.map(serializeAttendance),
    });
  } catch (error) {
    console.error("GET ATTENDANCE MONTH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load attendance calendar",
    });
  }
};

export const punchIn = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await autoPunchOutOpenRecords(userId);

    const todayStr = getISTDateString(new Date());
    const existing = await findAttendanceByUserAndDate(userId, todayStr);

    if (existing) {
      if (!existing.punch_out_at) {
        return res.status(409).json({
          success: false,
          message: "You are already punched in for today",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Today's attendance is already completed",
      });
    }

    const user = await findUserById(userId);
    const { latitude, longitude } = req.body || {};

    const record = await createAttendancePunchIn({
      userId,
      companyId: user?.company_id,
      dateStr: todayStr,
      punchInAt: new Date(),
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
    });

    return res.status(201).json({
      success: true,
      message: "Punch in successful",
      record: serializeAttendance(record),
    });
  } catch (error) {
    console.error("PUNCH IN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Punch in failed",
    });
  }
};

export const punchOut = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const todayStr = getISTDateString(new Date());
    const existing = await findAttendanceByUserAndDate(userId, todayStr);

    if (!existing || existing.punch_out_at) {
      return res.status(400).json({
        success: false,
        message: "No active punch in found for today",
      });
    }

    const { latitude, longitude } = req.body || {};

    const record = await updateAttendancePunchOut({
      id: existing.id,
      punchOutAt: new Date(),
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
      auto: false,
    });

    return res.json({
      success: true,
      message: latitude || longitude
        ? "Punch out successful"
        : "Punch out successful (location unavailable)",
      record: serializeAttendance(record),
    });
  } catch (error) {
    console.error("PUNCH OUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Punch out failed",
    });
  }
};
