export const USER_ROLE_ADMIN = 1
export const USER_ROLE_DEFAULT = 2
export const USER_ROLE_VLE = 3

import { getEffectiveUserRole, getUser } from './auth'

export const userIsAdmin = (user) => {
  const role = user ? getEffectiveUserRole(user) : getEffectiveUserRole()
  return Number(role) === USER_ROLE_ADMIN
}

export const userIsDle = (user) => {
  const role = user ? getEffectiveUserRole(user) : getEffectiveUserRole()
  return Number(role) === USER_ROLE_DEFAULT
}

export const getSessionUser = () => getUser()

export const roleLabel = (role) => {
  const n = Number(role)
  if (n === USER_ROLE_ADMIN) return 'Admin'
  if (n === USER_ROLE_VLE) return 'VLE'
  if (n === USER_ROLE_DEFAULT) return 'DLE'
  return `Role ${n}`
}

export const approvalStatusLabel = (status) => {
  const n = Number(status)
  if (n === 1) return 'Approved'
  if (n === 2) return 'Rejected'
  return 'Pending'
}
