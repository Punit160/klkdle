import { getCompanyId } from './auth'
import { getDleAmcUserId } from './externalApiUser'

const STORAGE_PREFIX = 'klkdle_bihar_amc_location_'

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const getBiharAmcLocationStorageKey = (userId, companyId) => {
  const uid = userId ?? getDleAmcUserId()
  if (!uid) return null

  const cid = companyId ?? getCompanyId() ?? '0'
  return `${STORAGE_PREFIX}${cid}_${uid}`
}

export const pickLocationOption = (options, savedValue) => {
  const needle = normalizeKey(savedValue)
  if (!needle || !Array.isArray(options) || !options.length) {
    return null
  }

  return (
    options.find((option) => normalizeKey(option.value) === needle) ||
    options.find((option) => normalizeKey(option.label) === needle) ||
    null
  )
}

export const loadBiharAmcLocationPrefs = (userId, companyId) => {
  const primaryKey = getBiharAmcLocationStorageKey(userId, companyId)
  const uid = userId ?? getDleAmcUserId()

  const keys = []
  if (primaryKey) keys.push(primaryKey)
  if (uid) keys.push(`${STORAGE_PREFIX}${uid}`)

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue

      const parsed = JSON.parse(raw)
      return {
        district: String(parsed?.district || '').trim(),
        block: String(parsed?.block || '').trim(),
        panchayat: String(parsed?.panchayat || '').trim(),
        ward: String(parsed?.ward || '').trim(),
        updatedAt: Number(parsed?.updatedAt) || 0,
      }
    } catch {
      // try next key
    }
  }

  return null
}

export const saveBiharAmcLocationPrefs = (
  userId,
  { district, block, panchayat, ward, companyId } = {}
) => {
  const storageKey = getBiharAmcLocationStorageKey(userId, companyId)
  if (!storageKey) return

  const existing = loadBiharAmcLocationPrefs(userId, companyId) || {}

  const payload = {
    district:
      district !== undefined
        ? String(district || '').trim()
        : existing.district || '',
    block:
      block !== undefined
        ? String(block || '').trim()
        : existing.block || '',
    panchayat:
      panchayat !== undefined
        ? String(panchayat || '').trim()
        : existing.panchayat || '',
    ward:
      ward !== undefined ? String(ward || '').trim() : existing.ward || '',
    updatedAt: Date.now(),
  }

  localStorage.setItem(storageKey, JSON.stringify(payload))

  const legacyUid = userId ?? getDleAmcUserId()
  if (legacyUid) {
    localStorage.removeItem(`${STORAGE_PREFIX}${legacyUid}`)
  }
}

/** Save the full location path (last user selection). */
export const saveBiharAmcLocationSnapshot = ({
  district,
  block,
  panchayat,
  ward,
} = {}) => {
  const payload = {
    companyId: getCompanyId(),
    district: district?.value ?? district ?? '',
    block: block?.value ?? block ?? '',
    panchayat: panchayat?.value ?? panchayat ?? '',
  }

  if (ward !== undefined) {
    payload.ward = ward?.value ?? ward ?? ''
  }

  saveBiharAmcLocationPrefs(getDleAmcUserId(), payload)
}
