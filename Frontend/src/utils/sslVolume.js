import externalApi from '../api/externalApi'
import { external } from '../api/routes'
import { filterExternalListByUser } from './externalApiUser'

export const fetchAutoSslVolume = async (state = 'bihar') => {
  const res = await externalApi.get(external.ssl.volume(state))
  const list = filterExternalListByUser(res?.data?.data || [])

  for (const item of list) {
    const value = item?.volume ?? item
    if (value != null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  return null
}

export const withSslVolume = (params = {}, volume) => {
  if (!volume) return params
  return { ...params, volume }
}
