import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCalendar,
  FiClipboard,
  FiHash,
  FiLoader,
  FiMapPin,
  FiUser,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CameraCapture from '@/components/shared/CameraCapture'
import { api, pages } from '../../../api/routes'
import localApi from '../../../api/localApi'
import { getApiErrorMessage } from '../../../utils/apiError'
import { dataUrlToUploadFile, isValidCaNumber, sanitizeCaNumberInput } from './ulaHelpers'
import '../../../styles/camera-capture.css'
import '../../../styles/bihar-ula.css'

const OK_PENDING = ['OK', 'NOT OK', 'PENDING']

const ITEMS = [
  { key: 'mms_structure', sno: 1, label: 'MMS Structure', options: OK_PENDING },
  { key: 'mms_foundation', sno: 2, label: 'MMS Structure Foundation (300mm x 300mm x 300mm)', options: OK_PENDING, photo: true },
  { key: 'pv_panel', sno: 3, label: 'PV Panel', options: OK_PENDING },
  { key: 'shadow_pv', sno: 4, label: 'Shadow on PV Panel', options: OK_PENDING, photo: true },
  { key: 'inverter', sno: 5, label: 'Inverter', options: OK_PENDING },
  { key: 'acdb', sno: 6, label: 'ACDB', options: OK_PENDING },
  { key: 'solar_meter', sno: 7, label: 'Solar Meter', options: OK_PENDING },
  { key: 'plant_status', sno: 8, label: 'Plant Status', options: ['HEALTHY', 'NOT HEALTHY', 'PENDING'] },
  { key: 'la', sno: 9, label: 'LA (Lightning Arrester)', options: OK_PENDING },
  { key: 'la_foundation', sno: 10, label: 'LA Foundation', options: OK_PENDING, photo: true },
  { key: 'la_height', sno: 11, label: 'Height of LA', options: ['ABOVE STRUCTURE', 'BELOW STRUCTURE', 'PENDING'] },
  { key: 'dc_cable', sno: 12, label: 'DC Cable', options: OK_PENDING },
  { key: 'dc_cable_dressing', sno: 13, label: 'DC Cable Dressing', options: OK_PENDING },
  { key: 'ac_cable', sno: 14, label: 'AC Cable', options: OK_PENDING },
  { key: 'ac_cable_dressing', sno: 15, label: 'AC Cable Dressing', options: OK_PENDING },
  { key: 'earthing_cable', sno: 16, label: 'Earthing Cable', options: OK_PENDING },
  { key: 'earthing_cable_dressing', sno: 17, label: 'Earthing Cable Dressing', options: OK_PENDING },
  { key: 'earthing_electrode', sno: 18, label: 'Earthing (Earth Electrode)', options: OK_PENDING },
  {
    key: 'earth_distance',
    sno: 19,
    label: 'Distance Between Each Earth Electrode (Minimum 1 Meter Distance)',
    options: OK_PENDING,
    remarksRequired: true,
  },
  { key: 'rms', sno: 20, label: 'RMS', options: OK_PENDING, photo: true },
  { key: 'rms_sim', sno: 21, label: 'RMS SIM', options: OK_PENDING, photo: true },
  { key: 'portal_upload', sno: 22, label: 'Portal Upload', options: OK_PENDING },
]

const emptyAnswers = () =>
  Object.fromEntries(ITEMS.map((item) => [item.key, { status: '', remarks: '' }]))

const today = () => new Date().toISOString().slice(0, 10)

const pair = (lat, lng) => {
  const a = String(lat || '').trim()
  const b = String(lng || '').trim()
  if (!a && !b) return ''
  return `${a || '—'}, ${b || '—'}`
}

const SectionHeading = ({ icon, title, subtitle }) => (
  <div className="d-flex align-items-center gap-3 mb-4">
    <div className="avatar-text avatar-md bg-soft-primary text-primary icon flex-shrink-0">
      {icon}
    </div>
    <div>
      <h6 className="fw-bold text-dark mb-0">{title}</h6>
      {subtitle ? <p className="fs-12 text-muted mb-0">{subtitle}</p> : null}
    </div>
  </div>
)

const ReadOnlyField = ({ label, value }) => (
  <div className="col-lg-4 col-md-6">
    <label className="form-label fs-11 text-muted mb-1">{label}</label>
    <div className="form-control bg-light fs-13">{value || '—'}</div>
  </div>
)

