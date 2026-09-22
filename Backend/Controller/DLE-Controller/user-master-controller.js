import {
  adminCreateUser,
  adminUpdateUser,
  findUserById,
  listUsersForMaster,
  serializeUserRecord,
} from "../../Model/DLE-Model/dle-user-model.js";
import {
  getPortalRoleNamesByUserIds,
  getUserPortalRoleAssignments,
  setUserPortalRoles,
} from "../../Model/DLE-Model/portal-rbac-model.js";
import { USER_ROLE_ADMIN } from "../../Utils/userRoles.js";
import {
  mapUserUploadFilesToPaths,
  parseUserMasterMultipartBody,
} from "../../Utils/userUploadPaths.js";

const mergeUserMasterRequestBody = (req) => {
  const parsed = parseUserMasterMultipartBody(req.body);
  const filePaths = mapUserUploadFilesToPaths(req.files);
  return { ...parsed, ...filePaths };
};

export const listUsersMasterController = async (req, res) => {
  try {
    const { page, limit, search, company_id, approval_status, state, role } = req.query;
    const result = await listUsersForMaster({
      page,
      limit,
      search,
      company_id,
      approval_status,
      state,
      role,
    });

    const portalRolesByUser = await getPortalRoleNamesByUserIds(
      result.rows.map((row) => row.id)
    );

    return res.json({
      success: true,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit) || 0,
      },
      data: result.rows.map((row) => {
        const user = serializeUserRecord(row);
        return {
          ...user,
          portal_role_names: portalRolesByUser.get(String(user.id)) || [],
        };
      }),
    });
  } catch (error) {
    console.error("USER MASTER LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list users.",
    });
  }
};

export const getUserMasterController = async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    if (Number(user.role) === USER_ROLE_ADMIN) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    let portal_roles = [];
    if (user.company_id) {
      portal_roles = await getUserPortalRoleAssignments(
        user.id.toString(),
        user.company_id
      );
    }

    return res.json({
      success: true,
      data: {
        ...serializeUserRecord(user),
        password: user.password ?? "",
        portal_role_ids: portal_roles.map((r) => r.role_id),
        portal_roles,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user.",
    });
  }
};

export const createUserMasterController = async (req, res) => {
  try {
    const actorCompanyId = String(req.actorUser?.company_id || "").trim();
    const body = mergeUserMasterRequestBody(req);
    if (actorCompanyId) {
      body.company_id = actorCompanyId;
    }
    const user = await adminCreateUser(body);

    if (body.portal_role_ids?.length && user.company_id) {
      await setUserPortalRoles(
        user.id.toString(),
        user.company_id,
        body.portal_role_ids.map(String)
      );
    }
    return res.status(201).json({
      success: true,
      message: "User created.",
      data: serializeUserRecord(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create user.",
    });
  }
};

export const updateUserMasterController = async (req, res) => {
  try {
    const existing = await findUserById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const body = mergeUserMasterRequestBody(req);
    const user = await adminUpdateUser(req.params.id, body);

    if (body.portal_role_ids != null && user.company_id) {
      const roleIds = Array.isArray(body.portal_role_ids)
        ? body.portal_role_ids.map(String)
        : [];
      await setUserPortalRoles(user.id.toString(), user.company_id, roleIds);
    }

    return res.json({
      success: true,
      message: "User updated.",
      data: serializeUserRecord(user),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user.",
    });
  }
};
