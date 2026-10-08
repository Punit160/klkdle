import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiEye,
  FiPlus,
  FiDownload,
  FiMapPin,
  FiCamera,
  FiSearch,
  FiRefreshCw,
  FiCheck,
  FiX,
} from 'react-icons/fi'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import Pagination from '@/components/shared/Pagination'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import { pages } from '../../../api/routes'
import {
  fetchUlaSurveys,
  formatSurveyDateDisplay,
  formatSurveyDateTimeDisplay,
  downloadUlaImagesZip,
  buildMapsUrl,
  formatGpsPair,
  formatGpsDistance,
  countUlaSurveyPhotos,
  expectedFirstVisitPhotoCount,
  resolveUlaSurveyorDisplayName,
  resolveUlaSecondSurveyorDisplayName,
  resolveUlaSecondVisitAt,
  updateUlaApproval,
  ulaSecondVisitNeeded,
  ulaSolarMeterOnFirstVisit,
  ulaVisitsReadyForApproval,
} from './ulaHelpers'
import { userIsAdmin } from '../../../utils/userRoles'
import {
  AMC_DOC_APPROVAL,
  getAmcApprovalBadgeClass,
  getAmcApprovalLabel,
} from '../../../utils/amcApproval'
import { getApiErrorMessage } from '../../../utils/apiError'
import '../../../styles/bihar-ula.css'

const PER_PAGE = 15

