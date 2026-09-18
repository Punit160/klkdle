import { pages } from '../api/routes'

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

export const filterMenuByUserState = (menuList, user) => {
  const allowed = new Set(resolveUserStateKeys(getUserStateValue(user)))

  return menuList.filter((group) => {
    if (group.id === 'account') return true
    const stateKey = MENU_GROUP_STATE_KEY[group.id] ?? group.id
    return allowed.has(stateKey)
  })
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
    .map((key) => stateHubConfig[key])
    .filter(Boolean)
}

export const getStateLabel = (user) => {
  const keys = resolveUserStateKeys(getUserStateValue(user))
  if (keys.includes('bihar') && keys.includes('up')) return 'All States'
  if (keys.includes('bihar')) return 'Bihar'
  if (keys.includes('up')) return 'Uttar Pradesh'
  return user?.state || '—'
}
