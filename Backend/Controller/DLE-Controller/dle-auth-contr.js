import path from "node:path";

import {
  extractBearerToken,
  signAccessToken,
  verifyAccessToken,
  verifyAccessTokenForRefresh,
} from "../../Utils/jwtAuth.js";

import {
  createUser,
  findUserByEmail,
  findUserById,
  syncLegacyApprovedUser,
  updateUser,
  updateUserProfileImage,
  updateUserPassword,
} from "../../Model/DLE-Model/dle-user-model.js";
import { getPortalPermissionsForUser } from "./portal-rbac-controller.js";
import { mapUserUploadFilesToPaths } from "../../Utils/userUploadPaths.js";
import { storedPathFromUploadedFile } from "../../Utils/amcStoredUploadPath.js";
import {
  getR2PublicUrl,
  parseR2StoredValue,
  readStoredFileBuffer,
} from "../../Utils/objectStorage.js";
import { resolveStoredUploadPath } from "../../Utils/uploadsPath.js";

const resolveUserIdFromToken = (req) => {
  const token = extractBearerToken(req);
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const payload = verifyAccessToken(token);
    return payload?.id?.toString?.() ?? String(payload.id);
  } catch {
    return null;
  }
};

const assertActiveUserForSession = (user) => {
  const approvalStatus = Number(user.approval_status ?? 0);

  if (approvalStatus === 2) {
    const error = new Error(
      user.approval_remarks
        ? `Your application was rejected: ${user.approval_remarks}`
        : "Your application was rejected by admin."
    );
    error.statusCode = 403;
    throw error;
  }

  if (user.status !== 1 || approvalStatus !== 1) {
    const error = new Error("Your account is waiting for admin approval");
    error.statusCode = 403;
    throw error;
  }

  if (!user.password) {
    const error = new Error("Password has not been generated yet");
    error.statusCode = 403;
    throw error;
  }
};

const buildAuthUserPayload = async (user) => {
  const portal_permissions = await getPortalPermissionsForUser(user);

  return {
    id: user.id.toString(),
    company_id: user.company_id,
    state: user.state,
    district: user.district,
    block: user.block,
    panchayat: user.panchayat,
    name: user.name,
    email: user.email,
    email_verified_at: user.email_verified_at,
    contact_no: user.contact_no,
    emergency_contact_no: user.emergency_contact_no,
    police_verification_validity: user.police_verification_validity,
    address: user.address,
    educational_document: user.educational_document,
    aadhaar_voter_id: user.aadhaar_voter_id,
    pan_card: user.pan_card,
    driving_license: user.driving_license,
    police_verification: user.police_verification,
    cancelled_cheque: user.cancelled_cheque,
    rent_agreement_electricity_bill: user.rent_agreement_electricity_bill,
    status: user.status,
    role: Number(user.role ?? 2),
    portal_permissions,
  };
};

