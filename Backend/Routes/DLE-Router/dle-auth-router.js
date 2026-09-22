import express from "express";

import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  downloadDocument,
  changePassword,
  logoutUser,
  refreshAuthSession,
  uploadProfileImage,
} from "../../Controller/DLE-Controller/dle-auth-contr.js";

import { userProfileImageUpload, userRegistrationDocumentUpload } from "../../Middleware/userUploadMiddleware.js";

const router = express.Router();

router.post("/register", userRegistrationDocumentUpload, registerUser);

router.post("/login", loginUser);

router.post("/refresh", refreshAuthSession);

router.get("/profile", getProfile);

router.post("/logout", logoutUser);

router.put("/profile", updateProfile);

router.patch("/change-password", changePassword);

router.patch("/profile-image", userProfileImageUpload, uploadProfileImage);

router.get(
  "/document/:field",
  downloadDocument
);

export default router;