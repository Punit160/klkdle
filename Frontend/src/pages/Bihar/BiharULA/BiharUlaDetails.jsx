import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiMapPin,
  FiUser,
  FiCamera,
  FiCpu,
  FiMaximize2,
  FiPhone,
  FiCalendar,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { pages } from '../../../api/routes'
import {
  getUlaSlotsForVisit,
  fetchUlaSurveyById,
  mapSurveyToDetailsRecord,
  buildMapsUrl,
} from './ulaHelpers'
import { resolveUploadUrl } from '../../../utils/uploadUrl'
import UlaPhotoLightbox from './UlaPhotoLightbox'
import '../../../styles/bihar-ula.css'

const DetailItem = ({ label, value, highlight = false }) => (
  <div className="col-lg-4 col-md-6">
    <div
      className="h-100 px-3 py-3 rounded-3"
      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
    >
      <div className="fs-11 text-muted mb-1 text-uppercase fw-semibold">{label}</div>
      <div
        className={`fs-13 ${highlight ? 'fw-bold text-primary' : 'fw-semibold text-dark'} text-break`}
      >
        {value == null || value === '' ? '—' : value}
      </div>
    </div>
  </div>
)

const GpsDetailValue = ({ latitude, longitude }) => {
  const lat = latitude != null && latitude !== '' ? Number(latitude) : NaN
  const lng = longitude != null && longitude !== '' ? Number(longitude) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '—'
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  const mapUrl = buildMapsUrl(lat, lng)
  if (!mapUrl) return text
  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="ula-gps-link text-decoration-none"
    >
      {text}
    </a>
  )
}

const BiharUlaDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const recordId = searchParams.get('id')

  const [record, setRecord] = useState(location.state?.row || null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(Boolean(recordId && !location.state?.row))
  const [surveyRaw, setSurveyRaw] = useState(null)

  useEffect(() => {
    if (!recordId) return

    let cancelled = false
    setLoading(true)
    fetchUlaSurveyById(recordId)
      .then((survey) => {
        if (cancelled) return
        setSurveyRaw(survey)
        const mapped = mapSurveyToDetailsRecord(survey)
        if (mapped) setRecord(mapped)
        else setLoadError('Record not found.')
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load ULA record from server.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [recordId])

  if (loading) {
    return (
      <>
        <PageHeader />
        <div className="main-content">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5 text-muted">Loading ULA record…</div>
          </div>
        </div>
      </>
    )
  }

  if (!record) {
    return (
      <>
        <PageHeader />
        <div className="main-content">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <h5 className="text-dark">Record not found</h5>
              <p className="text-muted fs-13">
                {loadError || 'The requested Bihar ULA record could not be loaded.'}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => navigate(pages.bihar.ulaList || '/bihar/ula/list')}
              >
                <FiArrowLeft size={13} /> Back to list
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const fullLocation = [record.village, record.panchayat, record.block, record.district]
    .filter(Boolean)
    .join(', ')

  const firstVisitSlots = getUlaSlotsForVisit(
    '1st Visit',
    Boolean(record.images?.solar_meter_v1)
  )
  const secondVisitSlots = getUlaSlotsForVisit('2nd Visit', false)
  const hasSecondVisitPhotos =
    record.secondVisitComplete ||
    secondVisitSlots.some((slot) => record.images?.[slot.key])

  const secondVisitPending =
    surveyRaw?.first_visit_complete && !surveyRaw?.second_visit_complete

  const photoCount = Object.values(record.images || {}).filter(Boolean).length

  const renderPhotoGrid = (slots) =>
    slots.map((slot, index) => {
      const imgRaw = record.images?.[slot.key]
      const imgData = imgRaw ? resolveUploadUrl(imgRaw) || imgRaw : null
      const serial = record.serialNumbers?.[slot.key]

      return (
        <div key={slot.id} className="col-lg-4 col-md-6">
          <div className="ula-photo-card">
            <div className="ula-photo-card-head">
              <span className="fs-12 fw-bold text-dark text-truncate" title={slot.title}>
                {index + 1}. {slot.title}
              </span>
              <span className={`badge ${slot.badgeClass} fs-10`}>{slot.badge}</span>
            </div>
            {imgData ? (
              <>
                <div
                  className="ula-photo-frame"
                  onClick={() => setSelectedPhoto({ src: imgData, title: slot.title })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedPhoto({ src: imgData, title: slot.title })
                  }}
                >
                  <img src={imgData} alt={slot.title} />
                  <div
                    className="position-absolute top-0 end-0 m-2 bg-dark bg-opacity-75 text-white rounded p-1"
                    title="Enlarge"
                  >
                    <FiMaximize2 size={13} />
                  </div>
                </div>
                {serial && (
                  <div className="p-2 fs-11 border-top bg-light">
                    <span className="text-muted">Serial: </span>
                    <span className="font-monospace fw-semibold">{serial}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="ula-photo-empty">
                <FiCamera size={22} className="mb-2 opacity-50" />
                <span className="fs-12">Not uploaded</span>
              </div>
            )}
          </div>
        </div>
      )
    })

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="card border-0 shadow-sm overflow-hidden">
          <div className="ula-detail-hero">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-light mb-3 d-inline-flex align-items-center gap-1"
                  onClick={() => navigate(pages.bihar.ulaList || '/bihar/ula/list')}
                >
                  <FiArrowLeft size={14} /> Back to list
                </button>
                <div className="ula-detail-hero-title">CA {record.caNumber || record.id}</div>
                <div className="ula-detail-hero-sub">
                  {record.caName}
                  {fullLocation ? ` · ${fullLocation}` : ''}
                </div>
                <div className="ula-detail-chip-row">
                  <span className="ula-detail-chip">
                    <FiCalendar size={12} /> 1st: {record.firstVisitAtDisplay || record.surveyDate}
                  </span>
                  {record.secondVisitAtDisplay && (
                    <span className="ula-detail-chip">
                      <FiCalendar size={12} /> 2nd: {record.secondVisitAtDisplay}
                    </span>
                  )}
                  {record.beneficiaryContact && record.beneficiaryContact !== '-' && (
                    <span className="ula-detail-chip">
                      <FiPhone size={12} /> {record.beneficiaryContact}
                    </span>
                  )}
                  <span className="ula-detail-chip">
                    <FiCamera size={12} /> {photoCount} photos
                  </span>
                  {record.createdByName && (
                    <span className="ula-detail-chip">
                      <FiUser size={12} /> 1st visit: {record.createdByName}
                    </span>
                  )}
                  {record.secondVisitByName && (
                    <span className="ula-detail-chip">
                      <FiUser size={12} /> 2nd visit: {record.secondVisitByName}
                    </span>
                  )}
                  <span
                    className={`ula-detail-chip ${
                      record.secondVisitComplete ? 'text-success' : ''
                    }`}
                  >
                    {record.visitType}
                  </span>
                </div>
              </div>
              <div className="d-flex flex-column gap-2 align-items-stretch">
                {secondVisitPending && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      navigate(`${pages.bihar.ulaForm}?visit=2&id=${record.id}`)
                    }
                  >
                    Complete 2nd visit
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => navigate(pages.bihar.ulaForm || '/bihar/ula/form')}
                >
                  New 1st visit
                </button>
              </div>
            </div>
          </div>

          <div className="ula-detail-section">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FiUser size={16} className="text-primary" /> Consumer & location
            </h6>
            <div className="row g-3">
              <DetailItem label="CA number" value={record.caNumber} highlight />
              <DetailItem label="CA / beneficiary name" value={record.caName} />
              <DetailItem label="Beneficiary contact" value={record.beneficiaryContact} />
              <DetailItem label="District" value={record.district} />
              <DetailItem label="Block" value={record.block} />
              <DetailItem label="Panchayat" value={record.panchayat} />
              <DetailItem label="Village" value={record.village} />
              <DetailItem label="1st visit survey by" value={record.createdByName} />
              <DetailItem label="2nd visit survey by" value={record.secondVisitByName} />
            </div>
          </div>

          <div className="ula-detail-section">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FiCalendar size={16} className="text-primary" /> Visit date, time & GPS
            </h6>
            <div className="row g-3">
              <DetailItem
                label="1st visit date & time"
                value={record.firstVisitAtDisplay || '—'}
              />
              <DetailItem
                label="2nd visit date & time"
                value={record.secondVisitAtDisplay || '—'}
              />
              <DetailItem
                label="1st visit GPS"
                value={
                  <GpsDetailValue latitude={record.latitude} longitude={record.longitude} />
                }
              />
              <DetailItem
                label="2nd visit GPS"
                value={
                  <GpsDetailValue latitude={record.latitude2} longitude={record.longitude2} />
                }
              />
            </div>
          </div>

          <div className="ula-detail-section">
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FiCpu size={16} className="text-primary" /> Equipment serial numbers
            </h6>
            <div className="row g-3">
              {[
                { label: 'Panel 1', key: 'panel1_qr' },
                { label: 'Panel 2', key: 'panel2_qr' },
                { label: 'Inverter', key: 'inverter_qr' },
              ].map(({ label, key }) => (
                <div key={key} className="col-md-4">
                  <div className="ula-serial-card">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fs-12 fw-bold">{label}</span>
                      <span className="badge bg-soft-warning text-warning fs-10">QR</span>
                    </div>
                    <div className="ula-serial-value">
                      {record.serialNumbers?.[key] || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ula-detail-section">
            <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <FiCamera size={16} className="text-primary" /> 1st visit photos
            </h6>
            <p className="fs-12 text-muted mb-3">Tap a photo to view full size</p>
            <div className="row g-3">{renderPhotoGrid(firstVisitSlots)}</div>
          </div>

          {hasSecondVisitPhotos && (
            <div className="ula-detail-section">
              <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
                <FiMapPin size={16} className="text-success" /> 2nd visit photos
              </h6>
              <p className="fs-12 text-muted mb-3">Solar meter and complete system</p>
              <div className="row g-3">{renderPhotoGrid(secondVisitSlots)}</div>
            </div>
          )}
        </div>
      </div>

      <UlaPhotoLightbox
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        downloadPrefix={record.caNumber || 'ula'}
      />
    </>
  )
}

export default BiharUlaDetails
