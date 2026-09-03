const trimSlash = (value) => String(value || '').replace(/\/$/, '')

/** Laravel ERP — master data, complaints, SSL site details */
export const EXTERNAL_API_BASE = trimSlash(
  import.meta.env.VITE_EXTERNAL_API || import.meta.env.VITE_API_BASE_URL || ''
)

/** This Node app — auth, AMC documents, Light AMC (empty = same origin) */
export const APP_API_BASE = trimSlash(import.meta.env.VITE_BASE_URL)

export const joinUrl = (base, path) => {
  const next = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${next}` : next
}
