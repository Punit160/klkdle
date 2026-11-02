import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiMapPin,
  FiUser,
  FiX,
} from 'react-icons/fi'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { api, pages } from '../../../api/routes'
import localApi from '../../../api/localApi'
import { userIsAdmin } from '../../../utils/userRoles'
import {
  AMC_DOC_APPROVAL,
  getAmcApprovalBadgeClass,
  getAmcApprovalLabel,
} from '../../../utils/amcApproval'
import { getApiErrorMessage } from '../../../utils/apiError'
import { buildMapsUrl } from './ulaHelpers'
import UlaPhotoLightbox from './UlaPhotoLightbox'
import '../../../styles/bihar-ula.css'

const ITEMS = [
  { key: 'mms_structure', sno: 1, label: 'MMS Structure' },
  { key: 'mms_foundation', sno: 2, label: 'MMS Structure Foundation (300mm x 300mm x 300mm)' },
  { key: 'pv_panel', sno: 3, label: 'PV Panel' },
  { key: 'shadow_pv', sno: 4, label: 'Shadow on PV Panel' },
  { key: 'inverter', sno: 5, label: 'Inverter' },
  { key: 'acdb', sno: 6, label: 'ACDB' },
  { key: 'solar_meter', sno: 7, label: 'Solar Meter' },
  { key: 'plant_status', sno: 8, label: 'Plant Status' },
  { key: 'la', sno: 9, label: 'LA (Lightning Arrester)' },
  { key: 'la_foundation', sno: 10, label: 'LA Foundation' },
  { key: 'la_height', sno: 11, label: 'Height of LA' },
  { key: 'dc_cable', sno: 12, label: 'DC Cable' },
  { key: 'dc_cable_dressing', sno: 13, label: 'DC Cable Dressing' },
  { key: 'ac_cable', sno: 14, label: 'AC Cable' },
  { key: 'ac_cable_dressing', sno: 15, label: 'AC Cable Dressing' },
  { key: 'earthing_cable', sno: 16, label: 'Earthing Cable' },
  { key: 'earthing_cable_dressing', sno: 17, label: 'Earthing Cable Dressing' },
  { key: 'earthing_electrode', sno: 18, label: 'Earthing (Earth Electrode)' },
  { key: 'earth_distance', sno: 19, label: 'Distance Between Each Earth Electrode (Minimum 1 Meter Distance)' },
  { key: 'rms', sno: 20, label: 'RMS' },
  { key: 'rms_sim', sno: 21, label: 'RMS SIM' },
  { key: 'portal_upload', sno: 22, label: 'Portal Upload' },
]

const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '—'
  return `${match[3]}-${match[2]}-${match[1]}`
}

const DetailItem = ({ label, value }) => (
  <div className="col-md-4">
    <div className="fs-11 text-muted">{label}</div>
    <div className="fw-semibold">{value || '—'}</div>
  </div>
)

