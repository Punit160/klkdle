const HIDDEN_DETAIL_KEYS = new Set([
  'id',
  'ssl_id',
  'dle_amc_id',
  'user_id',
  'company_id',
  'password',
  'token',
  'amc_done',
  'amcdone',
  'site_status',
  'status',
  'created_at',
  'updated_at',
  'deleted_at',
  'data',
  'success',
  'message',
  'summary',
])

const DATE_KEYS = new Set([
  'date_of_installation',
  'installation_date',
  'install_date',
  'created_at',
  'updated_at',
])

const formatDisplayDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatLabel = (key, region) => {
  const overrides = {
    unique_id: 'Unique ID',
    uniqueId: 'Unique ID',
    pole_no: 'Pole No',
    ward_no: 'Ward No',
    light_no: 'Light No',
    beneficiary_name: 'Beneficiary Name',
    contact_no: 'Contact No.',
    mobile: 'Contact No.',
    phone: 'Contact No.',
    along_with_pole: 'Along With Pole',
    luminary_no: 'Luminary No.',
    sim_no: 'SIM No.',
    battery_serial_no: 'Battery Serial No.',
    module_no: 'Module No.',
    date_of_installation: 'Date of Installation',
    latitude: 'Site Latitude',
    longitude: 'Site Longitude',
    panchyat: region === 'up' ? 'Village' : 'Panchayat',
    panchayat: region === 'up' ? 'Village' : 'Panchayat',
    village: 'Village',
  }

  if (overrides[key]) return overrides[key]

  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatValue = (key, value) => {
  if (value == null || value === '') return ''
  if (typeof value === 'object') return ''
  if (DATE_KEYS.has(key)) return formatDisplayDate(value)
  return String(value)
}

const hasDisplayValue = (value) => {
  if (value == null || value === '') return false
  if (typeof value === 'object') return false
  return true
}

const appendAmcCoords = (items, extras = {}) => {
  const { isLocating, amcLatitude, amcLongitude } = extras
  items.push({
    label: 'AMC Latitude',
    value: isLocating ? 'Capturing...' : (amcLatitude || 'Waiting for GPS'),
  })
  items.push({
    label: 'AMC Longitude',
    value: isLocating ? 'Capturing...' : (amcLongitude || 'Waiting for GPS'),
  })
  return items
}

export const buildBiharSiteDeviceGroups = (details = {}, extras = {}) => {
  const deviceItems = appendAmcCoords(
    [
      { label: 'Unique ID', value: details.unique_id || details.uniqueId },
      { label: 'Pole No', value: details.pole_no },
      { label: 'Ward No', value: details.ward_no },
      { label: 'Light No', value: details.light_no },
      { label: 'Along With Pole', value: details.along_with_pole },
      { label: 'Luminary No.', value: details.luminary_no },
      { label: 'SIM No.', value: details.sim_no },
      { label: 'Battery Serial No.', value: details.battery_serial_no },
      { label: 'Module No.', value: details.module_no },
      {
        label: 'Date of Installation',
        value: formatDisplayDate(details.date_of_installation),
      },
      { label: 'Site Latitude', value: details.latitude },
      { label: 'Site Longitude', value: details.longitude },
    ],
    extras
  )

  return [
    {
      title: 'Device',
      items: deviceItems,
    },
  ]
}

/** UP: show whatever columns the fetch returned — not the Bihar device set. */
export const buildUpSiteDeviceGroups = (details = {}, extras = {}) => {
  const items = Object.entries(details)
    .filter(([key, value]) => !HIDDEN_DETAIL_KEYS.has(key) && hasDisplayValue(value))
    .map(([key, value]) => ({
      label: formatLabel(key, 'up'),
      value: formatValue(key, value),
    }))

  return [
    {
      title: 'Site & Device',
      items: appendAmcCoords(items, extras),
    },
  ]
}

export const buildSiteDeviceGroups = (region, details = {}, extras = {}) =>
  region === 'up'
    ? buildUpSiteDeviceGroups(details, extras)
    : buildBiharSiteDeviceGroups(details, extras)

export const buildLightSelectLabel = (region, site = {}) => {
  if (region === 'up') {
    const sslId = site?.id ?? site?.ssl_id ?? ''
    const beneficiary =
      site?.beneficiary_name ||
      site?.beneficiary ||
      site?.beneficiaryName ||
      ''

    const parts = []
    if (sslId !== '' && sslId != null) parts.push(`SSL ID ${sslId}`)
    if (beneficiary) parts.push(beneficiary)

    if (parts.length) return parts.join(' / ')
    return 'Light'
  }

  const uniqueId = site?.unique_id || site?.uniqueId || ''
  const poleNo = site?.pole_no || ''
  const wardNo = String(site?.ward_no ?? site?.ward ?? '').trim()

  const parts = []
  if (uniqueId) parts.push(uniqueId)
  if (poleNo) parts.push(poleNo)
  if (wardNo) parts.push(`Ward ${wardNo}`)

  if (parts.length) return parts.join(' / ')
  return `SSL ID ${site?.id || site?.ssl_id || ''}`
}
