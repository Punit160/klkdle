import { getUser } from './auth'

export const getDleAmcUserId = () => {
  const user = getUser()
  return user?.id ?? user?.user_id ?? null
}

export const getDleAmcIdFromRecord = (item) => {
  if (!item || typeof item !== 'object') return null

  const recordUserId =
    item.dle_amc_id ??
    item.dleAmcId ??
    item.user_id ??
    item.userId ??
    null

  if (recordUserId == null || recordUserId === '') return null
  return String(recordUserId)
}

export const matchesDleAmcUser = (item, userId = getDleAmcUserId()) => {
  if (userId == null || userId === '') return true
  if (!item || typeof item !== 'object') return true

  const recordUserId = getDleAmcIdFromRecord(item)
  if (recordUserId == null) return true

  return recordUserId === String(userId)
}

export const filterExternalListByUser = (list, userId = getDleAmcUserId()) => {
  if (!Array.isArray(list) || userId == null) return list
  return list.filter((item) => matchesDleAmcUser(item, userId))
}

export const filterExternalPayloadByUser = (payload, userId = getDleAmcUserId()) => {
  if (payload == null || userId == null) return payload

  if (Array.isArray(payload)) {
    return filterExternalListByUser(payload, userId)
  }

  if (typeof payload !== 'object') return payload

  const next = { ...payload }

  if (Array.isArray(next.data)) {
    next.data = filterExternalListByUser(next.data, userId)
  } else if (next.data && typeof next.data === 'object') {
    next.data = filterExternalPayloadByUser(next.data, userId)
  }

  if (Array.isArray(next.complaints)) {
    next.complaints = filterExternalListByUser(next.complaints, userId)
  }

  if (Array.isArray(next.assignedsite)) {
    next.assignedsite = filterExternalListByUser(next.assignedsite, userId)
  }

  if (Array.isArray(next.assigned_site)) {
    next.assigned_site = filterExternalListByUser(next.assigned_site, userId)
  }

  return next
}

export const withDleAmcUserParams = (params = {}, userId = getDleAmcUserId()) => {
  if (!userId) return params
  return {
    ...params,
    dle_amc_id: userId,
    user_id: params.user_id ?? userId,
  }
}

export const mapDistinctFieldOptions = (
  list,
  getValue,
  userId = getDleAmcUserId()
) => {
  const filtered = filterExternalListByUser(list, userId)
  const seen = new Set()
  const options = []

  filtered.forEach((item) => {
    const value = getValue(item)
    if (value == null || value === '') return
    const key = String(value)
    if (seen.has(key)) return
    seen.add(key)
    options.push({ value: key, label: key })
  })

  return options
}
