import express from "express";

import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  downloadDocument,
  changePassword,
  logoutUser,
} from "../../Controller/DLE-Controller/dle-auth-contr.js";

import upload from "../../Middleware/UploadMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  upload.fields([
    {
      name: "educational_document",
      maxCount: 1
    },
    {
      name: "aadhaar_voter_id",
      maxCount: 1
    },
    {
      name: "pan_card",
      maxCount: 1
    },
    {
      name: "driving_license",
      maxCount: 1
    },
    {
      name: "police_verification",
      maxCount: 1
    },
    {
      name: "cancelled_cheque",
      maxCount: 1
    },
    {
      name: "rent_agreement_electricity_bill",
      maxCount: 1
    }
  ]),
  registerUser
);

router.post("/login", loginUser);

router.get("/profile", getProfile);

router.post("/logout", logoutUser);

router.put("/profile", updateProfile);

router.patch("/change-password", changePassword);

router.get(
  "/document/:field",
  downloadDocument
);

export default router;