const BiharUlaInspectionForm = () => {
  const navigate = useNavigate()
  const [caNumber, setCaNumber] = useState('')
  const [checking, setChecking] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [site, setSite] = useState(null)
  const [canInspect, setCanInspect] = useState(false)
  const [blockMessage, setBlockMessage] = useState('')
  const [existingId, setExistingId] = useState('')
  const [inspectionDate, setInspectionDate] = useState(today())
  const [answers, setAnswers] = useState(emptyAnswers)
  const [photos, setPhotos] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const loadedKeyRef = useRef('')

  const lookup = async (raw, dateValue) => {
    const ca = sanitizeCaNumberInput(raw)
    const date = String(dateValue || today()).slice(0, 10)
    if (!isValidCaNumber(ca)) return
    const key = `${ca}|${date.slice(0, 7)}`
    if (key === loadedKeyRef.current) return
    setLookupError('')
    setSubmitError('')
    setChecking(true)
    try {
      const res = await localApi.get(api.biharUla.inspectionSite, {
        params: { ca_no: ca, inspection_date: date },
      })
      const body = res?.data || {}
      if (!body.found || !body.visits_complete) {
        loadedKeyRef.current = ''
        setSite(null)
        setCanInspect(false)
        setExistingId('')
        setBlockMessage('')
        setLookupError(body.message || 'ULA site visits are not complete for this CA.')
        return
      }
      loadedKeyRef.current = key
      setSite(body.site)
      setCanInspect(Boolean(body.can_inspect))
      setBlockMessage(body.can_inspect ? '' : body.message || '')
      setExistingId(body.blocking_inspection?.id ? String(body.blocking_inspection.id) : '')
      if (body.can_inspect && body.rejected_inspection) {
        setBlockMessage(body.message || '')
      }
      if (!body.can_inspect) {
        setAnswers(emptyAnswers())
        setPhotos({})
      }
    } catch (err) {
      loadedKeyRef.current = ''
      setSite(null)
      setCanInspect(false)
      setLookupError(getApiErrorMessage(err, 'Could not look up this CA number.'))
    } finally {
      setChecking(false)
    }
  }

  const setStatus = (key, status) => {
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], status } }))
  }

  const setRemarks = (key, remarks) => {
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], remarks } }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!site || !canInspect || submitting) return
    setSubmitError('')
    for (const item of ITEMS) {
      if (!answers[item.key]?.status) {
        setSubmitError(`Choose a status for ${item.sno}. ${item.label}.`)
        return
      }
      if (item.remarksRequired && !String(answers[item.key]?.remarks || '').trim()) {
        setSubmitError('Remarks are compulsory for the distance between earth electrodes.')
        return
      }
      if (item.photo && !photos[item.key]) {
        setSubmitError(`Photo is compulsory for ${item.sno}. ${item.label}.`)
        return
      }
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('ca_no', site.ca_no)
      fd.append('inspection_date', inspectionDate)
      fd.append(
        'answers',
        JSON.stringify(
          Object.fromEntries(
            ITEMS.map((item) => [
              item.key,
              { status: answers[item.key].status, remarks: answers[item.key].remarks || '' },
            ])
          )
        )
      )
      for (const item of ITEMS) {
        if (!item.photo || !photos[item.key]) continue
        const file = await dataUrlToUploadFile(photos[item.key], `${item.key}.jpg`)
        fd.append(item.key, file)
      }
      const res = await localApi.post(api.biharUla.inspectionStore, fd, {
        headers: { 'Content-Type': undefined },
        timeout: 120000,
      })
      const id = res?.data?.data?.id
      navigate(
        id
          ? `${pages.bihar.ulaInspectionDetails}?id=${id}`
          : pages.bihar.ulaInspectionList
      )
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not save the site inspection.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <form onSubmit={submit}>
          <div className="card mb-0 border-0 shadow-sm overflow-hidden">
            <div className="ula-form-page-title d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5>Bihar ULA — Site inspection</h5>
                <p>1.1 kWp GCRT solar plant. One inspection per CA each month.</p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
                onClick={() => navigate(pages.bihar.ulaInspectionList)}
              >
                <FiArrowLeft size={14} /> Back to list
              </button>
            </div>
            <div className="card-body">
              <SectionHeading
                icon={<FiHash size={16} />}
                title="CA Number"
                subtitle="Tab out after the CA number to load the site"
              />
              <div className="row g-3">
                <div className="col-lg-6 col-md-8">
                  <label className="form-label">
                    CA Number<span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">
                      <FiHash size={14} />
                    </span>
                    <input
                      className={`form-control${lookupError ? ' is-invalid' : ''}`}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="e.g. 1029384756"
                      value={caNumber}
                      onChange={(e) => {
                        const next = sanitizeCaNumberInput(e.target.value)
                        setCaNumber(next)
                        if (next !== caNumber) {
                          loadedKeyRef.current = ''
                          setSite(null)
                          setCanInspect(false)
                          setLookupError('')
                          setBlockMessage('')
                          setExistingId('')
                          setAnswers(emptyAnswers())
                          setPhotos({})
                        }
                      }}
                      onBlur={() => {
                        if (isValidCaNumber(caNumber)) lookup(caNumber, inspectionDate)
                      }}
                    />
                  </div>
                  {lookupError ? (
                    <div className="invalid-feedback d-block">{lookupError}</div>
                  ) : (
                    <div className="fs-11 text-muted mt-1">
                      {checking
                        ? 'Looking up this CA…'
                        : 'Digits only — tab out after CA to load the site'}
                    </div>
                  )}
                </div>
              </div>

              {site ? (
                <>
                  <hr className="border-dashed" />
                  <SectionHeading
                    icon={<FiUser size={16} />}
                    title="Site details"
                    subtitle="Taken from the completed Bihar ULA visits"
                  />
                  <div className="ula-saved-panel">
                    <div className="row g-3">
                      <ReadOnlyField label="CA Number" value={site.ca_no} />
                      <ReadOnlyField label="Consumer Name" value={site.consumer_name} />
                      <ReadOnlyField label="Mobile No." value={site.mobile} />
                      <ReadOnlyField label="District" value={site.district} />
                      <ReadOnlyField label="Block" value={site.block} />
                      <ReadOnlyField label="Panchayat" value={site.panchayat} />
                      <ReadOnlyField label="Village" value={site.village} />
                      <ReadOnlyField label="Lat. Long." value={pair(site.latitude, site.longitude)} />
                      {pair(site.latitude2, site.longitude2) ? (
                        <ReadOnlyField
                          label="2nd visit Lat. Long."
                          value={pair(site.latitude2, site.longitude2)}
                        />
                      ) : null}
                      <div className="col-lg-4 col-md-6">
                        <label className="form-label fs-11 text-muted mb-1">Inspection Date</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light text-muted">
                            <FiCalendar size={14} />
                          </span>
                          <input
                            type="date"
                            className="form-control"
                            value={inspectionDate}
                            onChange={(e) => {
                              const next = e.target.value
                              setInspectionDate(next)
                              if (next.slice(0, 7) !== inspectionDate.slice(0, 7)) {
                                loadedKeyRef.current = ''
                                lookup(caNumber, next)
                              }
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {blockMessage ? (
                    <div className={`alert ${canInspect ? 'alert-info' : 'alert-warning'} mt-3 mb-0`}>
                      {blockMessage}
                      {existingId ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-light ms-2"
                          onClick={() =>
                            navigate(`${pages.bihar.ulaInspectionDetails}?id=${existingId}`)
                          }
                        >
                          View inspection
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {canInspect ? (
                    <>
                      <hr className="border-dashed" />
                      <SectionHeading
                        icon={<FiClipboard size={16} />}
                        title="Inspection parameters"
                        subtitle="Choose a status for every point. Photos are required where marked."
                      />
                      <div className="row g-3">
                        {ITEMS.map((item) => {
                          const answer = answers[item.key] || { status: '', remarks: '' }
                          return (
                            <div key={item.key} className="col-lg-4 col-md-6">
                              <div className="card border h-100 mb-0 shadow-none">
                                <div className="card-header bg-light py-2 px-3 d-flex justify-content-between align-items-center gap-2">
                                  <span className="fs-12 fw-bold text-dark" title={item.label}>
                                    {item.sno}. {item.label}
                                  </span>
                                  {item.photo ? (
                                    <span className="badge bg-soft-primary text-primary fs-11">Photo</span>
                                  ) : item.remarksRequired ? (
                                    <span className="badge bg-soft-warning text-warning fs-11">Remarks</span>
                                  ) : null}
                                </div>
                                <div className="card-body p-3">
                                  <div className="d-flex flex-wrap gap-2 mb-3">
                                    {item.options.map((option) => (
                                      <button
                                        key={option}
                                        type="button"
                                        className={`btn btn-sm ${
                                          answer.status === option
                                            ? 'btn-primary'
                                            : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => setStatus(item.key, option)}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                  <label className="form-label fs-12 mb-1">
                                    {item.remarksRequired
                                      ? 'Remarks (distance between electrodes)'
                                      : 'Remarks if any'}
                                  </label>
                                  <input
                                    className="form-control form-control-sm"
                                    value={answer.remarks}
                                    onChange={(e) => setRemarks(item.key, e.target.value)}
                                    placeholder={
                                      item.remarksRequired
                                        ? 'Enter the distance between electrodes'
                                        : 'Optional remarks'
                                    }
                                  />
                                  {item.photo ? (
                                    <div className="mt-3">
                                      <CameraCapture
                                        label="Open camera to capture"
                                        hint="Camera only"
                                        previewDataUrl={photos[item.key] || ''}
                                        freshGps
                                        stampCaNumber={site.ca_no}
                                        stampMetadata={{
                                          caNumber: site.ca_no,
                                          fullSiteStamp: false,
                                        }}
                                        onCaptureDataUrl={(dataUrl) => {
                                          setPhotos((prev) => ({ ...prev, [item.key]: dataUrl }))
                                        }}
                                        onClear={() =>
                                          setPhotos((prev) => ({ ...prev, [item.key]: '' }))
                                        }
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {submitError ? (
                        <div className="alert alert-danger mt-3 mb-0">{submitError}</div>
                      ) : null}
                      <div className="d-flex justify-content-end gap-2 mb-0 pt-4 border-top">
                        <button
                          type="button"
                          className="btn btn-light mt-4"
                          onClick={() => navigate(pages.bihar.ulaInspectionList)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2"
                          disabled={submitting}
                        >
                          {submitting ? <FiLoader className="spin" size={14} /> : <FiMapPin size={14} />}
                          {submitting ? 'Submitting...' : 'Save site inspection'}
                        </button>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

export default BiharUlaInspectionForm
