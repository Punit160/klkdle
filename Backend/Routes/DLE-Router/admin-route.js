import express from "express";

import {
  getPendingUsersController,
  approveUserController
} from "../../Controller/DLE-Controller/admin-controller.js";

const router = express.Router();

router.get("/pending-users", getPendingUsersController);
router.patch("/approve/:id", approveUserController);

export default router;