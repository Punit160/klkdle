const CACHE_TTL_MS = 10 * 60 * 1000

const memoryCache = new Map()
const inflight = new Map()

const stableSerialize = (value) => {
  if (value == null || typeof value !== 'object') {
    return String(value ?? '')
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${key}:${stableSerialize(value[key])}`).join(',')}}`
}

export const buildExternalGetCacheKey = (config = {}) => {
  const url = String(config.url || '')
  const params = stableSerialize(config.params || {})
  return `${url}?${params}`
}

export const readExternalGetCache = (key) => {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

export const writeExternalGetCache = (key, data) => {
  memoryCache.set(key, { data, storedAt: Date.now() })
}

export const getInflightExternalGet = (key) => inflight.get(key) || null

export const setInflightExternalGet = (key, promise) => {
  inflight.set(key, promise)
  promise.finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key)
    }
  })
}

export const clearExternalApiCache = () => {
  memoryCache.clear()
  inflight.clear()
}
