import express from "express";
import { protect } from "../../Middleware/authmiddleware.js";
import { loadPortalPermissions, requirePortalPermission } from "../../Middleware/requirePortalPermission.js";
import {
  createMyVle,
  listMyVles,
  updateMyVle,
} from "../../Controller/DLE-Controller/vle-team-controller.js";

const router = express.Router();

router.use(protect, loadPortalPermissions, requirePortalPermission("portal.vle.add"));
router.get("/", listMyVles);
router.post("/", createMyVle);
router.put("/:id", updateMyVle);

export default router;