const BiharUlaInspectionDetails = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const isAdmin = userIsAdmin()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejectRemarksError, setRejectRemarksError] = useState('')
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!id) {
      setError('Inspection id is missing.')
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError('')
    localApi
      .get(api.biharUla.inspectionView(id))
      .then((res) => {
        if (!cancelled) setRecord(res?.data?.data || null)
      })
      .catch((err) => {
        if (!cancelled) {
          setRecord(null)
          setError(getApiErrorMessage(err, 'Could not load this site inspection.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleApprove = async () => {
    const result = await Swal.fire({
      title: 'Approve this site inspection?',
      text: `CA ${record?.ca_no || id}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
    })
    if (!result.isConfirmed) return
    setActionId(id)
    setActionError('')
    try {
      const res = await localApi.patch(api.biharUla.inspectionApproval(id), {
        approval_status: AMC_DOC_APPROVAL.APPROVED,
      })
      setRecord(res?.data?.data || record)
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not approve this inspection.'))
    } finally {
      setActionId(null)
    }
  }

  const submitReject = async () => {
    const remarks = rejectRemarks.trim()
    if (!remarks) {
      setRejectRemarksError('Remarks are required to reject.')
      return
    }
    setActionId(id)
    setActionError('')
    try {
      const res = await localApi.patch(api.biharUla.inspectionApproval(id), {
        approval_status: AMC_DOC_APPROVAL.REJECTED,
        approval_remarks: remarks,
      })
      setRecord(res?.data?.data || record)
      setRejectOpen(false)
      setRejectRemarks('')
    } catch (err) {
      setRejectRemarksError(getApiErrorMessage(err, 'Could not reject this inspection.'))
    } finally {
      setActionId(null)
    }
  }

  const status = Number(record?.approval_status ?? 0)
  const answers = record?.answers || {}
  const mapUrl = buildMapsUrl?.(record?.latitude, record?.longitude)
  const location = [record?.district, record?.block, record?.panchayat, record?.village]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button
            type="button"
            className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
            onClick={() => navigate(pages.bihar.ulaInspectionList)}
          >
            <FiArrowLeft size={14} /> Back to inspections
          </button>
        </div>

        {loading ? <div className="text-muted">Loading site inspection…</div> : null}
        {error ? <div className="alert alert-warning">{error}</div> : null}

        {record ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
                <div>
                  <div className="ula-detail-hero-title">CA {record.ca_no || record.id}</div>
                  <div className="ula-detail-hero-sub">
                    {record.consumer_name}
                    {location ? ` · ${location}` : ''}
                  </div>
                  <div className="ula-detail-chip-row">
                    <span className="ula-detail-chip">
                      <FiCalendar size={12} /> {formatDate(record.inspection_date)}
                    </span>
                    <span className="ula-detail-chip">
                      <FiUser size={12} /> {record.user_name || '—'}
                    </span>
                    <span className="ula-detail-chip">
                      <FiCamera size={12} /> {record.photo_count || 0} photos
                    </span>
                    <span className={`badge ${getAmcApprovalBadgeClass(status)}`}>
                      {getAmcApprovalLabel(status)}
                    </span>
                  </div>
                </div>
                {isAdmin ? (
                  <div className="ula-decision">
                    {status === AMC_DOC_APPROVAL.APPROVED ? (
                      <span className="ula-decision-state ula-decision-state--approved">Approved</span>
                    ) : (
                      <button
                        type="button"
                        className="ula-decision-btn ula-decision-btn--approve"
                        disabled={actionId === id}
                        onClick={handleApprove}
                      >
                        <FiCheck size={13} /> Approve
                      </button>
                    )}
                    {status === AMC_DOC_APPROVAL.REJECTED ? (
                      <span className="ula-decision-state ula-decision-state--rejected">Rejected</span>
                    ) : (
                      <button
                        type="button"
                        className="ula-decision-btn ula-decision-btn--reject"
                        disabled={actionId === id}
                        onClick={() => {
                          setRejectOpen(true)
                          setRejectRemarks('')
                          setRejectRemarksError('')
                        }}
                      >
                        <FiX size={13} /> Reject
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
              {actionError ? <div className="fs-12 text-danger mb-3">{actionError}</div> : null}

              <div className="ula-detail-section">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                  <FiUser size={16} className="text-primary" /> Site
                </h6>
                <div className="row g-3">
                  <DetailItem label="CA number" value={record.ca_no} />
                  <DetailItem label="Consumer name" value={record.consumer_name} />
                  <DetailItem label="Mobile" value={record.mobile} />
                  <DetailItem label="District" value={record.district} />
                  <DetailItem label="Block" value={record.block} />
                  <DetailItem label="Panchayat" value={record.panchayat} />
                  <DetailItem label="Village" value={record.village} />
                  <DetailItem label="Inspection date" value={formatDate(record.inspection_date)} />
                  <DetailItem
                    label="Lat. Long."
                    value={
                      mapUrl ? (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                          <FiMapPin size={12} /> {record.latitude}, {record.longitude}
                        </a>
                      ) : (
                        [record.latitude, record.longitude].filter(Boolean).join(', ')
                      )
                    }
                  />
                </div>
              </div>

              {(record.approval_remarks || record.approval_by) && (
                <div className="ula-detail-section">
                  <h6 className="fw-bold mb-3">Approval</h6>
                  <div className="row g-3">
                    <DetailItem label="Status" value={getAmcApprovalLabel(status)} />
                    {record.approval_remarks ? (
                      <DetailItem label="Remarks" value={record.approval_remarks} />
                    ) : null}
                    {record.approval_by ? (
                      <DetailItem label="Approved / rejected by" value={record.approval_by} />
                    ) : null}
                  </div>
                </div>
              )}

              <div className="ula-detail-section">
                <h6 className="fw-bold mb-3">Inspection parameters</h6>
                <div className="d-flex flex-column gap-3">
                  {ITEMS.map((item) => {
                    const answer = answers[item.key] || {}
                    return (
                      <div key={item.key} className="border rounded p-3">
                        <div className="d-flex flex-wrap justify-content-between gap-2">
                          <div className="fw-semibold">
                            {item.sno}. {item.label}
                          </div>
                          <span className="badge bg-light text-dark">{answer.status || '—'}</span>
                        </div>
                        {answer.remarks ? (
                          <div className="fs-13 text-muted mt-2">Remarks: {answer.remarks}</div>
                        ) : null}
                        {answer.photo_url ? (
                          <button
                            type="button"
                            className="btn btn-link p-0 mt-2"
                            onClick={() =>
                              setPhoto({
                                src: answer.photo_url,
                                title: item.label,
                              })
                            }
                          >
                            <img
                              src={answer.photo_url}
                              alt={item.label}
                              className="ula-clickable-photo"
                              style={{ width: 160, height: 110, objectFit: 'cover', borderRadius: 8 }}
                            />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <UlaPhotoLightbox
        photo={photo}
        onClose={() => setPhoto(null)}
        downloadPrefix={record?.ca_no || 'inspection'}
      />

      {isAdmin && rejectOpen ? (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100000 }} />
          <div className="modal fade show d-block" style={{ zIndex: 100001 }} role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reject site inspection</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setRejectOpen(false)} />
                </div>
                <div className="modal-body">
                  <label className="form-label">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className={`form-control${rejectRemarksError ? ' is-invalid' : ''}`}
                    rows={4}
                    value={rejectRemarks}
                    placeholder="Write the reason for rejection"
                    onChange={(e) => {
                      setRejectRemarks(e.target.value)
                      if (rejectRemarksError) setRejectRemarksError('')
                    }}
                  />
                  {rejectRemarksError ? (
                    <div className="invalid-feedback d-block">{rejectRemarksError}</div>
                  ) : null}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setRejectOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={submitReject}>
                    {actionId ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

export default BiharUlaInspectionDetails
