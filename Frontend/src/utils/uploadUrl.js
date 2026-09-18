import { APP_API_BASE, joinUrl } from '../api/config'

const R2_PUBLIC_DEV_URL = 'https://pub-21d2019fecbe4a96a88c93b2f091317a.r2.dev'

const R2_PUBLIC_BASE = String(
  import.meta.env.VITE_R2_PUBLIC_BASE_URL || R2_PUBLIC_DEV_URL
).replace(/\/+$/, '')

const parseR2StoredValue = (value) => {
  const raw = String(value || '').trim()
  if (!raw.startsWith('r2:')) return null
  const key = raw.slice(3).replace(/^\/+/, '')
  return key || null
}

/** Turn stored upload paths into a browser-loadable URL on any environment. */
export const resolveUploadUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((part) => resolveUploadUrl(part.trim()))
      .filter(Boolean)
      .join(',')
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw
  }

  const r2Key = parseR2StoredValue(raw)
  if (r2Key) {
    if (R2_PUBLIC_BASE) {
      return `${R2_PUBLIC_BASE}/${r2Key}`
    }
    return raw
  }

  let path = raw
  if (!path.startsWith('/')) {
    path = path.startsWith('uploads/') ? `/${path}` : `/uploads/${path}`
  }

  return joinUrl(APP_API_BASE, path)
}
