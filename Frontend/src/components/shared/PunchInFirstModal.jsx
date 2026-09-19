import { useEffect, useState } from 'react'
import { FiClock, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { pages } from '../../api/routes'
import { PUNCH_IN_MODAL_EVENT } from '../../utils/punchInModal'

const PunchInFirstModalHost = () => {
  const [open, setOpen] = useState(false)
  const [stateLabel, setStateLabel] = useState('Bihar / UP')

  useEffect(() => {
    const onShow = (event) => {
      const label = event?.detail?.stateLabel
      if (label) setStateLabel(label)
      setOpen(true)
    }
    window.addEventListener(PUNCH_IN_MODAL_EVENT, onShow)
    return () => window.removeEventListener(PUNCH_IN_MODAL_EVENT, onShow)
  }, [])

  if (!open) return null

  return (
    <div className="camera-capture-modal punch-in-modal" role="dialog" aria-modal="true">
      <div className="camera-capture-modal-card punch-in-modal-card">
        <div className="camera-capture-modal-head">
          <strong className="d-inline-flex align-items-center gap-2">
            <FiClock className="text-warning" /> Please punch in first
          </strong>
          <button
            type="button"
            className="btn btn-sm btn-light"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <FiX size={16} />
          </button>
        </div>
        <div className="p-3 pt-2">
          <p className="text-muted fs-13 mb-4 mb-md-3">
            Punch in from the dashboard before using {stateLabel} modules (AMC, ULA, uploads, and
            field work). After punch out, open a module again and you will see this message until
            you punch in for the day.
          </p>
          <div className="d-flex flex-wrap gap-2 justify-content-end">
            <button type="button" className="btn btn-light" onClick={() => setOpen(false)}>
              Close
            </button>
            <Link
              to={pages.dashboard}
              className="btn btn-primary"
              onClick={() => setOpen(false)}
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PunchInFirstModalHost
