import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiClock, FiLogIn, FiLogOut } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import AttendanceCalendar from '../../components/DLE/AttendanceCalendar'
import AttendanceWidget from '../../components/DLE/AttendanceWidget'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import {
  calcDuration,
  formatAttendanceDate,
  formatAttendanceTime,
  formatCoords,
  getAttendanceStatus,
  MONTH_NAMES,
} from '../../utils/attendanceFormat'
import '../../styles/DLE/attendance-report.css'

const AttendanceReport = () => {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMonth = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await localApi.get(app.attendance.month, { params: { year, month } })
      setRecords(res.data.records || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance report')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const goPrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const isFuture =
      nextYear > now.getFullYear()
      || (nextYear === now.getFullYear() && nextMonth > now.getMonth() + 1)

    if (isFuture) return

    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const isNextDisabled =
    year > now.getFullYear()
    || (year === now.getFullYear() && month >= now.getMonth() + 1)

  const summary = useMemo(() => {
    const present = records.filter((r) => r.punch_out_at && !r.punch_out_auto).length
    const autoOut = records.filter((r) => r.punch_out_auto).length
    const inProgress = records.filter((r) => !r.punch_out_at).length

    let totalMinutes = 0
    records.forEach((r) => {
      if (!r.punch_in_at || !r.punch_out_at) return
      const ms = new Date(r.punch_out_at) - new Date(r.punch_in_at)
      if (ms > 0) totalMinutes += Math.floor(ms / 60000)
    })

    const avgHours = records.length
      ? `${Math.floor(totalMinutes / records.length / 60)}h ${Math.floor((totalMinutes / records.length) % 60)}m`
      : '—'

    return { present, autoOut, inProgress, total: records.length, avgHours }
  }, [records])

  return (
    <div>
      <PageHeader>
        <div />
      </PageHeader>

      <div className="main-content attendance-report-page">
        <div className="attendance-report-header">
          <div>
            <h4 className="fw-bold text-dark mb-1">Attendance Report</h4>
            <p className="fs-13 text-muted mb-0">Month-wise punch in / punch out history with location</p>
          </div>

          <div className="month-switcher">
            <button type="button" className="month-switcher-btn" onClick={goPrevMonth} aria-label="Previous month">
              <FiChevronLeft />
            </button>
            <div className="month-switcher-label">
              <strong>{MONTH_NAMES[month - 1]}</strong>
              <span>{year}</span>
            </div>
            <button
              type="button"
              className="month-switcher-btn"
              onClick={goNextMonth}
              disabled={isNextDisabled}
              aria-label="Next month"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-12">
            <AttendanceWidget onRefreshCalendar={loadMonth} />
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3">
            <div className="attendance-stat-card">
              <span>Total Days</span>
              <strong>{summary.total}</strong>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="attendance-stat-card present">
              <span>Present</span>
              <strong>{summary.present}</strong>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="attendance-stat-card auto">
              <span>Auto Punch Out</span>
              <strong>{summary.autoOut}</strong>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="attendance-stat-card hours">
              <span>Avg. Duration</span>
              <strong>{summary.avgHours}</strong>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-xxl-8">
            <div className="card stretch stretch-full">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">Monthly Records</h5>
                <span className="fs-12 text-muted">{MONTH_NAMES[month - 1]} {year}</span>
              </div>

              <div className="card-body p-0">
                {error && <div className="attendance-table-error">{error}</div>}

                {loading ? (
                  <p className="p-4 text-muted fs-13 mb-0">Loading report...</p>
                ) : records.length === 0 ? (
                  <p className="p-4 text-muted fs-13 mb-0">No attendance records for this month.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table attendance-report-table mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th><FiLogIn size={14} /> Punch In</th>
                          <th>In Location</th>
                          <th><FiLogOut size={14} /> Punch Out</th>
                          <th>Out Location</th>
                          <th><FiClock size={14} /> Duration</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...records].reverse().map((row) => {
                          const status = getAttendanceStatus(row)
                          return (
                            <tr key={row.id}>
                              <td className="date-cell">{formatAttendanceDate(row.attendance_date)}</td>
                              <td>{formatAttendanceTime(row.punch_in_at)}</td>
                              <td className="loc-cell">{formatCoords(row.punch_in_latitude, row.punch_in_longitude)}</td>
                              <td>{formatAttendanceTime(row.punch_out_at)}</td>
                              <td className="loc-cell">{formatCoords(row.punch_out_latitude, row.punch_out_longitude)}</td>
                              <td>{calcDuration(row.punch_in_at, row.punch_out_at)}</td>
                              <td>
                                <span className={`attendance-table-badge ${status.className}`}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-xxl-4">
            <AttendanceCalendar year={year} month={month} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AttendanceReport
