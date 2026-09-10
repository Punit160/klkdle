export const formatAttendanceTime = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

export const formatAttendanceDate = (value) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    weekday: 'short',
  }).format(new Date(`${value}T12:00:00`))
}

export const formatCoords = (lat, lng) => {
  if (!lat || !lng) return '—'
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
}

export const calcDuration = (punchIn, punchOut) => {
  if (!punchIn || !punchOut) return '—'
  const ms = new Date(punchOut).getTime() - new Date(punchIn).getTime()
  if (ms <= 0) return '—'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

export const getAttendanceStatus = (record) => {
  if (!record) return { label: '—', className: 'muted' }
  if (!record.punch_out_at) return { label: 'In Progress', className: 'open' }
  if (record.punch_out_auto) return { label: 'Auto Punch Out', className: 'auto' }
  return { label: 'Present', className: 'done' }
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
