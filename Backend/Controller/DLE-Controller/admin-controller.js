import {
  getPendingUsers,
  getUsersByStatus,
  getAllUsers,
  findUserById,
  updateUserStatus,
  updateUserPassword
} from "../../Model/DLE-Model/dle-user-model.js";

import { generatePassword } from "../../Utils/password.js";
import prisma from "../../Config/Prisma.js";

import { sendApprovalEmail, sendRejectionEmail } from "../../Utils/Nodemailer.js";

// Status codes
const STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

export const getPendingUsersController = async (req, res) => {
  try {
    const users = await getPendingUsers();

    return res.status(200).json({
      success: true,
      users: users.map(sanitizeUser),
    });

  } catch (error) {
    console.error("GET PENDING USERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending users"
    });
  }
};

export const getUsersByStatusController = async (req, res) => {
  try {
    const { status } = req.query; // ?status=0 | 1 | 2

    if (status === undefined) {
      const users = await getAllUsers();
      return res.status(200).json({
        success: true,
        users: users.map(sanitizeUser),
      });
    }

    const statusNum = Number(status);

    if (![STATUS.PENDING, STATUS.APPROVED, STATUS.REJECTED].includes(statusNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    const users = await getUsersByStatus(statusNum);

    return res.status(200).json({
      success: true,
      users: users.map(sanitizeUser),
    });

  } catch (error) {
    console.error("GET USERS BY STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users"
    });
  }
};


/* =========================================================
   UPDATE USER STATUS
   body: { status: 0 | 1 | 2, remark: "optional/mandatory for reject" }
========================================================= */

export const updateUserStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    const statusNum = Number(status);

    if (![STATUS.PENDING, STATUS.APPROVED, STATUS.REJECTED].includes(statusNum)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Use 0 (Pending), 1 (Approved), 2 (Rejected)"
      });
    }

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.status === statusNum) {
      return res.status(400).json({
        success: false,
        message: "User is already in this status"
      });
    }

    // Reject ke time remark mandatory
    if (statusNum === STATUS.REJECTED && !remark) {
      return res.status(400).json({
        success: false,
        message: "Remark is required for rejection"
      });
    }

    // Approve ke case mein password generate karke set karna hai
    if (statusNum === STATUS.APPROVED) {
      const generatedPassword = generatePassword();

      await updateUserPassword(id, generatedPassword);
      await updateUserStatus(id, STATUS.APPROVED, remark);

      await sendApprovalEmail({
        name: user.name,
        email: user.email,
        password: generatedPassword
      });

      return res.status(200).json({
        success: true,
        message: "User approved and password sent to email"
      });
    }

    // Reject case
    if (statusNum === STATUS.REJECTED) {
      await updateUserStatus(id, STATUS.REJECTED, remark);

      await sendRejectionEmail({
        name: user.name,
        email: user.email,
        remark
      });

      return res.status(200).json({
        success: true,
        message: "User rejected"
      });
    }

    // Pending case (revert / re-open)
    await updateUserStatus(id, STATUS.PENDING, remark);

    return res.status(200).json({
      success: true,
      message: "User status set to pending"
    });

  } catch (error) {
    console.error("UPDATE USER STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user status"
    });
  }
};


/* =========================================================
   Backward compatible - agar purana approve route kahin use ho
========================================================= */


const EXTERNAL_API_BASE = String(
  process.env.EXTERNAL_API || "https://klkerp.com/api"
).replace(/\/$/, "");

const sendWhatsappMessage = async (mobile, message) => {
  if (!mobile) return false;

  try {
    const params = new URLSearchParams({
      mobile: String(mobile),
      msg: message,
    });

    const urlResponse = await fetch(
      `${EXTERNAL_API_BASE}/dle/whatapps/url?${params.toString()}`,
      { method: "GET" }
    );

    if (!urlResponse.ok) {
      throw new Error(
        `Laravel WhatsApp API returned ${urlResponse.status}`
      );
    }

    const urlData = await urlResponse.json();
    if (!urlData.success || !urlData.url) {
      return false;
    }

    const whatsappResponse = await fetch(urlData.url, { method: "GET" });
    return whatsappResponse.ok;
  } catch (error) {
    console.error("WhatsApp Error:", error.message);
    return false;
  }
};

