import express from "express";
import { protect } from "../../Middleware/authmiddleware.js";
import {
  getAttendanceMonth,
  getAttendanceToday,
  punchIn,
  punchOut,
} from "../../Controller/DLE-Controller/attendance-contr.js";

const router = express.Router();

router.use(protect);

router.get("/today", getAttendanceToday);
router.get("/month", getAttendanceMonth);
router.post("/punch-in", punchIn);
router.post("/punch-out", punchOut);

export default router;
