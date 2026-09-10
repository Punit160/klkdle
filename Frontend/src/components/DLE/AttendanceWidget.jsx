import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiCalendar, FiLogIn, FiLogOut, FiMapPin } from 'react-icons/fi'
import localApi from '../../api/localApi'
import { app, pages } from '../../api/routes'
import {
  formatAttendanceTime,
  formatCoords,
} from '../../utils/attendanceFormat'
import { captureCurrentLocation, captureLocationOptional } from '../../utils/geolocation'
import '../../styles/DLE/dle-dashboard.css'

const AttendanceWidget = ({ showReportLink = false, onRefreshCalendar }) => {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [error, setError] = useState('')
  const [today, setToday] = useState(null)
  const [isPunchedIn, setIsPunchedIn] = useState(false)
  const [autoNotice, setAutoNotice] = useState('')

  const loadToday = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await localApi.get(app.attendance.today)
      const data = res.data

      setToday(data.today)
      setIsPunchedIn(!!data.is_punched_in)

      if (Array.isArray(data.auto_closed) && data.auto_closed.length > 0) {
        setAutoNotice('Previous session was auto punched out after 10 hours.')
      } else {
        setAutoNotice('')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  const handlePunchIn = async () => {
    setActionLoading('in')
    setError('')

    try {
      const coords = await captureCurrentLocation()
      const res = await localApi.post(app.attendance.punchIn, coords)

      setToday(res.data.record)
      setIsPunchedIn(true)
      setAutoNotice('')
      onRefreshCalendar?.()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Punch in failed')
    } finally {
      setActionLoading('')
    }
  }

  const handlePunchOut = async () => {
    setActionLoading('out')
    setError('')

    try {
      const coords = await captureLocationOptional()
      const res = await localApi.post(app.attendance.punchOut, coords)

      setToday(res.data.record)
      setIsPunchedIn(false)
      onRefreshCalendar?.()

      if (!coords.latitude && !coords.longitude) {
        setAutoNotice('Punch out saved without GPS location.')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Punch out failed')
    } finally {
      setActionLoading('')
    }
  }

  return (
    <div className="card stretch stretch-full attendance-card dashboard-attendance-card">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h5 className="card-title mb-0">Today&apos;s Attendance</h5>
          <span className="fs-12 text-muted">Punch in / out with GPS location</span>
        </div>
        {showReportLink && (
          <Link to={pages.attendance} className="attendance-report-link">
            <FiCalendar size={14} /> View Report
          </Link>
        )}
      </div>

      <div className="card-body">
        {loading ? (
          <p className="text-muted fs-13 mb-0">Loading attendance...</p>
        ) : (
          <>
            {error && <div className="attendance-alert error">{error}</div>}
            {autoNotice && <div className="attendance-alert info">{autoNotice}</div>}

            <div className="attendance-status-row">
              <div className={`attendance-status-badge ${isPunchedIn ? 'active' : 'idle'}`}>
                {isPunchedIn ? 'Punched In' : today?.punch_out_at ? 'Completed' : 'Not Punched In'}
              </div>
              {today?.punch_out_auto && (
                <span className="attendance-auto-tag">Auto Punch Out</span>
              )}
            </div>

            <div className="attendance-times">
              <div className="attendance-time-item">
                <FiLogIn />
                <div>
                  <span>Punch In</span>
                  <strong>{formatAttendanceTime(today?.punch_in_at)}</strong>
                  <small>{formatCoords(today?.punch_in_latitude, today?.punch_in_longitude)}</small>
                </div>
              </div>

              <div className="attendance-time-item">
                <FiLogOut />
                <div>
                  <span>Punch Out</span>
                  <strong>{formatAttendanceTime(today?.punch_out_at)}</strong>
                  <small>{formatCoords(today?.punch_out_latitude, today?.punch_out_longitude)}</small>
                </div>
              </div>
            </div>

            <div className="attendance-actions">
              <button
                type="button"
                className="btn btn-primary attendance-btn"
                onClick={handlePunchIn}
                disabled={isPunchedIn || !!actionLoading || !!today?.punch_out_at}
              >
                <FiLogIn />
                {actionLoading === 'in' ? 'Punching In...' : 'Punch In'}
              </button>

              <button
                type="button"
                className="btn btn-light-brand attendance-btn"
                onClick={handlePunchOut}
                disabled={!isPunchedIn || !!actionLoading}
              >
                <FiLogOut />
                {actionLoading === 'out' ? 'Punching Out...' : 'Punch Out'}
              </button>
            </div>

            <p className="attendance-note">
              <FiMapPin size={13} />
              Forgot to punch out? System auto-closes 10 hours after punch in.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default AttendanceWidget
