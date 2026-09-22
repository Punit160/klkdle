export const PORTAL_BIHAR_SSL_AMC_READ = 'portal.bihar.ssl_amc.read'
export const PORTAL_BIHAR_SSL_AMC_ADD = 'portal.bihar.ssl_amc.add'
export const PORTAL_BIHAR_SSL_AMC_DASHBOARD = 'portal.bihar.ssl_amc.dashboard'
export const PORTAL_BIHAR_LIGHT_AMC_READ = 'portal.bihar.light_amc.read'
export const PORTAL_BIHAR_LIGHT_AMC_ADD = 'portal.bihar.light_amc.add'
export const PORTAL_BIHAR_ULA_READ = 'portal.bihar.ula.read'
export const PORTAL_BIHAR_ULA_ADD = 'portal.bihar.ula.add'
export const PORTAL_UP_SSL_AMC_READ = 'portal.up.ssl_amc.read'
export const PORTAL_UP_SSL_AMC_ADD = 'portal.up.ssl_amc.add'
export const PORTAL_UP_SSL_AMC_DASHBOARD = 'portal.up.ssl_amc.dashboard'
export const PORTAL_UP_LIGHT_AMC_READ = 'portal.up.light_amc.read'
export const PORTAL_UP_LIGHT_AMC_ADD = 'portal.up.light_amc.add'

/** When SSL AMC view is toggled, keep dashboard permission in sync (matches backend). */
export const SSL_AMC_READ_DASHBOARD_PAIRS = [
  [PORTAL_BIHAR_SSL_AMC_READ, PORTAL_BIHAR_SSL_AMC_DASHBOARD],
  [PORTAL_UP_SSL_AMC_READ, PORTAL_UP_SSL_AMC_DASHBOARD],
]

export const syncSslAmcDashboardPermissionKeys = (keys) => {
  const set = new Set(keys || [])
  SSL_AMC_READ_DASHBOARD_PAIRS.forEach(([readKey, dashKey]) => {
    if (set.has(readKey)) set.add(dashKey)
    else set.delete(dashKey)
  })
  return [...set]
}

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
