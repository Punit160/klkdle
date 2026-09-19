import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { pages } from '../api/routes'
import { openPunchInFirstModal } from '../utils/punchInModal'

/** Redirect to dashboard and open punch-in popup once. */
const PunchInRedirect = ({ stateLabel }) => {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    openPunchInFirstModal(stateLabel)
  }, [stateLabel])

  return <Navigate to={pages.dashboard} replace />
}

export default PunchInRedirect
