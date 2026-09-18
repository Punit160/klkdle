import axios from 'axios'
import { getCompanyId } from '../utils/auth'
import { EXTERNAL_API_BASE } from './config'
import {
  filterExternalPayloadByUser,
  getDleAmcUserId,
} from '../utils/externalApiUser'
import {
  buildExternalGetCacheKey,
  getInflightExternalGet,
  readExternalGetCache,
  setInflightExternalGet,
  writeExternalGetCache,
} from '../utils/externalApiCache'

const externalApi = axios.create({
  baseURL: EXTERNAL_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
})

const getNetworkAdapter = () => {
  if (typeof axios.getAdapter === 'function') {
    return axios.getAdapter(['xhr', 'http', 'fetch'])
  }

  const candidate =
    externalApi.defaults.adapter || axios.defaults.adapter

  return typeof candidate === 'function' ? candidate : null
}

const buildCachedGetResponse = (config, data) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})

externalApi.interceptors.request.use(
  (config) => {
    const companyId = getCompanyId()
    const userId = getDleAmcUserId()
    const isUp = /\/up\//i.test(config.url || '')

    config.params = {
      ...(config.params || {}),
    }

    if (companyId) {
      config.params.company_id = companyId
    }

    if (userId) {
      config.params.user_id = config.params.user_id ?? userId
      if (!isUp) {
        config.params.dle_amc_id = userId
      }
    }

    const method = String(config.method || 'get').toLowerCase()
    if (method !== 'get' || config.__skipExternalCache) {
      return config
    }

    const cacheKey = buildExternalGetCacheKey(config)
    config.__externalCacheKey = cacheKey

    const cached = readExternalGetCache(cacheKey)
    if (cached) {
      config.adapter = () =>
        Promise.resolve(buildCachedGetResponse(config, cached))
      return config
    }

    const inflight = getInflightExternalGet(cacheKey)
    if (inflight) {
      config.adapter = () => inflight
      return config
    }

    const networkAdapter = getNetworkAdapter()
    if (!networkAdapter) {
      return config
    }

    config.adapter = (requestConfig) => {
      const networkPromise = networkAdapter(requestConfig)
        .then((response) => {
          writeExternalGetCache(cacheKey, response.data)
          return response
        })

      setInflightExternalGet(cacheKey, networkPromise)
      return networkPromise
    }

    return config
  },
  (error) => Promise.reject(error)
)

externalApi.interceptors.response.use(
  (response) => {
    const userId = getDleAmcUserId()
    const url = response?.config?.url || ''
    const isUp = /\/up\//i.test(url)
    const isUlaInstallation = /ula-installation/i.test(url)

    if (response?.data && userId && !isUp && !isUlaInstallation) {
      response.data = filterExternalPayloadByUser(response.data, userId)
    }

    return response
  },
  (error) => {
    const status = error.response?.status
    const rawMessage = error.response?.data?.message

    if (
      status === 429 ||
      (typeof rawMessage === 'string' &&
        /too many attempts/i.test(rawMessage))
    ) {
      error.response = error.response || {}
      error.response.data = {
        ...(typeof error.response.data === 'object' ? error.response.data : {}),
        message:
          'ERP server rate limit reached (Too Many Attempts). Wait 1–2 minutes, refresh the page, and try again.',
      }
    }

    return Promise.reject(error)
  }
)

export { EXTERNAL_API_BASE }

export default externalApi
