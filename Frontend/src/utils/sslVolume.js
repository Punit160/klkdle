import externalApi from '../api/externalApi'
import { external } from '../api/routes'
import { filterExternalListByUser } from './externalApiUser'

export const fetchAutoSslVolume = async (state = 'bihar') => {
  const res = await externalApi.get(external.ssl.volume(state))
  const rawList = res?.data?.data ?? res?.data ?? []
  const list = Array.isArray(rawList) ? rawList : []
  const scoped = filterExternalListByUser(list)

  const pickVolume = (rows) => {
    for (const item of rows) {
      const value = item?.volume ?? item
      if (value != null && String(value).trim() !== '') {
        return String(value).trim()
      }
    }
    return null
  }

  return pickVolume(scoped) ?? pickVolume(list)
}

export const withSslVolume = (params = {}, volume) => {
  if (!volume) return params
  return { ...params, volume }
}
