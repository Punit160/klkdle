import prisma from "../../Config/Prisma.js";
import {
  PORTAL_PERMISSION_CATALOG,
  PORTAL_SUPER_PERMISSION,
  roleHasSoftwareRestrictedPermissions,
} from "../../Utils/portalPermissionCatalog.js";

export const ensurePortalPermissionCatalog = async () => {
  for (const row of PORTAL_PERMISSION_CATALOG) {
    await prisma.portalPermission.upsert({
      where: { key: row.key },
      create: row,
      update: {
        label: row.label,
        module: row.module,
        description: row.description,
      },
    });
  }
};

const resolvePortalPermissionRows = async (permissionKeys) => {
  await ensurePortalPermissionCatalog();
  const keys = [...new Set((permissionKeys || []).map(String).filter(Boolean))];
  const catalogKeySet = new Set(PORTAL_PERMISSION_CATALOG.map((p) => p.key));

  const invalid = keys.filter((k) => !catalogKeySet.has(k));
  if (invalid.length) {
    const error = new Error(`Unknown permission keys: ${invalid.join(", ")}`);
    error.statusCode = 422;
    throw error;
  }

  const rows = await prisma.portalPermission.findMany({
    where: { key: { in: keys } },
  });

  if (rows.length !== keys.length) {
    const found = new Set(rows.map((r) => r.key));
    const missing = keys.filter((k) => !found.has(k));
    const error = new Error(
      `Some permissions are missing in the database: ${missing.join(", ")}. Refresh the page to sync the catalog.`
    );
    error.statusCode = 422;
    throw error;
  }

  return rows;
};

/** Full catalog in stable order (source of truth for the roles UI). */
export const listPortalPermissions = async () => {
  await ensurePortalPermissionCatalog();
  const catalogKeys = PORTAL_PERMISSION_CATALOG.map((p) => p.key);
  const rows = await prisma.portalPermission.findMany({
    where: { key: { in: catalogKeys } },
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return PORTAL_PERMISSION_CATALOG.map((cat) => {
    const row = byKey.get(cat.key);
    if (row) return row;
    return {
      id: 0,
      key: cat.key,
      label: cat.label,
      module: cat.module,
      description: cat.description ?? null,
    };
  });
};

export const listPortalRolesByCompany = async (companyId) => {
  const rows = await prisma.portalRole.findMany({
    where: { company_id: String(companyId) },
    orderBy: { name: "asc" },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
  });

  return rows.map((role) => ({
    id: role.id.toString(),
    company_id: role.company_id,
    name: role.name,
    description: role.description,
    user_count: role._count.users,
    permission_keys: role.permissions.map((link) => link.permission.key),
    permissions: role.permissions.map((link) => ({
      id: link.permission.id,
      key: link.permission.key,
      label: link.permission.label,
      module: link.permission.module,
    })),
    created_at: role.created_at,
    updated_at: role.updated_at,
  }));
};

export const createPortalRole = async ({ companyId, name, description, permissionKeys }) => {
  const permissionRows = await resolvePortalPermissionRows(permissionKeys);

  const role = await prisma.portalRole.create({
    data: {
      company_id: String(companyId),
      name: String(name).trim(),
      description: description?.trim() || null,
      permissions: {
        create: permissionRows.map((p) => ({
          permission_id: p.id,
        })),
      },
    },
    include: {
      permissions: { include: { permission: true } },
    },
  });

  return role;
};

export const updatePortalRole = async (roleId, { name, description, permissionKeys }) => {
  const permissionRows = await resolvePortalPermissionRows(permissionKeys);

  await prisma.portalRolePermission.deleteMany({
    where: { role_id: BigInt(roleId) },
  });

  return prisma.portalRole.update({
    where: { id: BigInt(roleId) },
    data: {
      name: name != null ? String(name).trim() : undefined,
      description: description !== undefined ? description?.trim() || null : undefined,
      updated_at: new Date(),
      permissions: {
        create: permissionRows.map((p) => ({
          permission_id: p.id,
        })),
      },
    },
    include: {
      permissions: { include: { permission: true } },
    },
  });
};

export const deletePortalRole = async (roleId) => {
  await prisma.portalRole.delete({
    where: { id: BigInt(roleId) },
  });
};

export const findPortalRoleById = async (roleId) =>
  prisma.portalRole.findUnique({
    where: { id: BigInt(roleId) },
    include: { permissions: { include: { permission: true } } },
  });

export const getUserPortalRoleAssignments = async (userId, companyId) => {
  const links = await prisma.userPortalRole.findMany({
    where: {
      user_id: BigInt(userId),
      company_id: String(companyId),
    },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  return links.map((link) => ({
    role_id: link.role_id.toString(),
    role_name: link.role.name,
    permission_keys: link.role.permissions.map((p) => p.permission.key),
  }));
};

/** Role names per user id (list views; one query for many users). */
export const getPortalRoleNamesByUserIds = async (userIds) => {
  const ids = [...new Set(userIds.map((id) => String(id)).filter(Boolean))];
  const map = new Map(ids.map((id) => [id, []]));
  if (!ids.length) return map;

  const links = await prisma.userPortalRole.findMany({
    where: { user_id: { in: ids.map((id) => BigInt(id)) } },
    include: { role: { select: { name: true } } },
  });

  for (const link of links) {
    const uid = link.user_id.toString();
    const names = map.get(uid);
    if (names && link.role?.name) names.push(link.role.name);
  }
  for (const names of map.values()) {
    names.sort((a, b) => a.localeCompare(b));
  }
  return map;
};

export const listUserIdsForPortalRole = async (roleId, companyId) => {
  const links = await prisma.userPortalRole.findMany({
    where: {
      role_id: BigInt(roleId),
      company_id: String(companyId),
    },
    select: { user_id: true },
  });
  return links.map((link) => link.user_id.toString());
};

/** Replace which users hold this role (does not change users' other roles). */
export const setPortalRoleMembers = async (roleId, companyId, userIds) => {
  const cid = String(companyId);
  const rid = BigInt(roleId);

  const role = await prisma.portalRole.findFirst({
    where: { id: rid, company_id: cid },
  });
  if (!role) {
    const error = new Error("Role not found.");
    error.statusCode = 404;
    throw error;
  }

  const uniqueUserIds = [...new Set((userIds || []).map(String).filter(Boolean))];

  if (uniqueUserIds.length) {
    const users = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds.map((id) => BigInt(id)) },
        company_id: cid,
      },
      select: { id: true },
    });
    if (users.length !== uniqueUserIds.length) {
      const error = new Error("One or more users are invalid for this company.");
      error.statusCode = 422;
      throw error;
    }
  }

  await prisma.userPortalRole.deleteMany({
    where: { role_id: rid, company_id: cid },
  });

  if (uniqueUserIds.length) {
    await prisma.userPortalRole.createMany({
      data: uniqueUserIds.map((uid) => ({
        user_id: BigInt(uid),
        role_id: rid,
        company_id: cid,
      })),
    });
  }

  return { user_ids: uniqueUserIds, member_count: uniqueUserIds.length };
};

