export const AMC_LIGHT_COOLDOWN_DAYS = 80

const isPoleLikeId = (value) => /^\d{1,3}$/.test(String(value || '').trim())

export const buildRecentAmcLookup = (doneLights = []) => {
  const byKey = new Map()

  doneLights.forEach((item) => {
    const record = {
      ssl_id: String(item.ssl_id || ''),
      unique_id: item.unique_id || '',
      amc_date: item.amc_date || '',
    }

    if (item.ssl_id) byKey.set(String(item.ssl_id), record)

    if (
      item.unique_id &&
      String(item.unique_id) !== String(item.pole_no) &&
      !isPoleLikeId(item.unique_id)
    ) {
      byKey.set(String(item.unique_id), record)
    }
  })

  return byKey
}

export const isLightRecentlyServiced = (site, doneByKey) => {
  if (!site || !doneByKey?.size) return false

  const keys = [site.id, site.ssl_id, site.unique_id]
    .filter((value) => value != null && value !== '')
    .map(String)

  return keys.some((key) => doneByKey.has(key))
}

export const filterLightsDueForAmc = (lights = [], doneLights = []) => {
  const doneByKey = buildRecentAmcLookup(doneLights)
  const dueList = lights.filter((site) => !isLightRecentlyServiced(site, doneByKey))

  return {
    dueList,
    skippedCount: lights.length - dueList.length,
  }
}
