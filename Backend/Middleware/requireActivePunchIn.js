import {
  autoPunchOutOpenRecords,
  findAttendanceByUserAndDate,
} from "../Model/DLE-Model/attendance-model.js";
import { getISTDateString } from "../Utils/attendance-utils.js";

/** Field work (Bihar / UP modules) allowed only while user is punched in today. */
export const requireActivePunchIn = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authorization required.",
      });
    }

    await autoPunchOutOpenRecords(userId);
    const todayStr = getISTDateString(new Date());
    const today = await findAttendanceByUserAndDate(userId, todayStr);

    if (!today || today.punch_out_at) {
      return res.status(403).json({
        success: false,
        code: "PUNCH_IN_REQUIRED",
        message:
          "Please punch in from the dashboard before using Bihar or UP modules.",
      });
    }

    next();
  } catch (error) {
    console.error("PUNCH IN GATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Could not verify attendance.",
    });
  }
};
