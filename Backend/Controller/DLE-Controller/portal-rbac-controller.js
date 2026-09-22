import {
  findUserById,
  findUsersByCompanyId,
} from "../../Model/DLE-Model/dle-user-model.js";
import {
  createPortalRole,
  deletePortalRole,
  ensurePortalPermissionCatalog,
  findPortalRoleById,
  getUserPermissionKeys,
  getUserPortalRoleAssignments,
  listPortalPermissions,
  listPortalRolesByCompany,
  listUserIdsForPortalRole,
  setPortalRoleMembers,
  setUserPortalRoles,
  updatePortalRole,
} from "../../Model/DLE-Model/portal-rbac-model.js";
import {
  assertPortalPermissionKeysAssignableViaSoftware,
  filterAssignablePortalPermissionKeys,
  roleHasSoftwareRestrictedPermissions,
} from "../../Utils/portalPermissionCatalog.js";
import { isUserMasterAdmin } from "../../Utils/userRoles.js";
import { resolveJwtUserId } from "../../Utils/requestUser.js";

export const resolvePortalAccessActor = async (req, options = {}) => {
  const { allowApiCredentials = false } = options;
  const userId = resolveJwtUserId(req);
  if (!userId) {
    const error = new Error("Login required.");
    error.statusCode = 401;
    throw error;
  }

  const user = await findUserById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const companyId = String(user.company_id || "").trim();
  if (!companyId) {
    const error = new Error("Your account has no company_id; cannot manage portal access.");
    error.statusCode = 422;
    throw error;
  }

  const permissionKeys = await getUserPermissionKeys(userId, companyId);
  const canManageRoles = isUserMasterAdmin(user);
  const canManageApiCredentials = isUserMasterAdmin(user);

  if (allowApiCredentials) {
    if (!canManageApiCredentials) {
      const error = new Error("You do not have permission to manage API credentials.");
      error.statusCode = 403;
      throw error;
    }
  } else if (!canManageRoles) {
    const error = new Error("You do not have permission to manage roles.");
    error.statusCode = 403;
    throw error;
  }

  return { userId, companyId, permissionKeys, user };
};

const resolveActor = (req) => resolvePortalAccessActor(req);

const serializePortalPermission = (row) => ({
  id: row.id,
  key: row.key,
  label: row.label,
  module: row.module,
  description: row.description ?? null,
});

export const listPermissionsController = async (_req, res) => {
  try {
    const rows = await listPortalPermissions();
    const assignable = rows.filter((row) => !roleHasSoftwareRestrictedPermissions([row.key]));
    return res.json({
      success: true,
      data: assignable.map(serializePortalPermission),
      meta: { total: assignable.length },
    });
  } catch (error) {
    console.error("LIST PORTAL PERMISSIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list permissions.",
    });
  }
};

export const listRolesController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    await ensurePortalPermissionCatalog();
    const data = await listPortalRolesByCompany(companyId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list roles.",
    });
  }
};

export const createRoleController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const { name, description, permission_keys: permissionKeys = [] } = req.body;

    if (!name?.trim()) {
      return res.status(422).json({
        success: false,
        message: "Role name is required.",
      });
    }

    if (!Array.isArray(permissionKeys) || !permissionKeys.length) {
      return res.status(422).json({
        success: false,
        message: "Select at least one permission.",
      });
    }

    assertPortalPermissionKeysAssignableViaSoftware(permissionKeys);
    const assignableKeys = filterAssignablePortalPermissionKeys(permissionKeys);
    if (!assignableKeys.length) {
      return res.status(422).json({
        success: false,
        message: "Select at least one module permission.",
      });
    }

    const role = await createPortalRole({
      companyId,
      name,
      description,
      permissionKeys: assignableKeys,
    });

    return res.status(201).json({
      success: true,
      message: "Role created.",
      data: {
        id: role.id.toString(),
        name: role.name,
        permission_keys: role.permissions.map((p) => p.permission.key),
      },
    });
  } catch (error) {
    console.error("CREATE PORTAL ROLE ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create role.",
    });
  }
};

export const updateRoleController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const roleId = req.params.id;
    const existing = await findPortalRoleById(roleId);

    if (!existing || String(existing.company_id) !== companyId) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    const existingKeys = existing.permissions.map((p) => p.permission.key);
    if (roleHasSoftwareRestrictedPermissions(existingKeys)) {
      return res.status(403).json({
        success: false,
        message:
          "This role includes portal admin permissions and can only be maintained in the database.",
      });
    }

    const { name, description, permission_keys: permissionKeys } = req.body;
    if (permissionKeys != null && (!Array.isArray(permissionKeys) || !permissionKeys.length)) {
      return res.status(422).json({
        success: false,
        message: "Select at least one permission.",
      });
    }

    const nextKeys =
      permissionKeys ?? existing.permissions.map((p) => p.permission.key);
    assertPortalPermissionKeysAssignableViaSoftware(nextKeys);
    const assignableKeys = filterAssignablePortalPermissionKeys(nextKeys);
    if (!assignableKeys.length) {
      return res.status(422).json({
        success: false,
        message: "Select at least one module permission.",
      });
    }

    const updated = await updatePortalRole(roleId, {
      name,
      description,
      permissionKeys: assignableKeys,
    });

    return res.json({
      success: true,
      message: "Role updated.",
      data: {
        id: updated.id.toString(),
        name: updated.name,
        permission_keys: updated.permissions.map((p) => p.permission.key),
      },
    });
  } catch (error) {
    console.error("UPDATE PORTAL ROLE ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update role.",
    });
  }
};

