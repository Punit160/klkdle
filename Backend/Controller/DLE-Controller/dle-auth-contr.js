import jwt from "jsonwebtoken";

import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  updateUserPassword,
} from "../../Model/DLE-Model/dle-user-model.js";


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

    const files = req.files || {};

    // ==========================================
    // FILE PATHS
    // ==========================================

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

      educational_document:
        files.educational_document?.[0]
          ? `/uploads/user/documents/${files.educational_document[0].filename}`
          : null,

      aadhaar_voter_id:
        files.aadhaar_voter_id?.[0]
          ? `/uploads/user/aadhaar/${files.aadhaar_voter_id[0].filename}`
          : null,

      pan_card:
        files.pan_card?.[0]
          ? `/uploads/user/pan/${files.pan_card[0].filename}`
          : null,

      driving_license:
        files.driving_license?.[0]
          ? `/uploads/user/driving-license/${files.driving_license[0].filename}`
          : null,

      police_verification:
        files.police_verification?.[0]
          ? `/uploads/user/police-verification/${files.police_verification[0].filename}`
          : null,

      cancelled_cheque:
        files.cancelled_cheque?.[0]
          ? `/uploads/user/cancelled-cheque/${files.cancelled_cheque[0].filename}`
          : null,

      rent_agreement_electricity_bill:
        files.rent_agreement_electricity_bill?.[0]
          ? `/uploads/user/rent-agreement/${files.rent_agreement_electricity_bill[0].filename}`
          : null
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

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: "Your account is waiting for admin approval",
      });
    }

    if (!user.password) {
      return res.status(403).json({
        success: false,
        message: "Password has not been generated yet",
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

    // BigInt -> String for JWT
    const token = jwt.sign(
      {
        id: user.id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,

      user: {
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
        police_verification_validity:
          user.police_verification_validity,
        address: user.address,

        educational_document:
          user.educational_document,

        aadhaar_voter_id:
          user.aadhaar_voter_id,

        pan_card:
          user.pan_card,

        driving_license:
          user.driving_license,

        police_verification:
          user.police_verification,

        cancelled_cheque:
          user.cancelled_cheque,

        rent_agreement_electricity_bill:
          user.rent_agreement_electricity_bill,

        status: user.status,
      },
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
    let userId = req.query.userId;

    if (!userId) {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (token && process.env.JWT_SECRET) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          userId = payload?.id;
        } catch {
          return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
          });
        }
      }
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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

    return res.status(200).json({
      success: true,
      user: safeUser,
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
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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
    const userId = req.query.userId;

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

    const path = await import("path");

    const filePath = path.join(
      process.cwd(),
      "uploads",
      user[field]
    );

    return res.download(
      filePath,
      user[field]
    );

  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Document download failed",
    });
  }
};


export const changePassword = async (req, res) => {
  try {
    const {
      userId,
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    if (
      !userId ||
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