import { PORTAL_RBAC_MANAGE } from '../constants/portalPermissions'
import { userIsAdmin } from './userRoles'

export const getUserPortalPermissions = (user) => {
  const list = user?.portal_permissions
  return Array.isArray(list) ? list : []
}

export const userHasPortalPermission = (user, permissionKey) => {
  const keys = getUserPortalPermissions(user)
  if (!permissionKey) return true
  if (keys.includes(PORTAL_RBAC_MANAGE)) return true
  return keys.includes(permissionKey)
}

/** Portal roles & API credentials — DLE admin (users.role=1) only, not via portal roles. */
export const userCanManagePortalAccess = (user) => userIsAdmin(user)

export const userCanManagePortalApiCredentials = (user) => userIsAdmin(user)
