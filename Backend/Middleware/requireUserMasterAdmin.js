import { findUserById } from "../Model/DLE-Model/dle-user-model.js";
import { isUserMasterAdmin, USER_ROLE_ADMIN } from "../Utils/userRoles.js";
import { resolveJwtUserId } from "../Utils/requestUser.js";

export const requireUserMasterAdmin = async (req, res, next) => {
  try {
    const userId = resolveJwtUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required.",
      });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!isUserMasterAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: `Admin access requires role=${USER_ROLE_ADMIN} in the users table. Your role is ${Number(user.role ?? 2)}. Log out and log in again after UPDATE users SET role=1.`,
      });
    }

    req.actorUser = user;
    return next();
  } catch (error) {
    console.error("requireUserMasterAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Authorization check failed.",
    });
  }
};
