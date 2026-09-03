import {
  getPendingUsers,
  getUsersByStatus,
  getAllUsers,
  findUserById,
  updateUserStatus,
  updateUserPassword
} from "../../Model/DLE-Model/dle-user-model.js";

import { generatePassword } from "../../Utils/password.js";
import { sendApprovalEmail, sendRejectionEmail } from "../../Utils/Nodemailer.js";

// Status codes
const STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2
};




export const getPendingUsersController = async (req, res) => {
  try {
    const users = await getPendingUsers();

    return res.status(200).json({
      success: true,
      users
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
      return res.status(200).json({ success: true, users });
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
      users
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

export const approveUserController = async (req, res) => {
  req.body.status = STATUS.APPROVED;
  return updateUserStatusController(req, res);
};