const BiharUlaList = () => {
  const navigate = useNavigate()
  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions()

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('pending')
  const [visitFilter, setVisitFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [zipDownloadingId, setZipDownloadingId] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [listError, setListError] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejectRemarksError, setRejectRemarksError] = useState('')
  const isAdmin = userIsAdmin()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setListError('')
    fetchUlaSurveys()
      .then(({ rows }) => {
        if (!cancelled) {
          setRecords(
            rows.map((row) => {
              const secondBy = resolveUlaSecondSurveyorDisplayName(row)
              const secondDisplay = secondBy === '—' ? '' : secondBy
              return {
              id: row.id,
              caNumber: row.ca_no,
              caName: row.ca_name,
              district: row.district,
              block: row.block,
              panchayat: row.panchayat,
              village: row.village,
              dateTime: row.survey_date,
              createdAt: row.created_at,
              firstVisitByName: resolveUlaSurveyorDisplayName(row),
              createdByName: resolveUlaSurveyorDisplayName(row),
              secondVisitByName: secondDisplay || null,
              secondVisitSurveyor: secondDisplay,
              secondVisitById: row.user_id2,
              apiUserName2: row.user_name2,
              apiSecondVisitSurveyor: row.second_visit_surveyor,
              secondVisitAt: resolveUlaSecondVisitAt(row),
              latitude: row.latitude,
              longitude: row.longitude,
              latitude2: row.latitude2,
              longitude2: row.longitude2,
              solarMeterOnFirst: ulaSolarMeterOnFirstVisit(row),
              secondVisitComplete: Boolean(row.second_visit_complete),
              firstVisitComplete: Boolean(row.first_visit_complete),
              visitType: row.second_visit_complete
                ? 'Complete'
                : ulaSolarMeterOnFirstVisit(row) && row.first_visit_complete
                  ? 'Complete'
                  : row.first_visit_complete
                    ? '1st done'
                    : 'Draft',
              secondVisitPending: ulaSecondVisitNeeded(row),
              visitsReady: ulaVisitsReadyForApproval(row),
              imagesCount: countUlaSurveyPhotos(row),
              expectedPhotoCount:
                expectedFirstVisitPhotoCount(row) +
                (row.second_visit_complete ? 2 : 0),
              approvalStatus: Number(row.approval_status ?? 0),
              approvalRemarks: row.approval_remarks || '',
            }})
          )
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRecords([])
          setListError(
            err?.response?.data?.message ||
              'Could not load your ULA records. Try logging in again.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const stats = useMemo(() => {
    const total = records.length
    const pendingApproval = records.filter(
      (r) =>
        r.approvalStatus !== AMC_DOC_APPROVAL.APPROVED &&
        r.approvalStatus !== AMC_DOC_APPROVAL.REJECTED
    ).length
    const secondComplete = records.filter((r) => r.visitsReady).length
    const pendingSecond = records.filter((r) => r.secondVisitPending).length
    const approved = records.filter((r) => r.approvalStatus === AMC_DOC_APPROVAL.APPROVED).length
    const rejected = records.filter((r) => r.approvalStatus === AMC_DOC_APPROVAL.REJECTED).length
    return { total, pendingApproval, secondComplete, pendingSecond, approved, rejected }
  }, [records])

  const districtOptions = useMemo(
    () =>
      [...new Set(records.map((row) => String(row.district || '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [records]
  )

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter((r) => {
      if (
        approvalFilter === 'pending' &&
        (r.approvalStatus === AMC_DOC_APPROVAL.APPROVED ||
          r.approvalStatus === AMC_DOC_APPROVAL.REJECTED)
      ) {
        return false
      }
      if (approvalFilter === 'approved' && r.approvalStatus !== AMC_DOC_APPROVAL.APPROVED) {
        return false
      }
      if (approvalFilter === 'rejected' && r.approvalStatus !== AMC_DOC_APPROVAL.REJECTED) {
        return false
      }
      if (visitFilter === 'second_pending' && !r.secondVisitPending) return false
      if (visitFilter === 'complete' && !r.visitsReady) return false
      if (visitFilter === 'draft' && r.firstVisitComplete) return false
      if (districtFilter && String(r.district || '').trim() !== districtFilter) return false
      if (!q) return true
      const hay = [
        r.caNumber,
        r.caName,
        r.district,
        r.block,
        r.panchayat,
        r.village,
        r.createdByName,
        r.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [records, search, approvalFilter, visitFilter, districtFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, approvalFilter, visitFilter, districtFilter])

  const resetFilters = () => {
    setApprovalFilter('pending')
    setVisitFilter('')
    setDistrictFilter('')
    setSearch('')
  }

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return filteredRecords.slice(start, start + PER_PAGE)
  }, [filteredRecords, currentPage])

  const totalPages = Math.ceil(filteredRecords.length / PER_PAGE) || 1

  const openSecondVisit = (id) => {
    navigate(`${pages.bihar.ulaForm}?visit=2&id=${id}`)
  }

  const handleDownloadZip = async (row) => {
    if (!row?.id || zipDownloadingId) return
    setZipDownloadingId(row.id)
    try {
      await downloadUlaImagesZip(row.id, row.caNumber)
    } catch {
      alert('Could not download images ZIP. Check login and that photos exist for this CA.')
    } finally {
      setZipDownloadingId(null)
    }
  }

  const patchRecordApproval = (id, status, remarks) => {
    setRecords((prev) =>
      prev.map((row) =>
        String(row.id) === String(id)
          ? { ...row, approvalStatus: Number(status), approvalRemarks: remarks || '' }
          : row
      )
    )
  }

  const handleApprove = async (row) => {
    if (!row?.visitsReady) return
    const result = await Swal.fire({
      title: 'Approve this ULA survey?',
      text: `CA ${row.caNumber || row.id} — ${row.caName || ''}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    })
    if (!result.isConfirmed) return
    setActionId(row.id)
    setListError('')
    try {
      await updateUlaApproval(row.id, AMC_DOC_APPROVAL.APPROVED)
      patchRecordApproval(row.id, AMC_DOC_APPROVAL.APPROVED, '')
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not approve this ULA survey.'))
    } finally {
      setActionId(null)
    }
  }

  const openReject = (row) => {
    setRejectTarget(row)
    setRejectRemarks('')
    setRejectRemarksError('')
  }

  const closeReject = () => {
    if (actionId) return
    setRejectTarget(null)
    setRejectRemarks('')
    setRejectRemarksError('')
  }

  const submitReject = async () => {
    const remarks = rejectRemarks.trim()
    if (!remarks) {
      setRejectRemarksError('Remarks are required to reject.')
      return
    }
    if (!rejectTarget?.id) return
    setActionId(rejectTarget.id)
    setListError('')
    setRejectRemarksError('')
    try {
      await updateUlaApproval(rejectTarget.id, AMC_DOC_APPROVAL.REJECTED, remarks)
      patchRecordApproval(rejectTarget.id, AMC_DOC_APPROVAL.REJECTED, remarks)
      setRejectTarget(null)
      setRejectRemarks('')
    } catch (err) {
      setRejectRemarksError(getApiErrorMessage(err, 'Could not reject this ULA survey.'))
    } finally {
      setActionId(null)
    }
  }

  const handleExportCSV = () => {
    if (!filteredRecords.length) {
      alert('No records to export.')
      return
    }

    const headers = [
      'ID',
      'CA Number',
      'CA Name',
      'District',
      'Block',
      'Panchayat',
      'Village',
      'Survey Date',
      '1st visit by',
      '2nd visit by',
      'Latitude',
      'Longitude',
      'Status',
      'Approval',
      'Photos Count',
    ]

    const rows = filteredRecords.map((r) => [
      r.id,
      r.caNumber,
      `"${(r.caName || '').replace(/"/g, '""')}"`,
      r.district,
      `"${r.block || ''}"`,
      `"${r.panchayat || ''}"`,
      `"${r.village || ''}"`,
      `"${formatSurveyDateDisplay(r.dateTime)}"`,
      `"${formatFirstSurveyorCell(r).replace(/"/g, '""')}"`,
      `"${formatSecondSurveyorCell(r).replace(/"/g, '""')}"`,
      r.latitude || '',
      r.longitude || '',
      r.secondVisitComplete
        ? '2nd complete'
        : r.solarMeterOnFirst && r.firstVisitComplete
          ? 'Complete (solar meter on 1st visit)'
          : r.firstVisitComplete
            ? '1st complete'
            : 'Draft',
      getAmcApprovalLabel(r.approvalStatus),
      r.imagesCount,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `Bihar_ULA_Records_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const visitPillClass = (row) => {
    if (row.secondVisitComplete || (row.solarMeterOnFirst && row.firstVisitComplete)) {
      return 'ula-visit-pill ula-visit-pill--complete'
    }
    if (row.secondVisitPending) return 'ula-visit-pill ula-visit-pill--pending'
    return 'ula-visit-pill ula-visit-pill--first'
  }

  const visitPillLabel = (row) => {
    if (row.secondVisitComplete) return '2nd visit done'
    if (row.solarMeterOnFirst && row.firstVisitComplete) return 'Complete'
    if (row.secondVisitPending) return '2nd visit pending'
    if (row.firstVisitComplete) return '1st visit done'
    return 'Draft'
  }

  const formatFirstSurveyorCell = (row) => row.firstVisitByName || row.createdByName || '—'

  const formatSecondSurveyorCell = (row) => {
    const named =
      row.secondVisitSurveyor ||
      row.secondVisitByName ||
      String(row.apiSecondVisitSurveyor ?? row.apiUserName2 ?? '').trim()
    if (named) return named

    const secondUserId = String(row.secondVisitById ?? '').trim()
    if (secondUserId) return `User #${secondUserId}`

    if (row.secondVisitAt || row.secondVisitComplete) return '—'
    if (row.secondVisitPending) return 'Pending'
    return '—'
  }

  if (isRemoved) return null

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-fullscreen' : ''}`}>
              <CardHeader
                title={
                  isAdmin
                    ? 'Bihar ULA — All surveys'
                    : 'Bihar ULA — Solar Rooftop Surveys'
                }
                refresh={handleRefresh}
                remove={handleDelete}
                expanded={handleExpand}
              />
              <div className="card-body custom-card-action p-0">
                <div className="ula-stat-grid">
                  <button
                    type="button"
                    className={`ula-stat-card${approvalFilter === 'pending' && !visitFilter ? ' is-active' : ''}`}
                    onClick={() => {
                      setApprovalFilter('pending')
                      setVisitFilter('')
                    }}
                  >
                    <div className="ula-stat-value text-warning">{stats.pendingApproval}</div>
                    <div className="ula-stat-label">Pending approval</div>
                  </button>
                  <button
                    type="button"
                    className={`ula-stat-card${approvalFilter === 'approved' ? ' is-active' : ''}`}
                    onClick={() => setApprovalFilter('approved')}
                  >
                    <div className="ula-stat-value text-success">{stats.approved}</div>
                    <div className="ula-stat-label">Approved</div>
                  </button>
                  <button
                    type="button"
                    className={`ula-stat-card${approvalFilter === 'rejected' ? ' is-active' : ''}`}
                    onClick={() => setApprovalFilter('rejected')}
                  >
                    <div className="ula-stat-value text-danger">{stats.rejected}</div>
                    <div className="ula-stat-label">Rejected</div>
                  </button>
                  <button
                    type="button"
                    className={`ula-stat-card${approvalFilter === '' && !visitFilter && !districtFilter ? ' is-active' : ''}`}
                    onClick={() => {
                      setApprovalFilter('')
                      setVisitFilter('')
                      setDistrictFilter('')
                    }}
                  >
                    <div className="ula-stat-value">{stats.total}</div>
                    <div className="ula-stat-label">All records</div>
                  </button>
                  <button
                    type="button"
                    className={`ula-stat-card${visitFilter === 'second_pending' ? ' is-active' : ''}`}
                    onClick={() =>
                      setVisitFilter((prev) => (prev === 'second_pending' ? '' : 'second_pending'))
                    }
                  >
                    <div className="ula-stat-value text-primary">{stats.pendingSecond}</div>
                    <div className="ula-stat-label">2nd visit pending</div>
                  </button>
                  <button
                    type="button"
                    className={`ula-stat-card${visitFilter === 'complete' ? ' is-active' : ''}`}
                    onClick={() =>
                      setVisitFilter((prev) => (prev === 'complete' ? '' : 'complete'))
                    }
                  >
                    <div className="ula-stat-value text-success">{stats.secondComplete}</div>
                    <div className="ula-stat-label">Visits complete</div>
                  </button>
                </div>

                {listError && (
                  <div className="alert alert-warning mx-3 mt-3 mb-0 py-2 fs-13">{listError}</div>
                )}

                <div className="ula-toolbar">
                  <div className="ula-filters">
                    <select
                      value={approvalFilter}
                      onChange={(event) => setApprovalFilter(event.target.value)}
                      aria-label="Filter by approval"
                    >
                      <option value="pending">Pending approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="">All approvals</option>
                    </select>
                    <select
                      value={visitFilter}
                      onChange={(event) => setVisitFilter(event.target.value)}
                      aria-label="Filter by visit"
                    >
                      <option value="">All visits</option>
                      <option value="draft">1st visit incomplete</option>
                      <option value="second_pending">2nd visit pending</option>
                      <option value="complete">Visits complete</option>
                    </select>
                    <select
                      value={districtFilter}
                      onChange={(event) => setDistrictFilter(event.target.value)}
                      aria-label="Filter by district"
                    >
                      <option value="">All districts</option>
                      {districtOptions.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-sm btn-light" onClick={resetFilters}>
                      Reset
                    </button>
                  </div>
                  <div className="ula-search-wrap">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white">
                        <FiSearch size={14} />
                      </span>
                      <input
                        type="search"
                        className="form-control"
                        placeholder="Search CA, name, district, village…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
                      onClick={handleRefresh}
                    >
                      <FiRefreshCw size={13} /> Refresh
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                      onClick={() => navigate(pages.bihar.ulaDashboard)}
                    >
                      Dashboard
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      onClick={handleExportCSV}
                    >
                      <FiDownload size={13} /> Export CSV
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                      onClick={() => navigate(pages.bihar.ulaForm || '/bihar/ula/form')}
                    >
                      <FiPlus size={14} /> New 1st visit
                    </button>
                  </div>
                </div>

                <div className="table-responsive ula-table-wrapper">
                  <table className="table table-hover mb-0 ula-table">
                    <thead>
                      <tr>
                        <th style={{ width: '56px' }}>#</th>
                        <th>Consumer (CA)</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Survey by (1st / 2nd)</th>
                        <th>Visit date & time</th>
                        <th>GPS</th>
                        <th>Photos</th>
                        <th className="ula-view-col">View</th>
                        {isAdmin ? <th className="ula-actions-col">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={isAdmin ? 10 : 9} className="text-center py-5 text-muted">
                            Loading ULA records…
                          </td>
                        </tr>
                      )}
                      {!loading && paginatedRecords.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin ? 10 : 9} className="text-center py-5">
                            <div className="text-muted mb-2">
                              {records.length
                                ? 'No records match these filters.'
                                : 'No records found.'}
                            </div>
                            {records.length ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-light"
                                onClick={resetFilters}
                              >
                                Show pending approval
                              </button>
                            ) : !search && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(pages.bihar.ulaForm || '/bihar/ula/form')}
                              >
                                Start first visit
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        paginatedRecords.map((row, idx) => {
                          const photoCount = row.imagesCount ?? 0
                          return (
                            <tr key={row.id}>
                              <td className="text-muted fs-12">
                                {(currentPage - 1) * PER_PAGE + idx + 1}
                              </td>
                              <td className="ula-ca-cell">
                                <div className="ula-ca-no">{row.caNumber || '—'}</div>
                                <div className="ula-ca-name">{row.caName || '—'}</div>
                              </td>
                              <td className="ula-location-cell">
                                <div className="ula-village">{row.village || row.panchayat || '—'}</div>
                                <div className="ula-hierarchy">
                                  {[row.panchayat, row.block, row.district]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column align-items-start gap-1">
                                  <span className={visitPillClass(row)}>{visitPillLabel(row)}</span>
                                  <span
                                    className={`badge ${getAmcApprovalBadgeClass(row.approvalStatus)}`}
                                    title={row.approvalRemarks || getAmcApprovalLabel(row.approvalStatus)}
                                  >
                                    {getAmcApprovalLabel(row.approvalStatus)}
                                  </span>
                                  {row.secondVisitPending ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary text-nowrap"
                                      onClick={() => openSecondVisit(row.id)}
                                      title="Complete 2nd visit"
                                    >
                                      2nd visit
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                              <td className="ula-surveyor-cell">
                                <div className="ula-visit-datetime-line">
                                  <span className="ula-visit-datetime-label">1st:</span>{' '}
                                  <span className="ula-surveyor-name">
                                    {formatFirstSurveyorCell(row)}
                                  </span>
                                </div>
                                <div className="ula-visit-datetime-line ula-surveyor-second">
                                  <span className="ula-visit-datetime-label">2nd:</span>{' '}
                                  {formatSecondSurveyorCell(row)}
                                </div>
                              </td>
                              <td className="fs-12 text-muted ula-survey-dates">
                                <div className="ula-visit-datetime-line">
                                  <span className="ula-visit-datetime-label">1st:</span>{' '}
                                  {row.createdAt
                                    ? formatSurveyDateTimeDisplay(row.createdAt)
                                    : formatSurveyDateDisplay(row.dateTime)}
                                </div>
                                <div className="ula-visit-datetime-line ula-second-visit-date">
                                  <span className="ula-visit-datetime-label">2nd:</span>{' '}
                                  {row.secondVisitAt
                                    ? formatSurveyDateTimeDisplay(row.secondVisitAt)
                                    : '—'}
                                </div>
                              </td>
                              <td className="fs-11 text-muted ula-gps-cell">
                                {(() => {
                                  const firstLabel = formatGpsPair(row.latitude, row.longitude)
                                  const firstMap = buildMapsUrl(row.latitude, row.longitude)
                                  const secondLabel = formatGpsPair(row.latitude2, row.longitude2)
                                  const secondMap = buildMapsUrl(row.latitude2, row.longitude2)
                                  const visitDistance = formatGpsDistance(
                                    row.latitude,
                                    row.longitude,
                                    row.latitude2,
                                    row.longitude2
                                  )
                                  if (!firstLabel && !secondLabel) return '—'
                                  return (
                                    <div className="d-flex flex-column gap-1">
                                      {firstLabel && firstMap && (
                                        <a
                                          href={firstMap}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ula-gps-link d-inline-flex align-items-center gap-1"
                                          title="Open 1st visit location in Google Maps"
                                        >
                                          <FiMapPin size={11} className="text-primary" />
                                          <span>{firstLabel}</span>
                                        </a>
                                      )}
                                      {secondLabel && secondMap && (
                                        <a
                                          href={secondMap}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ula-gps-link ula-gps-link--second d-inline-flex align-items-center gap-1"
                                          title="Open 2nd visit location in Google Maps"
                                        >
                                          <FiMapPin size={11} />
                                          <span>{secondLabel}</span>
                                        </a>
                                      )}
                                      {visitDistance ? (
                                        <span className="ula-gps-distance">Distance {visitDistance}</span>
                                      ) : null}
                                    </div>
                                  )
                                })()}
                              </td>
                              <td className="ula-photos-col">
                                <button
                                  type="button"
                                  className={`ula-photos-pill ${
                                    photoCount >= (row.expectedPhotoCount ?? 7)
                                      ? 'ula-photos-pill--complete'
                                      : 'ula-photos-pill--partial'
                                  }`}
                                  disabled={
                                    photoCount === 0 || zipDownloadingId === row.id
                                  }
                                  onClick={() => handleDownloadZip(row)}
                                  title={
                                    photoCount === 0
                                      ? 'No photos saved yet'
                                      : `Download ${photoCount} photo(s) as ${row.caNumber || 'CA'}.zip`
                                  }
                                  aria-label={`Download ${photoCount} images for CA ${row.caNumber || row.id}`}
                                >
                                  <FiCamera size={12} aria-hidden />
                                  <span className="ula-photos-count">{photoCount}</span>
                                  {zipDownloadingId === row.id ? (
                                    <span className="ula-photos-spinner" aria-hidden>
                                      …
                                    </span>
                                  ) : (
                                    <FiDownload size={13} className="ula-photos-dl-icon" aria-hidden />
                                  )}
                                </button>
                              </td>
                              <td className="ula-view-col">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                                  onClick={() =>
                                    navigate(
                                      `${pages.bihar.ulaDetails || '/bihar/ula/details'}?id=${row.id}`,
                                      { state: { row } }
                                    )
                                  }
                                  title="View full record"
                                >
                                  <FiEye size={14} aria-hidden />
                                  <span>View</span>
                                </button>
                              </td>
                              {isAdmin ? (
                                <td className="ula-actions-col">
                                  <div className="ula-decision">
                                    {row.approvalStatus === AMC_DOC_APPROVAL.APPROVED ? (
                                      <span className="ula-decision-state ula-decision-state--approved">
                                        Approved
                                      </span>
                                    ) : row.visitsReady ? (
                                      <button
                                        type="button"
                                        className="ula-decision-btn ula-decision-btn--approve"
                                        disabled={actionId === row.id}
                                        onClick={() => handleApprove(row)}
                                        title="Approve this finished site"
                                      >
                                        <FiCheck size={13} aria-hidden />
                                        Approve
                                      </button>
                                    ) : null}
                                    {row.approvalStatus === AMC_DOC_APPROVAL.REJECTED ? (
                                      <span className="ula-decision-state ula-decision-state--rejected">
                                        Rejected
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="ula-decision-btn ula-decision-btn--reject"
                                        disabled={actionId === row.id}
                                        onClick={() => openReject(row)}
                                        title="Reject survey"
                                      >
                                        <FiX size={13} aria-hidden />
                                        Reject
                                      </button>
                                    )}
                                  </div>
                                </td>
                              ) : null}
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>

                <CardLoader refreshKey={refreshKey} />

                {filteredRecords.length > 0 && (
                  <div className="d-flex justify-content-between align-items-center px-3 py-3 flex-wrap gap-2 border-top">
                    <span className="fs-12 text-muted">
                      Showing {(currentPage - 1) * PER_PAGE + 1}–
                      {Math.min(currentPage * PER_PAGE, filteredRecords.length)} of{' '}
                      {filteredRecords.length}
                      {search ? ` (filtered from ${records.length})` : ''}
                    </span>
                    {filteredRecords.length > PER_PAGE && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {rejectTarget ? (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100000 }} />
          <div
            className="modal fade show d-block"
            style={{ zIndex: 100001 }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ula-reject-title"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="ula-reject-title">
                    Reject ULA survey
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={closeReject}
                    disabled={Boolean(actionId)}
                  />
                </div>
                <div className="modal-body">
                  <p className="fs-13 text-muted mb-3">
                    CA {rejectTarget.caNumber || rejectTarget.id}
                    {rejectTarget.caName ? ` — ${rejectTarget.caName}` : ''}
                  </p>
                  <label className="form-label" htmlFor="ula-reject-remarks">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="ula-reject-remarks"
                    className={`form-control${rejectRemarksError ? ' is-invalid' : ''}`}
                    rows={4}
                    value={rejectRemarks}
                    placeholder="Write the reason for rejection"
                    onChange={(e) => {
                      setRejectRemarks(e.target.value)
                      if (rejectRemarksError) setRejectRemarksError('')
                    }}
                    autoFocus
                  />
                  {rejectRemarksError ? (
                    <div className="invalid-feedback d-block">{rejectRemarksError}</div>
                  ) : null}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={closeReject}
                    disabled={Boolean(actionId)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={submitReject}
                    disabled={Boolean(actionId)}
                  >
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

export default BiharUlaList