export const setUserPortalRoles = async (userId, companyId, roleIds) => {
  const uid = BigInt(userId);
  const cid = String(companyId);

  const existingLinks = await prisma.userPortalRole.findMany({
    where: { user_id: uid, company_id: cid },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });
  const existingRestrictedRoleIds = new Set(
    existingLinks
      .filter((link) =>
        roleHasSoftwareRestrictedPermissions(
          link.role.permissions.map((p) => p.permission.key)
        )
      )
      .map((link) => link.role_id.toString())
  );

  await prisma.userPortalRole.deleteMany({
    where: { user_id: uid, company_id: cid },
  });

  if (!roleIds.length) return [];

  const roles = await prisma.portalRole.findMany({
    where: {
      id: { in: roleIds.map((id) => BigInt(id)) },
      company_id: cid,
    },
    include: {
      permissions: { include: { permission: true } },
    },
  });

  if (roles.length !== roleIds.length) {
    const error = new Error("One or more roles are invalid for this company.");
    error.statusCode = 422;
    throw error;
  }

  for (const role of roles) {
    const keys = role.permissions.map((p) => p.permission.key);
    if (roleHasSoftwareRestrictedPermissions(keys)) {
      const roleIdStr = role.id.toString();
      if (!existingRestrictedRoleIds.has(roleIdStr)) {
        const error = new Error(
          `Role "${role.name}" includes portal admin permissions and cannot be assigned through the app.`
        );
        error.statusCode = 422;
        throw error;
      }
    }
  }

  await prisma.userPortalRole.createMany({
    data: roles.map((role) => ({
      user_id: uid,
      role_id: role.id,
      company_id: cid,
    })),
  });

  return getUserPortalRoleAssignments(userId, companyId);
};

export const getUserPermissionKeys = async (userId, companyId) => {
  if (!userId) return [];

  const where = { user_id: BigInt(userId) };
  if (companyId) {
    where.company_id = String(companyId);
  }

  const links = await prisma.userPortalRole.findMany({
    where,
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const keys = new Set();
  links.forEach((link) => {
    link.role.permissions.forEach((p) => keys.add(p.permission.key));
  });

  return [...keys];
};

export const userHasPortalPermission = (permissionKeys, requiredKey) => {
  if (!requiredKey) return true;
  if (!permissionKeys?.length) return false;
  if (permissionKeys.includes(PORTAL_SUPER_PERMISSION)) return true;
  return permissionKeys.includes(requiredKey);
};