export const approveUserController = async (req, res) => {
  try {
    const { id, status, approval_remarks, company_id } = req.body;

    console.log("Approval Request:", req.body);

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!id) {
      return res.status(422).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const approvalStatus = Number(status);

    if (![0, 1, 2].includes(approvalStatus)) {
      return res.status(422).json({
        success: false,
        message: "Invalid approval status.",
      });
    }

    // Rejected => remarks required
    if (approvalStatus === 2 && !approval_remarks?.trim()) {
      return res.status(422).json({
        success: false,
        message: "Please enter rejection remarks.",
      });
    }

    // =====================================================
    // FIND USER
    // =====================================================

    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // =====================================================
    // PENDING
    // =====================================================

    if (approvalStatus === 0) {
      const updatedUser = await prisma.user.update({
        where: { id: BigInt(id) },
        data: {
          approval_status: 0,
          status: 0,
          approval_remarks: approval_remarks?.trim() || null,
          updated_at: new Date(),
        },
      });

      return res.status(200).json({
        success: true,
        message: "User status changed to pending.",
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          approval_status: updatedUser.approval_status,
          status: updatedUser.status,
        },
      });
    }

    // =====================================================
    // REJECTED
    // =====================================================

    if (approvalStatus === 2) {
      const trimmedRemarks = approval_remarks.trim();

      const updatedUser = await prisma.user.update({
        where: { id: BigInt(id) },
        data: {
          approval_status: 2,
          status: 0,
          approval_remarks: trimmedRemarks,
          admin_remark: trimmedRemarks,
          updated_at: new Date(),
        },
      });

      const whatsappMessage =
        `Hello ${updatedUser.name || "User"},\n\n` +
        "Your DLE profile application has been rejected.\n\n" +
        "Rejection Reason:\n" +
        `${trimmedRemarks}\n\n` +
        "Please contact the concerned authority for further information.";

      const whatsappStatus = await sendWhatsappMessage(
        updatedUser.contact_no,
        whatsappMessage
      );

      try {
        await sendRejectionEmail({
          name: updatedUser.name,
          email: updatedUser.email,
          remark: trimmedRemarks,
        });
      } catch (emailError) {
        console.error("Rejection email failed:", emailError.message);
      }

      return res.status(200).json({
        success: true,
        message: "User rejected successfully.",
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          contact_no: updatedUser.contact_no,
          email: updatedUser.email,
          approval_status: 2,
          status: 0,
          approval_remarks: updatedUser.approval_remarks,
          whatsapp_sent: whatsappStatus,
        },
      });
    }

    // =====================================================
    // APPROVED
    // =====================================================

    // KLK + 6 digit random number
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const password = `KLK${randomNumber}`;

    await updateUserPassword(id, password);

    const updatedUser = await prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        approval_status: 1,
        company_id: company_id ? String(company_id) : user.company_id,
        status: 1,
        approval_remarks: approval_remarks?.trim() || null,
        updated_at: new Date(),
      },
    });

    const whatsappMessage =
      `Hello ${updatedUser.name || "User"},\n\n` +
      "Your DLE profile has been approved successfully.\n\n" +
      "Login Details:\n\n" +
      `Mobile: ${updatedUser.contact_no || "-"}\n` +
      "DLE Portal: https://klkdle.klkventures.cloud\n" +
      `Email: ${updatedUser.email || "-"}\n` +
      `Password: ${password}\n\n` +
      "Please login using the above credentials.";

    const whatsappStatus = await sendWhatsappMessage(
      updatedUser.contact_no,
      whatsappMessage
    );

    try {
      await sendApprovalEmail({
        name: updatedUser.name,
        email: updatedUser.email,
        password,
      });
    } catch (emailError) {
      console.error("Approval email failed:", emailError.message);
    }

    // =====================================================
    // FINAL RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "User approved successfully.",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        contact_no: updatedUser.contact_no,
        password: password,
        approval_status: 1,
        status: 1,
        portal_url: "https://klkdle.klkventures.cloud",
        whatsapp_sent: whatsappStatus,
      },
    });
  } catch (error) {
    console.error("Approval Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to update user approval status.",
    });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({
      success: true,
      data: users.map(sanitizeUser),
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};