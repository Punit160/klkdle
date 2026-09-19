import { useCallback, useEffect, useState } from 'react'
import localApi from '../api/localApi'
import { app } from '../api/routes'
import { isAuthenticated } from '../utils/auth'

export const ATTENDANCE_CHANGED_EVENT = 'klk-attendance-changed'

export const notifyAttendanceChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ATTENDANCE_CHANGED_EVENT))
  }
}

/** Today’s active punch-in session (punch in without punch out). */
export const usePunchInStatus = () => {
  const [loading, setLoading] = useState(true)
  const [isPunchedIn, setIsPunchedIn] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!isAuthenticated()) {
      setIsPunchedIn(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await localApi.get(app.attendance.today)
      setIsPunchedIn(Boolean(res?.data?.is_punched_in))
    } catch (err) {
      setIsPunchedIn(false)
      setError(err?.response?.data?.message || 'Could not load attendance status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onChange = () => refresh()
    window.addEventListener(ATTENDANCE_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(ATTENDANCE_CHANGED_EVENT, onChange)
  }, [refresh])

  return { loading, isPunchedIn, error, refresh }
}
