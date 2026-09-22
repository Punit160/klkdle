import localApi from './localApi'
import { app } from './routes'
import {
  getToken,
  getUser,
  saveAuthData,
  shouldProactivelyRefreshToken,
} from '../utils/auth'

let refreshInFlight = null

/** Issue a new JWT (30-day sliding session) using the current token. */
export const refreshSessionToken = async ({ force = false } = {}) => {
  const token = getToken()
  if (!token) return false

  if (!force && !shouldProactivelyRefreshToken(token)) {
    return true
  }

  if (!refreshInFlight) {
    refreshInFlight = localApi
      .post(
        app.auth.refresh,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          skipSessionRefresh: true,
        }
      )
      .then((res) => {
        const nextToken = res.data?.token
        const nextUser = res.data?.user
        if (!nextToken) {
          throw new Error('Refresh did not return a token')
        }
        const mergedUser = nextUser
          ? { ...(getUser() || {}), ...nextUser }
          : getUser()
        saveAuthData(nextToken, mergedUser)
        return true
      })
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}
