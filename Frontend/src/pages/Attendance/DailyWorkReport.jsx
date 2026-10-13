import { Fragment, useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiClock, FiEye, FiLogIn, FiLogOut, FiMapPin, FiUsers } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { userIsAdmin } from '../../utils/userRoles'
import { formatAttendanceDate, formatAttendanceTime, formatCoords, MONTH_NAMES } from '../../utils/attendanceFormat'
import '../../styles/DLE/daily-work-report.css'

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const todayInput = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const formatHours = (minutes) => {
  if (minutes == null || minutes === 0) return minutes === 0 ? '0h 0m' : '—'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const mapsUrl = (latitude, longitude) => {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.google.com/maps?q=${lat},${lng}`
}

const punchOutLabel = (day) => {
  if (day.punch_out_at) return `${formatAttendanceTime(day.punch_out_at)}${day.punch_out_auto ? ' (auto)' : ''}`
  if (!day.punch_in_at) return '—'
  return day.date === todayInput() ? 'Still working' : 'No punch out'
}

const DayBlock = ({ day }) => {
  const punchInMap = mapsUrl(day.punch_in_latitude, day.punch_in_longitude)
  const punchOutMap = mapsUrl(day.punch_out_latitude, day.punch_out_longitude)
  const sites = day.sites || []
  return (
    <div className="daily-work-detail">
      <div className="daily-work-day-title">{formatAttendanceDate(day.date)}</div>
      <div className="daily-work-punch">
        <div>
          <span><FiLogIn size={13} /> Punch in</span>
          <strong>{formatAttendanceTime(day.punch_in_at)}</strong>
          {punchInMap ? (
            <a href={punchInMap} target="_blank" rel="noopener noreferrer">
              <FiMapPin size={12} /> {formatCoords(day.punch_in_latitude, day.punch_in_longitude)}
            </a>
          ) : (
            <em>No GPS</em>
          )}
        </div>
        <div>
          <span><FiLogOut size={13} /> Punch out</span>
          <strong>{punchOutLabel(day)}</strong>
          {punchOutMap ? (
            <a href={punchOutMap} target="_blank" rel="noopener noreferrer">
              <FiMapPin size={12} /> {formatCoords(day.punch_out_latitude, day.punch_out_longitude)}
            </a>
          ) : (
            <em>{day.punch_out_at ? 'No GPS' : 'No punch out'}</em>
          )}
        </div>
        <div>
          <span><FiClock size={13} /> Work mix</span>
          <strong>{day.ula_visits} ULA</strong>
          <em>{day.field_amc} field AMC · {day.documents} documents · {day.distance_km} km</em>
        </div>
      </div>
      {sites.length === 0 ? (
        <p className="daily-work-empty">No site visits recorded for this day.</p>
      ) : (
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>Time</th>
                <th>Work</th>
                <th>Site</th>
                <th>Place</th>
                <th>GPS</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site, index) => {
                const href = mapsUrl(site.latitude, site.longitude)
                return (
                  <tr key={`${site.kind}-${site.title}-${index}`}>
                    <td>{formatAttendanceTime(site.at)}</td>
                    <td>{site.kind}</td>
                    <td>
                      <div className="fw-semibold">{site.title}</div>
                      {site.detail ? <div className="fs-12 text-muted">{site.detail}</div> : null}
                    </td>
                    <td className="fs-12 text-muted">{site.place || '—'}</td>
                    <td>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {formatCoords(site.latitude, site.longitude)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const UserDetail = ({ detail, loading, error }) => {
  if (loading) return <div className="daily-work-empty">Loading this user’s work…</div>
  if (error) return <div className="alert alert-warning mb-0">{error}</div>
  const days = detail?.days || []
  if (!days.length) return <p className="daily-work-empty">No punch-in or field work in this month.</p>
  return days.map((day) => <DayBlock key={day.date} day={day} />)
}

const blankUser = (person) => ({
  user_id: String(person.user_id),
  name: person.name,
  days: [],
  day_count: 0,
  total_minutes: 0,
  total_sites: 0,
  total_distance_km: 0,
})

const DailyWorkReport = () => {
  const isAdmin = userIsAdmin()
  const [month, setMonth] = useState(currentMonth)
  const monthParts = month.split('-').map(Number)
  const year = monthParts[0]
  const monthIndex = monthParts[1]
  const now = new Date()
  const isNextDisabled = year > now.getFullYear() || (year === now.getFullYear() && monthIndex >= now.getMonth() + 1)

  const shiftMonth = (step) => {
    const date = new Date(year, monthIndex - 1 + step, 1)
    const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (step > 0 && next > currentMonth()) return
    setMonth(next)
  }
  const [userId, setUserId] = useState('')
  const [users, setUsers] = useState([])
  const [directory, setDirectory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openKey, setOpenKey] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setOpenKey('')
    setDetail(null)
    localApi
      .get(app.attendance.workReport, { params: { month } })
      .then((res) => {
        if (cancelled) return
        setUsers(res.data?.users || [])
        setDirectory(res.data?.directory || [])
      })
      .catch((err) => {
        if (cancelled) return
        setUsers([])
        setDirectory([])
        setError(err.response?.data?.message || 'Could not load the daily work report.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [month])

  const roster = useMemo(() => {
    const worked = new Map(users.map((user) => [String(user.user_id), user]))
    const source = directory.length
      ? directory
      : users.map((user) => ({ user_id: user.user_id, name: user.name }))
    const seen = new Set()
    const list = source.map((person) => {
      const id = String(person.user_id)
      seen.add(id)
      return worked.get(id) || blankUser(person)
    })
    users.forEach((user) => {
      if (!seen.has(String(user.user_id))) list.push(user)
    })
    return list.sort((a, b) => {
      const workedGap = Number(b.day_count > 0) - Number(a.day_count > 0)
      if (workedGap) return workedGap
      return String(a.name || '').localeCompare(String(b.name || ''))
    })
  }, [users, directory])

  const filterOptions = useMemo(
    () => [...roster].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [roster]
  )

  const visibleUsers = useMemo(
    () => (isAdmin && userId ? roster.filter((user) => String(user.user_id) === String(userId)) : roster),
    [roster, isAdmin, userId]
  )

  const totals = useMemo(() => {
    const working = visibleUsers.filter((user) => user.day_count > 0)
    return {
      people: working.length,
      days: working.reduce((sum, user) => sum + Number(user.day_count || 0), 0),
      sites: working.reduce((sum, user) => sum + Number(user.total_sites || 0), 0),
      distance: Math.round(working.reduce((sum, user) => sum + Number(user.total_distance_km || 0), 0) * 100) / 100,
    }
  }, [visibleUsers])

  const openUser = (user) => {
    const key = String(user.user_id)
    if (openKey === key) {
      setOpenKey('')
      setDetail(null)
      return
    }
    setOpenKey(key)
    setDetailError('')
    if (!user.day_count) {
      setDetail({ days: [] })
      setDetailLoading(false)
      return
    }
    setDetail(null)
    setDetailLoading(true)
    const params = { month, detail: 1 }
    if (isAdmin) params.user_id = user.user_id
    localApi
      .get(app.attendance.workReport, { params })
      .then((res) => {
        const match = (res.data?.users || []).find((row) => String(row.user_id) === String(user.user_id))
        setDetail(match || { days: [] })
      })
      .catch((err) => {
        setDetailError(err.response?.data?.message || 'Could not load this user’s work.')
      })
      .finally(() => setDetailLoading(false))
  }

  return (
    <div>
      <PageHeader />
      <div className="main-content daily-work-page">
        <div className="daily-work-head">
          <div>
            <h4 className="fw-bold text-dark mb-1">Daily work</h4>
            <p className="fs-13 text-muted mb-0">
              {isAdmin
                ? 'Working days for every user. Open a day to see the full route.'
                : 'Your working days. Open a day to see the full route.'}
            </p>
          </div>
          <div className="daily-work-tools">
            {isAdmin ? (
              <label className="daily-work-user">
                <FiUsers size={14} />
                <select value={userId} onChange={(event) => setUserId(event.target.value)} aria-label="Filter by user">
                  <option value="">All users</option>
                  {filterOptions.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="month-switcher">
              <button type="button" className="month-switcher-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <FiChevronLeft />
              </button>
              <div className="month-switcher-label">
                <strong>{MONTH_NAMES[monthIndex - 1]}</strong>
                <span>{year}</span>
              </div>
              <button
                type="button"
                className="month-switcher-btn"
                onClick={() => shiftMonth(1)}
                disabled={isNextDisabled}
                aria-label="Next month"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-sm-6 col-xl-3">
            <div className="daily-work-stat"><span>People</span><strong>{totals.people}</strong></div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="daily-work-stat days"><span>Working days</span><strong>{totals.days}</strong></div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="daily-work-stat sites"><span>Sites</span><strong>{totals.sites}</strong></div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="daily-work-stat distance"><span>Distance</span><strong>{totals.distance} km</strong></div>
          </div>
        </div>

        <div className="card stretch stretch-full daily-work-card">
          <div className="card-header d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0">User work</h5>
            <span className="fs-12 text-muted">{MONTH_NAMES[monthIndex - 1]} {year}</span>
          </div>
          <div className="card-body p-0">
        {error ? <div className="daily-work-note is-error">{error}</div> : null}
        {loading ? <p className="p-4 text-muted fs-13 mb-0">Loading working days…</p> : null}
        {!loading && !error && visibleUsers.length === 0 ? (
          <p className="p-4 text-muted fs-13 mb-0">No users to show.</p>
        ) : null}
        {!loading && visibleUsers.length > 0 ? (
            <div className="table-responsive">
              <table className="table daily-work-table mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Working days</th>
                    <th><FiClock size={14} /> Hours</th>
                    <th>Sites</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => {
                    const key = String(user.user_id)
                    const open = openKey === key
                    const worked = user.day_count > 0
                    const status = worked
                      ? { label: `${user.day_count} day${user.day_count === 1 ? '' : 's'}`, className: 'done' }
                      : { label: 'No work', className: 'muted' }
                    return (
                      <Fragment key={key}>
                        <tr className={open ? 'is-open' : ''}>
                          <td className="fw-semibold">{user.name}</td>
                          <td>{user.day_count || 0}</td>
                          <td>{formatHours(user.total_minutes)}</td>
                          <td>{user.total_sites || 0}</td>
                          <td>{user.total_distance_km || 0} km</td>
                          <td><span className={`daily-work-badge ${status.className}`}>{status.label}</span></td>
                          <td>
                            <button type="button" className="daily-work-view" onClick={() => openUser(user)}>
                              <FiEye size={13} /> {open ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {open ? (
                          <tr>
                            <td colSpan={7}>
                              <UserDetail detail={detail} loading={detailLoading} error={detailError} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
        ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DailyWorkReport
