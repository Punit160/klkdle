import express from "express";

import { protect } from "../../Middleware/authmiddleware.js";

import { requireUserMasterAdmin } from "../../Middleware/requireUserMasterAdmin.js";

import { userMasterDocumentUpload } from "../../Middleware/userUploadMiddleware.js";

import {

  createUserMasterController,

  getUserMasterController,

  listUsersMasterController,

  updateUserMasterController,

} from "../../Controller/DLE-Controller/user-master-controller.js";

const router = express.Router();



const userDocumentUpload = userMasterDocumentUpload;



router.use(protect, requireUserMasterAdmin);



router.get("/users", listUsersMasterController);

router.get("/users/:id", getUserMasterController);

router.post("/users", userDocumentUpload, createUserMasterController);

router.put("/users/:id", userDocumentUpload, updateUserMasterController);



export default router;