export const registerUser = async (req, res) => {
  try {
    const {
      company_id,
      state,
      district,
      block,
      panchayat,
      name,
      email,
      contact_no,
      emergency_contact_no,
      police_verification_validity,
      address
    } = req.body;

    if (!name || !email || !contact_no) {
      return res.status(400).json({
        success: false,
        message: "Name, email and contact number are required"
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const filePaths = mapUserUploadFilesToPaths(req.files || {});

    const userData = {
      company_id,
      state,
      district,
      block,
      panchayat,
      name,
      email,
      contact_no,
      emergency_contact_no,
      police_verification_validity,
      address,
      educational_document: filePaths.educational_document ?? null,
      aadhaar_voter_id: filePaths.aadhaar_voter_id ?? null,
      pan_card: filePaths.pan_card ?? null,
      driving_license: filePaths.driving_license ?? null,
      police_verification: filePaths.police_verification ?? null,
      cancelled_cheque: filePaths.cancelled_cheque ?? null,
      rent_agreement_electricity_bill: filePaths.rent_agreement_electricity_bill ?? null,
    };

    const result = await createUser(userData);

    return res.status(201).json({
      success: true,
      message:
        "Registration submitted successfully. Please wait for admin approval.",
      userId: result?.id?.toString?.() ?? result?.id
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
};


export const loginUser = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    let user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user = await syncLegacyApprovedUser(user);

    try {
      assertActiveUserForSession(user);
    } catch (sessionErr) {
      return res.status(sessionErr.statusCode || 403).json({
        success: false,
        message: sessionErr.message,
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured",
      });
    }

    // Plain password comparison
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signAccessToken(user);
    const authUser = await buildAuthUserPayload(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: authUser,
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};


export const getProfile = async (req, res) => {
  try {
    const tokenUserId = resolveUserIdFromToken(req);

    if (!tokenUserId) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const userId = req.query.userId || tokenUserId;

    if (String(userId) !== String(tokenUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own profile",
      });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { password, ...safeUser } = user;

    // BigInt -> String
    if (safeUser.id !== undefined && safeUser.id !== null) {
      safeUser.id = safeUser.id.toString();
    }

    const portal_permissions = await getPortalPermissionsForUser(safeUser);

    return res.status(200).json({
      success: true,
      user: {
        ...safeUser,
        role: Number(safeUser.role ?? 2),
        portal_permissions,
      },
    });

  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const tokenUserId = resolveUserIdFromToken(req);

    if (!tokenUserId) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const userId = req.query.userId || tokenUserId;

    if (String(userId) !== String(tokenUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile",
      });
    }

    await updateUser(userId, req.body);

    const updatedUser = await findUserById(userId);

    const { password, ...safeUser } = updatedUser;

    if (safeUser.id !== undefined && safeUser.id !== null) {
      safeUser.id = safeUser.id.toString();
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: safeUser,
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
};


export const downloadDocument = async (req, res) => {
  try {
    const { field } = req.params;
    const tokenUserId = resolveUserIdFromToken(req);

    if (!tokenUserId) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const userId = req.query.userId || tokenUserId;

    if (String(userId) !== String(tokenUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only download your own documents",
      });
    }

    const allowedFields = [
      "educational_document",
      "aadhaar_voter_id",
      "pan_card",
      "driving_license",
      "police_verification",
      "cancelled_cheque",
      "rent_agreement_electricity_bill",
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document",
      });
    }

    const user = await findUserById(userId);

    if (!user || !user[field]) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const stored = user[field];
    const r2Key = parseR2StoredValue(stored);
    if (r2Key) {
      const publicUrl = getR2PublicUrl(r2Key);
      if (publicUrl) {
        return res.redirect(302, publicUrl);
      }
    }

    if (/^https?:\/\//i.test(String(stored || ""))) {
      return res.redirect(302, stored);
    }

    const buffer = await readStoredFileBuffer(stored);
    if (buffer) {
      const fileName = path.basename(String(stored).replace(/^r2:[^/]+\//, ""));
      const ext = path.extname(fileName).toLowerCase();
      const contentType =
        ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      return res.send(buffer);
    }

    const filePath = resolveStoredUploadPath(stored);
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    return res.download(filePath, path.basename(filePath));

  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Document download failed",
    });
  }
};


export const uploadProfileImage = async (req, res) => {
  try {
    const tokenUserId = resolveUserIdFromToken(req);

    if (!tokenUserId) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const userId = req.query.userId || tokenUserId;

    if (String(userId) !== String(tokenUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own profile photo",
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Profile image is required",
      });
    }

    const profileImage = storedPathFromUploadedFile(file, (name) =>
      `/uploads/user/profile/${name}`
    );

    if (!profileImage) {
      return res.status(500).json({
        success: false,
        message: "Failed to store profile photo",
      });
    }

    await updateUserProfileImage(userId, profileImage);

    const updatedUser = await findUserById(userId);
    const { password, ...safeUser } = updatedUser;

    if (safeUser.id !== undefined && safeUser.id !== null) {
      safeUser.id = safeUser.id.toString();
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      user: safeUser,
    });
  } catch (error) {
    console.error("UPLOAD PROFILE IMAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload profile photo",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const tokenUserId = resolveUserIdFromToken(req);

    if (!tokenUserId) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    const {
      userId: bodyUserId,
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    const userId = bodyUserId || tokenUserId;

    if (String(userId) !== String(tokenUserId)) {
      return res.status(403).json({
        success: false,
        message: "You can only change your own password",
      });
    }

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 8 characters",
      });
    }

    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password not found",
      });
    }

    // Check current plain password
    if (currentPassword !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Prevent same password
    if (newPassword === user.password) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be different from current password",
      });
    }

    // Save plain password directly
    await updateUserPassword(
      userId,
      newPassword
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

export const refreshAuthSession = async (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured",
      });
    }

    let payload;
    try {
      ({ payload } = verifyAccessTokenForRefresh(token));
    } catch (err) {
      return res.status(err.statusCode || 401).json({
        success: false,
        message: err.message || "Invalid or expired token",
      });
    }

    const userId = payload?.id?.toString?.() ?? String(payload.id);
    let user = await findUserById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    user = await syncLegacyApprovedUser(user);

    try {
      assertActiveUserForSession(user);
    } catch (sessionErr) {
      return res.status(sessionErr.statusCode || 403).json({
        success: false,
        message: sessionErr.message,
      });
    }

    const nextToken = signAccessToken(user);
    const authUser = await buildAuthUserPayload(user);

    return res.status(200).json({
      success: true,
      message: "Session refreshed",
      token: nextToken,
      user: authUser,
    });
  } catch (error) {
    console.error("REFRESH SESSION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh session",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};