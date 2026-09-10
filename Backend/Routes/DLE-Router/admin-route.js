import express from "express";

import {
  getPendingUsersController,
  getAllUsersController,
  getUsersByStatusController,
  updateUserStatusController,
  approveUserController
} from "../../Controller/DLE-Controller/admin-controller.js";

const router = express.Router();

router.get("/pending-users", getPendingUsersController);
router.get("/users", getAllUsersController);
router.get("/users-by-status", getUsersByStatusController);
router.post("/approval/status", approveUserController);
router.patch("/approve/:id", (req, res) => {
  req.body.id = req.body.id || req.params.id;
  return approveUserController(req, res);
});
router.patch("/users/:id/status", updateUserStatusController);

export default router;