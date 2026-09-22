import { pages } from '../api/routes'
import {
  PORTAL_BIHAR_SSL_AMC_DASHBOARD,
  PORTAL_BIHAR_SSL_AMC_READ,
  PORTAL_UP_SSL_AMC_DASHBOARD,
  PORTAL_UP_SSL_AMC_READ,
} from '../constants/portalPermissions'
import { getUserPortalPermissions, userCanManagePortalAccess, userHasPortalPermission } from './portalAccess'
import { userIsAdmin } from './userRoles'

const STATE_GROUPS = {
  bihar: ['bihar', 'br', '2'],
  up: ['up', 'uttar pradesh', 'uttar-pradesh', 'uttarpradesh', 'u.p.', '3'],
}

const normalize = (value = '') => String(value).trim().toLowerCase()

const MENU_GROUP_STATE_KEY = {
  bihar: 'bihar',
  up: 'up',
  'uttar-pradesh': 'up',
}

export const getUserStateValue = (user) =>
  user?.state ??
  user?.state_name ??
  user?.stateName ??
  user?.state_id ??
  user?.stateId ??
  ''

export const resolveUserStateKeys = (stateValue) => {
  const normalized = normalize(stateValue)

  if (!normalized) {
    return ['bihar', 'up']
  }

  const keys = Object.entries(STATE_GROUPS)
    .filter(([, aliases]) =>
      aliases.some((alias) => normalized === alias || normalized.includes(alias))
    )
    .map(([key]) => key)

  if (keys.length) return keys

  if (normalized.includes('bihar')) return ['bihar']
  if (normalized.includes('uttar') || normalized === 'up') return ['up']

  return ['bihar', 'up']
}

export const userHasStateAccess = (user, stateKey) => {
  return resolveUserStateKeys(getUserStateValue(user)).includes(stateKey)
}

/** SSL AMC district dashboard — tied to SSL AMC view when portal roles are in use. */
export const userCanAccessSslAmcDashboard = (user, region) => {
  if (userIsAdmin(user)) return true
  const keys = getUserPortalPermissions(user)
  const stateKey = region === 'up' ? 'up' : 'bihar'
  if (!keys.length) return userHasStateAccess(user, stateKey)

  const readKey =
    region === 'up' ? PORTAL_UP_SSL_AMC_READ : PORTAL_BIHAR_SSL_AMC_READ
  const dashKey =
    region === 'up' ? PORTAL_UP_SSL_AMC_DASHBOARD : PORTAL_BIHAR_SSL_AMC_DASHBOARD

  return (
    userHasPortalPermission(user, readKey) || userHasPortalPermission(user, dashKey)
  )
}

export const filterMenuByUserState = (menuList, user) => {
  const allowed = new Set(resolveUserStateKeys(getUserStateValue(user)))

  return menuList.filter((group) => {
    if (group.id === 'account') return true
    if (group.id === 'portal') return userCanManagePortalAccess(user) || userIsAdmin(user)
    if (group.id === 'admin') return userIsAdmin(user)
    const stateKey = MENU_GROUP_STATE_KEY[group.id] ?? group.id
    return allowed.has(stateKey)
  }).map((group) => {
    if (group.id !== 'bihar' && group.id !== 'up') return group
    const region = group.id === 'up' ? 'up' : 'bihar'
    const dashPath = region === 'up' ? pages.up.amcDashboard : pages.bihar.amcDashboard
    const items = (group.items || []).filter((item) => {
      if (item.path === dashPath) return userCanAccessSslAmcDashboard(user, region)
      return true
    })
    return { ...group, items }
  })
}

/** Hide Bihar / UP menu until user has an active punch-in session. */
export const filterMenuByPunchIn = (menuList, isPunchedIn) => {
  if (isPunchedIn) return menuList
  return menuList.filter((group) => group.id === 'account')
}

const stateHubConfig = {
  bihar: {
    title: 'Bihar Operations',
    items: [
      { label: 'SSL AMC Dashboard', path: pages.bihar.amcDashboard, desc: 'Documentation and field AMC overview' },
      { label: 'Assign AMC', path: pages.bihar.assignAmc, desc: 'Sites assigned to you for AMC' },
      { label: 'Upload AMC Data', path: pages.bihar.amcUpload, desc: 'Submit SSL AMC documents' },
      { label: 'Field AMC', path: pages.bihar.lightAmc, desc: 'Submit light AMC with GPS' },
      { label: 'ULA Form', path: pages.bihar.ulaForm, desc: 'Submit Bihar ULA readings' },
      { label: 'ULA Data', path: pages.bihar.ulaList, desc: 'View ULA submissions' },
    ],
  },
  up: {
    title: 'Uttar Pradesh Operations',
    items: [
      { label: 'AMC Dashboard', path: pages.up.amcDashboard, desc: 'Documentation overview and stats' },
      { label: 'Upload AMC Data', path: pages.up.amcUpload, desc: 'Submit SSL AMC documents' },
      { label: 'Field AMC', path: pages.up.lightAmc, desc: 'Submit light AMC with GPS' },
    ],
  },
}

export const getStateHubSections = (user) => {
  return resolveUserStateKeys(getUserStateValue(user))
    .map((key) => {
      const section = stateHubConfig[key]
      if (!section) return null
      const dashPath = key === 'up' ? pages.up.amcDashboard : pages.bihar.amcDashboard
      const items = section.items.filter((item) => {
        if (item.path === dashPath) return userCanAccessSslAmcDashboard(user, key)
        return true
      })
      return items.length ? { ...section, items } : null
    })
    .filter(Boolean)
}

export const getStateLabel = (user) => {
  const keys = resolveUserStateKeys(getUserStateValue(user))
  if (keys.includes('bihar') && keys.includes('up')) return 'All States'
  if (keys.includes('bihar')) return 'Bihar'
  if (keys.includes('up')) return 'Uttar Pradesh'
  return user?.state || '—'
}
