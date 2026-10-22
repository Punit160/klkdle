const hasValue = (value) => value != null && String(value).trim() !== ''

/** A visit belongs to the table for that module. UP SSL light rows stay on the UP light screens. */
export const rowBelongsToAmcRegion = (region, row) => {
  if (!row) return false
  if (region === 'kusumc') return hasValue(row.pump_id)
  if (region === 'powerpack') return hasValue(row.powerpack_id)
  if (region === 'offgrid') return hasValue(row.offgrid_id)
  if (region === 'ongrid') return hasValue(row.ongrid_id)
  if (region === 'up' || region === 'bihar') {
    return !hasValue(row.pump_id)
      && !hasValue(row.powerpack_id)
      && !hasValue(row.offgrid_id)
      && !hasValue(row.ongrid_id)
  }
  return true
}

export const rowsForAmcRegion = (region, rows, returnedRegion) => {
  if (returnedRegion && returnedRegion !== region) return []
  return (Array.isArray(rows) ? rows : []).filter((row) => rowBelongsToAmcRegion(region, row))
}
