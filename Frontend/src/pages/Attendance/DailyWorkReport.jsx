import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { userIsAdmin } from '../../utils/userRoles'
import { formatAttendanceTime, formatCoords } from '../../utils/attendanceFormat'
import '../../styles/DLE/daily-work-report.css'

const todayInput = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const formatHours = (minutes) => {
  if (minutes == null) return '—'
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

const DailyWorkReport = () => {
  const isAdmin = userIsAdmin()
  const [date, setDate] = useState(todayInput)
  const [userId, setUserId] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    localApi
      .get(app.attendance.workReport, { params: { date } })
      .then((res) => {
        if (cancelled) return
        const rows = res.data?.users || []
        setUsers(rows)
        setOpenId((current) => current || rows[0]?.user_id || '')
      })
      .catch((err) => {
        if (cancelled) return
        setUsers([])
        setError(err.response?.data?.message || 'Could not load the daily work report.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, isAdmin])

  const visibleUsers = useMemo(
    () => (isAdmin && userId ? users.filter((user) => user.user_id === userId) : users),
    [users, isAdmin, userId]
  )

  const totals = useMemo(
    () => ({
      people: visibleUsers.length,
      sites: visibleUsers.reduce((sum, user) => sum + user.site_count, 0),
      distance:
        Math.round(visibleUsers.reduce((sum, user) => sum + Number(user.distance_km || 0), 0) * 100) / 100,
    }),
    [visibleUsers]
  )

  const userOptions = useMemo(
    () => users.map((user) => ({ id: user.user_id, name: user.name })),
    [users]
  )

  return (
    <div>
      <PageHeader />
      <div className="main-content daily-work-page">
        <div className="daily-work-head">
          <div>
            <h4>Daily work</h4>
            <p>
              {isAdmin
                ? 'Punch in, punch out, sites, GPS, and distance for every user.'
                : 'Your punch in, punch out, sites, GPS, and distance for the day.'}
            </p>
          </div>
          <div className="daily-work-filters">
            <label>
              Date
              <input type="date" value={date} max={todayInput()} onChange={(event) => setDate(event.target.value)} />
            </label>
            {isAdmin ? (
              <label>
                User
                <select value={userId} onChange={(event) => setUserId(event.target.value)}>
                  <option value="">All users</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>

        <div className="daily-work-stats">
          <div><span>People</span><strong>{totals.people}</strong></div>
          <div><span>Sites</span><strong>{totals.sites}</strong></div>
          <div><span>Distance</span><strong>{totals.distance} km</strong></div>
        </div>

        {error ? <div className="alert alert-warning">{error}</div> : null}
        {loading ? <div className="daily-work-empty">Loading the day’s work…</div> : null}
        {!loading && !error && visibleUsers.length === 0 ? (
          <div className="daily-work-empty">No punch-in or field work on this date.</div>
        ) : null}

        <div className="daily-work-list">
          {visibleUsers.map((user) => {
            const open = openId === user.user_id
            const punchInMap = mapsUrl(user.punch_in_latitude, user.punch_in_longitude)
            const punchOutMap = mapsUrl(user.punch_out_latitude, user.punch_out_longitude)
            return (
              <article key={user.user_id} className="daily-work-card">
                <button type="button" className="daily-work-card-head" onClick={() => setOpenId(open ? '' : user.user_id)}>
                  <div>
                    <h5>{user.name}</h5>
                    <p>
                      In {formatAttendanceTime(user.punch_in_at)} · Out{' '}
                      {user.punch_out_at
                        ? `${formatAttendanceTime(user.punch_out_at)}${user.punch_out_auto ? ' (auto)' : ''}`
                        : user.punch_in_at
                          ? date === todayInput()
                            ? 'Still working'
                            : 'No punch out'
                          : '—'}
                    </p>
                  </div>
                  <div className="daily-work-pills">
                    <span>{formatHours(user.duration_minutes)}</span>
                    <span>{user.site_count} sites</span>
                    <span>{user.distance_km} km</span>
                  </div>
                </button>
                {open ? (
                  <div className="daily-work-card-body">
                    <div className="daily-work-punch">
                      <div>
                        <span>Punch in</span>
                        <strong>{formatAttendanceTime(user.punch_in_at)}</strong>
                        {punchInMap ? (
                          <a href={punchInMap} target="_blank" rel="noopener noreferrer">
                            {formatCoords(user.punch_in_latitude, user.punch_in_longitude)}
                          </a>
                        ) : (
                          <em>No GPS</em>
                        )}
                      </div>
                      <div>
                        <span>Punch out</span>
                        <strong>
                          {formatAttendanceTime(user.punch_out_at)}
                          {user.punch_out_auto ? ' · auto' : ''}
                        </strong>
                        {punchOutMap ? (
                          <a href={punchOutMap} target="_blank" rel="noopener noreferrer">
                            {formatCoords(user.punch_out_latitude, user.punch_out_longitude)}
                          </a>
                        ) : (
                          <em>{user.punch_out_at ? 'No GPS' : date === todayInput() ? 'Not punched out' : 'No punch out'}</em>
                        )}
                      </div>
                      <div>
                        <span>Work mix</span>
                        <strong>
                          {user.ula_visits} ULA · {user.field_amc} field AMC · {user.documents} documents
                        </strong>
                      </div>
                    </div>
                    {user.sites.length === 0 ? (
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
                            {user.sites.map((site, index) => {
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
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default DailyWorkReport
