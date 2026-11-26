import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiCheck, FiDownload, FiEye, FiPlus, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardHeader from '@/components/shared/CardHeader'
import Pagination from '@/components/shared/Pagination'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import { api, pages } from '../../../api/routes'
import localApi from '../../../api/localApi'
import { userIsAdmin } from '../../../utils/userRoles'
import {
  AMC_DOC_APPROVAL,
  getAmcApprovalBadgeClass,
  getAmcApprovalLabel,
} from '../../../utils/amcApproval'
import { getApiErrorMessage } from '../../../utils/apiError'
import { downloadTextFile, tableToCsv, tableToExcelHtml } from './ulaDashboardReports'
import '../../../styles/bihar-ula.css'

const PER_PAGE = 15

const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '—'
  return `${match[3]}-${match[2]}-${match[1]}`
}

const dayKey = (value) => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

const uniqueSorted = (values) =>
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )

const BiharUlaInspectionList = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshKey, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions()
  const isAdmin = userIsAdmin()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [search, setSearch] = useState('')
  const [approvalFilter, setApprovalFilter] = useState(() => {
    const approval = searchParams.get('approval')
    if (approval === 'all') return ''
    if (approval === 'approved' || approval === 'rejected' || approval === 'pending') return approval
    return 'pending'
  })
  const [districtFilter, setDistrictFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [inspectorFilter, setInspectorFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [actionId, setActionId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejectRemarksError, setRejectRemarksError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setListError('')
    localApi
      .get(api.biharUla.inspectionList)
      .then((res) => {
        if (!cancelled) setRecords(Array.isArray(res?.data?.data) ? res.data.data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setRecords([])
          setListError(getApiErrorMessage(err, 'Could not load site inspections.'))
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
    const pending = records.filter(
      (row) =>
        Number(row.approval_status) !== AMC_DOC_APPROVAL.APPROVED &&
        Number(row.approval_status) !== AMC_DOC_APPROVAL.REJECTED
    ).length
    const approved = records.filter(
      (row) => Number(row.approval_status) === AMC_DOC_APPROVAL.APPROVED
    ).length
    const rejected = records.filter(
      (row) => Number(row.approval_status) === AMC_DOC_APPROVAL.REJECTED
    ).length
    return { total, pending, approved, rejected }
  }, [records])

  const districtOptions = useMemo(
    () => uniqueSorted(records.map((row) => row.district)),
    [records]
  )

  const blockOptions = useMemo(() => {
    const source = districtFilter
      ? records.filter((row) => String(row.district || '').trim() === districtFilter)
      : records
    return uniqueSorted(source.map((row) => row.block))
  }, [records, districtFilter])

  const inspectorOptions = useMemo(
    () => uniqueSorted(records.map((row) => row.user_name)),
    [records]
  )

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()
    return records.filter((row) => {
      const status = Number(row.approval_status ?? 0)
      if (
        approvalFilter === 'pending' &&
        (status === AMC_DOC_APPROVAL.APPROVED || status === AMC_DOC_APPROVAL.REJECTED)
      ) {
        return false
      }
      if (approvalFilter === 'approved' && status !== AMC_DOC_APPROVAL.APPROVED) return false
      if (approvalFilter === 'rejected' && status !== AMC_DOC_APPROVAL.REJECTED) return false
      if (districtFilter && String(row.district || '').trim() !== districtFilter) return false
      if (blockFilter && String(row.block || '').trim() !== blockFilter) return false
      if (inspectorFilter && String(row.user_name || '').trim() !== inspectorFilter) return false
      const day = dayKey(row.inspection_date)
      if (fromDate && (!day || day < fromDate)) return false
      if (toDate && (!day || day > toDate)) return false
      if (!query) return true
      const hay = [row.ca_no, row.consumer_name, row.district, row.block, row.village, row.user_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(query)
    })
  }, [records, search, approvalFilter, districtFilter, blockFilter, inspectorFilter, fromDate, toDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, approvalFilter, districtFilter, blockFilter, inspectorFilter, fromDate, toDate])

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return filteredRecords.slice(start, start + PER_PAGE)
  }, [filteredRecords, currentPage])

  const totalPages = Math.ceil(filteredRecords.length / PER_PAGE) || 1

  const exportRows = (format) => {
    if (!filteredRecords.length) {
      Swal.fire('Nothing to export', 'No inspections match these filters.', 'info')
      return
    }
    const table = {
      title: 'Bihar ULA site inspections',
      headers: [
        'CA number',
        'Consumer',
        'Mobile',
        'District',
        'Block',
        'Panchayat',
        'Village',
        'Inspection date',
        'Inspected by',
        'Photos',
        'Status',
        'Approval remarks',
        'Latitude',
        'Longitude',
      ],
      rows: filteredRecords.map((row) => [
        row.ca_no || '',
        row.consumer_name || '',
        row.mobile || '',
        row.district || '',
        row.block || '',
        row.panchayat || '',
        row.village || '',
        formatDate(row.inspection_date),
        row.user_name || '',
        row.photo_count || 0,
        getAmcApprovalLabel(row.approval_status),
        row.approval_remarks || '',
        row.latitude || '',
        row.longitude || '',
      ]),
    }
    const stamp = new Date().toISOString().slice(0, 10)
    if (format === 'excel') {
      downloadTextFile(
        `bihar-ula-inspections-${stamp}.xls`,
        tableToExcelHtml(table),
        'application/vnd.ms-excel'
      )
      return
    }
    downloadTextFile(
      `bihar-ula-inspections-${stamp}.csv`,
      tableToCsv(table),
      'text/csv;charset=utf-8'
    )
  }

  const patchStatus = (id, status, remarks) => {
    setRecords((prev) =>
      prev.map((row) =>
        String(row.id) === String(id)
          ? { ...row, approval_status: Number(status), approval_remarks: remarks || '' }
          : row
      )
    )
  }

  const handleApprove = async (row) => {
    const result = await Swal.fire({
      title: 'Approve this site inspection?',
      text: `CA ${row.ca_no || row.id} — ${row.consumer_name || ''}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
    })
    if (!result.isConfirmed) return
    setActionId(row.id)
    try {
      await localApi.patch(api.biharUla.inspectionApproval(row.id), {
        approval_status: AMC_DOC_APPROVAL.APPROVED,
      })
      patchStatus(row.id, AMC_DOC_APPROVAL.APPROVED, '')
    } catch (err) {
      Swal.fire('Could not approve', getApiErrorMessage(err, 'Try again.'), 'error')
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
    setActionId(rejectTarget.id)
    try {
      await localApi.patch(api.biharUla.inspectionApproval(rejectTarget.id), {
        approval_status: AMC_DOC_APPROVAL.REJECTED,
        approval_remarks: remarks,
      })
      patchStatus(rejectTarget.id, AMC_DOC_APPROVAL.REJECTED, remarks)
      setRejectTarget(null)
      setRejectRemarks('')
    } catch (err) {
      setRejectRemarksError(getApiErrorMessage(err, 'Could not reject this inspection.'))
    } finally {
      setActionId(null)
    }
  }

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-fullscreen' : ''}`}>
              <CardHeader
                title={isAdmin ? 'ULA site inspection — All sites' : 'ULA site inspection'}
                refresh={handleRefresh}
                remove={handleDelete}
                expanded={handleExpand}
              />
              <div className="card-body custom-card-action p-0">
                <div className="ula-stat-grid">
                  <button
                    type="button"
                    className={`ula-stat-card${approvalFilter === 'pending' ? ' is-active' : ''}`}
                    onClick={() => setApprovalFilter('pending')}
                  >
                    <div className="ula-stat-value text-warning">{stats.pending}</div>
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
                    className={`ula-stat-card${approvalFilter === '' && !districtFilter ? ' is-active' : ''}`}
                    onClick={() => {
                      setApprovalFilter('')
                      setDistrictFilter('')
                    }}
                  >
                    <div className="ula-stat-value">{stats.total}</div>
                    <div className="ula-stat-label">All records</div>
                  </button>
                </div>

                {listError ? (
                  <div className="alert alert-warning mx-3 mt-3 mb-0 py-2 fs-13">{listError}</div>
                ) : null}

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
                      value={districtFilter}
                      onChange={(event) => {
                        setDistrictFilter(event.target.value)
                        setBlockFilter('')
                      }}
                      aria-label="Filter by district"
                    >
                      <option value="">All districts</option>
                      {districtOptions.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                    <select
                      value={blockFilter}
                      onChange={(event) => setBlockFilter(event.target.value)}
                      aria-label="Filter by block"
                    >
                      <option value="">All blocks</option>
                      {blockOptions.map((block) => (
                        <option key={block} value={block}>
                          {block}
                        </option>
                      ))}
                    </select>
                    <select
                      value={inspectorFilter}
                      onChange={(event) => setInspectorFilter(event.target.value)}
                      aria-label="Filter by inspector"
                    >
                      <option value="">All inspectors</option>
                      {inspectorOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      aria-label="From date"
                    />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      aria-label="To date"
                    />
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
                      onClick={() => exportRows('csv')}
                    >
                      <FiDownload size={13} /> CSV
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
                      onClick={() => exportRows('excel')}
                    >
                      <FiDownload size={13} /> Excel
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
                      onClick={handleRefresh}
                    >
                      <FiRefreshCw size={13} /> Refresh
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                      onClick={() => navigate(pages.bihar.ulaInspection)}
                    >
                      <FiPlus size={14} /> New inspection
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
                        <th>Inspection date</th>
                        <th>Inspected by</th>
                        <th>Photos</th>
                        <th>Status</th>
                        <th className="ula-view-col">View</th>
                        {isAdmin ? <th className="ula-actions-col">Actions</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="text-center py-5 text-muted">
                            Loading site inspections…
                          </td>
                        </tr>
                      ) : null}
                      {!loading && paginatedRecords.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="text-center py-5 text-muted">
                            {records.length ? 'No inspections match these filters.' : 'No inspections yet.'}
                          </td>
                        </tr>
                      ) : null}
                      {!loading &&
                        paginatedRecords.map((row, index) => {
                          const status = Number(row.approval_status ?? 0)
                          const location = [row.district, row.block, row.village].filter(Boolean).join(' · ')
                          return (
                            <tr key={row.id}>
                              <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>
                              <td>
                                <div className="fw-semibold">{row.ca_no || '—'}</div>
                                <div className="fs-12 text-muted">{row.consumer_name || '—'}</div>
                              </td>
                              <td className="fs-12">{location || '—'}</td>
                              <td>{formatDate(row.inspection_date)}</td>
                              <td>{row.user_name || (row.user_id ? `User #${row.user_id}` : '—')}</td>
                              <td>{row.photo_count || 0}</td>
                              <td>
                                <span className={`badge ${getAmcApprovalBadgeClass(status)}`}>
                                  {getAmcApprovalLabel(status)}
                                </span>
                              </td>
                              <td className="ula-view-col">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                                  onClick={() =>
                                    navigate(`${pages.bihar.ulaInspectionDetails}?id=${row.id}`)
                                  }
                                >
                                  <FiEye size={14} />
                                  <span>View</span>
                                </button>
                              </td>
                              {isAdmin ? (
                                <td className="ula-actions-col">
                                  <div className="ula-decision">
                                    {status === AMC_DOC_APPROVAL.APPROVED ? (
                                      <span className="ula-decision-state ula-decision-state--approved">
                                        Approved
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="ula-decision-btn ula-decision-btn--approve"
                                        disabled={actionId === row.id}
                                        onClick={() => handleApprove(row)}
                                      >
                                        <FiCheck size={13} /> Approve
                                      </button>
                                    )}
                                    {status === AMC_DOC_APPROVAL.REJECTED ? (
                                      <span className="ula-decision-state ula-decision-state--rejected">
                                        Rejected
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="ula-decision-btn ula-decision-btn--reject"
                                        disabled={actionId === row.id}
                                        onClick={() => {
                                          setRejectTarget(row)
                                          setRejectRemarks('')
                                          setRejectRemarksError('')
                                        }}
                                      >
                                        <FiX size={13} /> Reject
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
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && rejectTarget ? (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100000 }} />
          <div className="modal fade show d-block" style={{ zIndex: 100001 }} role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reject site inspection</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setRejectTarget(null)}
                  />
                </div>
                <div className="modal-body">
                  <p className="fs-13 text-muted">
                    CA {rejectTarget.ca_no}
                    {rejectTarget.consumer_name ? ` — ${rejectTarget.consumer_name}` : ''}
                  </p>
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
                  <button type="button" className="btn btn-light" onClick={() => setRejectTarget(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={submitReject} disabled={Boolean(actionId)}>
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

export default BiharUlaInspectionList
