import { menuList } from '../components/shared/navigationMenu/menuList'
import { pages } from '../api/routes'
import { filterMenuByUserState } from './stateAccess'

const CATEGORY_LABELS = {
  account: 'My Account',
  bihar: 'Bihar',
  up: 'Uttar Pradesh',
}

const flattenMenuItems = (user) => {
  const items = []
  const visibleMenu = filterMenuByUserState(menuList, user)

  visibleMenu.forEach((group) => {
    group.items.forEach((item) => {
      if (Array.isArray(item.dropdownMenu) && item.dropdownMenu.length) {
        item.dropdownMenu.forEach((sub) => {
          items.push({
            id: `${group.id}-${item.id}-${sub.id}`,
            title: sub.name,
            subtitle: `${group.state} · ${item.name}`,
            path: sub.path,
            category: group.id,
            categoryLabel: CATEGORY_LABELS[group.id] || group.state,
            type: 'page',
          })
        })
        return
      }

      items.push({
        id: `${group.id}-${item.id}`,
        title: item.name,
        subtitle: group.state,
        path: item.path,
        category: group.id,
        categoryLabel: CATEGORY_LABELS[group.id] || group.state,
        type: 'page',
      })
    })
  })

  return items
}

const STATIC_ACTIONS = [
  {
    id: 'action-attendance',
    title: 'Attendance Report',
    subtitle: 'View month-wise punch history',
    path: pages.attendance,
    category: 'account',
    categoryLabel: 'My Account',
    type: 'action',
    keywords: ['attendance', 'punch', 'report', 'clock'],
  },
  {
    id: 'action-profile',
    title: 'My Profile',
    subtitle: 'Update personal details',
    path: pages.profile,
    category: 'account',
    categoryLabel: 'My Account',
    type: 'action',
    keywords: ['profile', 'account', 'user'],
  },
]

export const buildSearchIndex = (user) => {
  const menuItems = flattenMenuItems(user)
  const paths = new Set(menuItems.map((item) => item.path))

  const actions = STATIC_ACTIONS.filter((item) => !paths.has(item.path))

  return [...menuItems, ...actions].map((item) => ({
    ...item,
    keywords: [
      item.title,
      item.subtitle,
      item.path,
      item.categoryLabel,
      ...(item.keywords || []),
    ]
      .join(' ')
      .toLowerCase(),
  }))
}

export const filterSearchResults = (items, query, category = 'all') => {
  const term = query.trim().toLowerCase()
  if (!term) return []

  return items.filter((item) => {
    if (category !== 'all' && item.category !== category) return false

    return (
      item.keywords.includes(term)
      || item.title.toLowerCase().includes(term)
      || item.subtitle.toLowerCase().includes(term)
      || item.path.toLowerCase().includes(term)
    )
  })
}

export const getSearchCategories = (user) => {
  const keys = new Set(['all'])

  filterMenuByUserState(menuList, user).forEach((group) => {
    keys.add(group.id)
  })

  return Array.from(keys).map((key) => ({
    id: key,
    label: key === 'all' ? 'All' : CATEGORY_LABELS[key] || key,
  }))
}
