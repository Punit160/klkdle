export const PORTAL_RBAC_MANAGE = 'portal.rbac.manage'

export const PORTAL_API_CREDENTIALS_MANAGE = 'portal.api.credentials.manage'

/** Not assignable via portal roles UI — DLE admin is users.role=1 in DB only. */
export const PORTAL_SOFTWARE_RESTRICTED = [
  PORTAL_RBAC_MANAGE,
  PORTAL_API_CREDENTIALS_MANAGE,
]

export const isSoftwareRestrictedPortalPermission = (key) =>
  PORTAL_SOFTWARE_RESTRICTED.includes(String(key))

export const isSoftwareAssignablePortalRole = (role) => {
  const keys = role?.permission_keys || []
  return !keys.some(isSoftwareRestrictedPortalPermission)
}
