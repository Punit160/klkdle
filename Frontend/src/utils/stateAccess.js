import { pages } from '../api/routes'
import { userCanManagePortalAccess } from './portalAccess'
import { userCanAccessPagePath } from './portalModuleAccess'
import { userIsAdmin } from './userRoles'

const STATE_GROUPS = {
  bihar: ['bihar', 'br', '2'],
  up: ['up', 'uttar pradesh', 'uttar-pradesh', 'uttarpradesh', 'u.p.', '3'],
}

const normalize = (value = '') => String(value).trim().toLowerCase()

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

/** @deprecated Access is role-based; kept for callers that still pass stateKey. */
export const userHasStateAccess = (_user, _stateKey) => true

const filterMenuItemByPortal = (user, item) => {
  if (Array.isArray(item.dropdownMenu) && item.dropdownMenu.length) {
    const dropdownMenu = item.dropdownMenu.filter((sub) =>
      userCanAccessPagePath(user, sub.path)
    )
    if (!dropdownMenu.length) return null
    return { ...item, dropdownMenu }
  }

  if (item.path && item.path !== '#') {
    return userCanAccessPagePath(user, item.path) ? item : null
  }

  return item
}

/** Sidebar menu: portal permissions only (not user profile state). */
export const filterMenuByUserState = (menuList, user) => {
  return menuList
    .filter((group) => {
      if (group.id === 'account') return true
      if (group.id === 'portal') return userCanManagePortalAccess(user) || userIsAdmin(user)
      if (group.id === 'admin') return userIsAdmin(user)
      return group.id === 'bihar' || group.id === 'up'
    })
    .map((group) => {
      if (group.id !== 'bihar' && group.id !== 'up') return group
      const items = (group.items || [])
        .map((item) => filterMenuItemByPortal(user, item))
        .filter(Boolean)
      return items.length ? { ...group, items } : null
    })
    .filter(Boolean)
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
  return Object.keys(stateHubConfig)
    .map((key) => {
      const section = stateHubConfig[key]
      if (!section) return null
      const items = section.items.filter((item) => userCanAccessPagePath(user, item.path))
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

/** Punch-in / nav hint from portal permissions (not profile state). */
export const getFieldModulesPunchInLabel = (user) => {
  const titles = getStateHubSections(user).map((s) =>
    String(s.title || '').replace(/ Operations$/, '')
  )
  if (titles.length >= 2) return titles.join(' / ')
  if (titles.length === 1) return titles[0]
  return 'Field'
}
