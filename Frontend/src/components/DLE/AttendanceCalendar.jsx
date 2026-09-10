import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { formatAttendanceTime } from '../../utils/attendanceFormat'
import '../../styles/DLE/attendance-report.css'

const toDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-CA')
}

const AttendanceCalendar = forwardRef(({ year: yearProp, month: monthProp }, ref) => {
  const now = new Date()
  const [activeDate, setActiveDate] = useState(now)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  const year = yearProp ?? activeDate.getFullYear()
  const month = monthProp ?? activeDate.getMonth() + 1

  useEffect(() => {
    if (yearProp && monthProp) {
      setActiveDate((current) => {
        const day = Math.min(current.getDate(), new Date(yearProp, monthProp, 0).getDate())
        return new Date(yearProp, monthProp - 1, day)
      })
    }
  }, [yearProp, monthProp])

  const handleDateChange = (value) => {
    const next = Array.isArray(value) ? value[0] : value
    if (next instanceof Date) {
      setActiveDate(next)
    }
  }

  const loadMonth = useCallback(async () => {
    setLoading(true)

    try {
      const res = await localApi.get(app.attendance.month, {
        params: { year, month },
      })
      setRecords(res.data.records || [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  useImperativeHandle(ref, () => ({
    refresh: loadMonth,
  }))

  const recordMap = useMemo(() => {
    const map = new Map()
    records.forEach((record) => {
      map.set(record.attendance_date, record)
    })
    return map
  }, [records])

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null

    const key = toDateKey(date)
    const record = recordMap.get(key)
    if (!record) return null

    if (!record.punch_out_at) return 'attendance-day-open'
    if (record.punch_out_auto) return 'attendance-day-auto'
    return 'attendance-day-done'
  }

  const selectedRecord = useMemo(() => {
    const key = toDateKey(activeDate)
    return recordMap.get(key) || null
  }, [activeDate, recordMap])

  return (
    <div className="card stretch stretch-full attendance-calendar-card">
      <div className="card-header">
        <h5 className="card-title mb-0">Attendance Calendar</h5>
      </div>

      <div className="card-body">
        {loading && <p className="fs-12 text-muted">Loading calendar...</p>}

        <Calendar
          onChange={handleDateChange}
          value={activeDate}
          activeStartDate={yearProp && monthProp ? new Date(yearProp, monthProp - 1, 1) : undefined}
          tileClassName={tileClassName}
          className="attendance-mini-calendar"
          showNeighboringMonth={false}
        />

        <div className="attendance-legend">
          <span><i className="dot done" /> Present</span>
          <span><i className="dot auto" /> Auto punch out</span>
          <span><i className="dot open" /> Still in</span>
        </div>

        {selectedRecord && (
          <div className="attendance-day-detail">
            <strong>{selectedRecord.attendance_date}</strong>
            <span>
              In: {formatAttendanceTime(selectedRecord.punch_in_at)}
              {' · '}
              Out: {selectedRecord.punch_out_at ? formatAttendanceTime(selectedRecord.punch_out_at) : 'Open'}
            </span>
            {selectedRecord.punch_out_auto && (
              <em>Auto punch out after 10 hours</em>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

AttendanceCalendar.displayName = 'AttendanceCalendar'

export default AttendanceCalendar