export const deleteRoleController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const roleId = req.params.id;
    const existing = await findPortalRoleById(roleId);

    if (!existing || String(existing.company_id) !== companyId) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    const existingKeys = existing.permissions.map((p) => p.permission.key);
    if (roleHasSoftwareRestrictedPermissions(existingKeys)) {
      return res.status(403).json({
        success: false,
        message:
          "This role includes portal admin permissions and cannot be deleted through the app.",
      });
    }

    await deletePortalRole(roleId);
    return res.json({ success: true, message: "Role deleted." });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete role.",
    });
  }
};

export const getUserRolesController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const targetUserId = req.params.userId;
    const targetUser = await findUserById(targetUserId);

    if (!targetUser || String(targetUser.company_id || "").trim() !== companyId) {
      return res.status(404).json({
        success: false,
        message: "User not found in your company.",
      });
    }

    const assignments = await getUserPortalRoleAssignments(targetUserId, companyId);
    return res.json({
      success: true,
      data: {
        user_id: String(targetUserId),
        roles: assignments,
        role_ids: assignments.map((a) => a.role_id),
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch user roles.",
    });
  }
};

export const getRoleMembersController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const roleId = req.params.id;
    const existing = await findPortalRoleById(roleId);

    if (!existing || String(existing.company_id) !== companyId) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    const user_ids = await listUserIdsForPortalRole(roleId, companyId);
    return res.json({
      success: true,
      data: { role_id: String(roleId), user_ids },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch role members.",
    });
  }
};

export const setRoleMembersController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const roleId = req.params.id;
    const existing = await findPortalRoleById(roleId);

    if (!existing || String(existing.company_id) !== companyId) {
      return res.status(404).json({
        success: false,
        message: "Role not found.",
      });
    }

    const existingKeys = existing.permissions.map((p) => p.permission.key);
    if (roleHasSoftwareRestrictedPermissions(existingKeys)) {
      return res.status(403).json({
        success: false,
        message:
          "This role includes portal admin permissions and cannot be assigned through the app.",
      });
    }

    const { user_ids: userIds = [] } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(422).json({
        success: false,
        message: "user_ids must be an array.",
      });
    }

    const data = await setPortalRoleMembers(roleId, companyId, userIds.map(String));
    return res.json({
      success: true,
      message: `Role assigned to ${data.member_count} user(s).`,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update role members.",
    });
  }
};

export const setUserRolesController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const targetUserId = req.params.userId;
    const { role_ids: roleIds = [] } = req.body;

    const targetUser = await findUserById(targetUserId);
    if (!targetUser || String(targetUser.company_id || "").trim() !== companyId) {
      return res.status(404).json({
        success: false,
        message: "User not found in your company.",
      });
    }

    if (!Array.isArray(roleIds)) {
      return res.status(422).json({
        success: false,
        message: "role_ids must be an array.",
      });
    }

    const assignments = await setUserPortalRoles(
      targetUserId,
      companyId,
      roleIds.map(String)
    );

    return res.json({
      success: true,
      message: "User roles updated.",
      data: assignments,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user roles.",
    });
  }
};

export const getMyPortalPermissionsController = async (req, res) => {
  try {
    const userId = resolveJwtUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Login required.",
      });
    }

    const user = await findUserById(userId);
    const companyId = String(user?.company_id || "").trim();
    await ensurePortalPermissionCatalog();
    const permission_keys = await getUserPermissionKeys(userId, companyId || undefined);

    return res.json({
      success: true,
      data: {
        user_id: userId,
        company_id: companyId || null,
        permission_keys,
        can_manage_rbac: isUserMasterAdmin(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load permissions.",
    });
  }
};

/** For login/profile — same company scope as user record. */
export const listCompanyUsersController = async (req, res) => {
  try {
    const { companyId } = await resolveActor(req);
    const search = req.query.search;
    const rows = await findUsersByCompanyId(companyId, { search });
    return res.json({
      success: true,
      data: rows.map((u) => ({
        id: u.id.toString(),
        name: u.name,
        email: u.email,
        contact_no: u.contact_no,
        state: u.state,
        status: u.status,
        approval_status: u.approval_status,
      })),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list users.",
    });
  }
};

/** Disabled — portal admin is users.role=1 in DB only. */
export const bootstrapPortalAccessController = async (_req, res) => {
  try {
    return res.status(403).json({
      success: false,
      message:
        "Portal administrator access cannot be created through the app. Use users.role=1 in the database for DLE admins.",
    });
  } catch (error) {
    console.error("PORTAL RBAC BOOTSTRAP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Bootstrap failed.",
    });
  }
};

export const getPortalPermissionsForUser = async (user) => {
  if (!user?.id) return [];
  const userId = user.id?.toString?.() ?? String(user.id);
  const companyId = String(user.company_id || "").trim();
  await ensurePortalPermissionCatalog();
  return getUserPermissionKeys(userId, companyId || undefined);
};
