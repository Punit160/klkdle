import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import {
  FiCheck,
  FiDownload,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import Pagination from '@/components/shared/Pagination'
import { pages } from '../../../api/routes'
import {
  countUlaSurveyPhotos,
  fetchUlaReport,
  formatSurveyDateDisplay,
  resolveUlaSecondSurveyorDisplayName,
  resolveUlaSurveyorDisplayName,
  ulaSolarMeterOnFirstVisit,
  updateUlaApproval,
} from './ulaHelpers'
import {
  ULA_REPORT_TABS,
  ULA_VISIT_OPTIONS,
  buildSurveyorReport,
  classifyUlaVisit,
  downloadTextFile,
  filterUlaDashboardRows,
  groupUlaRows,
  reportTableFor,
  slugFilePart,
  summarizeUlaRows,
  surveyDayKey,
  tableToCsv,
  tableToExcelHtml,
} from './ulaDashboardReports'
import { userIsAdmin } from '../../../utils/userRoles'
import {
  AMC_DOC_APPROVAL,
  getAmcApprovalBadgeClass,
  getAmcApprovalLabel,
} from '../../../utils/amcApproval'
import { getApiErrorMessage } from '../../../utils/apiError'
import '../../../styles/ula-dashboard.css'

const PER_PAGE = 12

const EMPTY_FILTERS = {
  q: '',
  district: '',
  block: '',
  panchayat: '',
  approval: '',
  visit: '',
  surveyor: '',
  from: '',
  to: '',
}

const mapReportRow = (row) => {
  const visit = classifyUlaVisit({
    ...row,
    solarMeterOnFirst: ulaSolarMeterOnFirstVisit(row),
    firstVisitComplete: Boolean(row.first_visit_complete),
    secondVisitComplete: Boolean(row.second_visit_complete),
  })
  const secondBy = resolveUlaSecondSurveyorDisplayName(row)
  return {
    id: row.id,
    caNumber: row.ca_no || '',
    caName: row.ca_name || row.beneficiary_name || '',
    contact: row.beneficiary_contact || '',
    district: row.district || '',
    block: row.block || '',
    panchayat: row.panchayat || '',
    village: row.village || '',
    surveyDay: surveyDayKey(row.survey_date || row.created_at),
    surveyDateLabel: formatSurveyDateDisplay(row.survey_date || row.created_at),
    firstBy: resolveUlaSurveyorDisplayName(row),
    secondBy: secondBy === '—' ? '' : secondBy,
    visitKey: visit.key,
    visitLabel: visit.label,
    approvalStatus: Number(row.approval_status ?? 0),
    approvalRemarks: row.approval_remarks || '',
    approvalBy: row.approval_by || '',
    photos: countUlaSurveyPhotos(row),
    panel1: row.panel_one_no || '',
    panel2: row.panel_two_no || '',
    inverter: row.inverter_no || '',
    latitude: row.latitude || '',
    longitude: row.longitude || '',
  }
}

const uniqueSorted = (values) =>
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )

const GroupTable = ({ table }) => {
  if (!table.rows.length) {
    return <div className="ula-dash-empty">No rows match these filters.</div>
  }
  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0 ula-dash-table">
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${table.headers[cellIndex]}-${index}`}>{cell === '' || cell == null ? '—' : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const BiharUlaDashboard = () => {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [scope, setScope] = useState('mine')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [report, setReport] = useState('overview')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [actionId, setActionId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [rejectRemarksError, setRejectRemarksError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchUlaReport()
      .then(({ rows: loaded, scope: loadedScope }) => {
        if (!cancelled) {
          setRows(loaded.map(mapReportRow))
          setScope(loadedScope === 'all' ? 'all' : 'mine')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([])
          setError(getApiErrorMessage(err, 'Could not load the ULA dashboard.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const districtOptions = useMemo(() => uniqueSorted(rows.map((row) => row.district)), [rows])
  const blockOptions = useMemo(
    () =>
      uniqueSorted(
        rows
          .filter((row) => !filters.district || row.district === filters.district)
          .map((row) => row.block)
      ),
    [rows, filters.district]
  )
  const panchayatOptions = useMemo(
    () =>
      uniqueSorted(
        rows
          .filter((row) => !filters.district || row.district === filters.district)
          .filter((row) => !filters.block || row.block === filters.block)
          .map((row) => row.panchayat)
      ),
    [rows, filters.district, filters.block]
  )
  const surveyorOptions = useMemo(
    () => uniqueSorted(rows.flatMap((row) => [row.firstBy, row.secondBy])),
    [rows]
  )

  const filtered = useMemo(() => filterUlaDashboardRows(rows, filters), [rows, filters])
  const summary = useMemo(() => summarizeUlaRows(filtered), [filtered])
  const table = useMemo(() => reportTableFor(report, filtered), [report, filtered])
  const districtGroups = useMemo(() => groupUlaRows(filtered, (row) => row.district).slice(0, 12), [filtered])
  const surveyorPreview = useMemo(() => buildSurveyorReport(filtered).slice(0, 8), [filtered])

  const totalPages = Math.ceil(table.rows.length / PER_PAGE) || 1
  const pagedRows = table.rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const setFilter = (key, value) => {
    setPage(1)
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'district') {
        next.block = ''
        next.panchayat = ''
      }
      if (key === 'block') next.panchayat = ''
      return next
    })
  }

  const openVisitReport = (visitKey) => {
    setFilter('visit', visitKey)
    setReport('register')
  }

  const openApprovalReport = (status) => {
    setFilter('approval', String(status))
    setReport('approval')
  }

  const exportTable = (format) => {
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `${slugFilePart(table.title)}-${stamp}`
    if (format === 'csv') {
      downloadTextFile(`${base}.csv`, tableToCsv(table), 'text/csv;charset=utf-8')
      return
    }
    if (format === 'excel') {
      downloadTextFile(`${base}.xls`, tableToExcelHtml(table), 'application/vnd.ms-excel')
      return
    }
    if (format === 'json') {
      const records = table.rows.map((row) =>
        Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? '']))
      )
      downloadTextFile(
        `${base}.json`,
        JSON.stringify({ title: table.title, count: records.length, records }, null, 2),
        'application/json'
      )
    }
  }

  const patchApproval = (id, status, remarks) => {
    setRows((prev) =>
      prev.map((row) =>
        String(row.id) === String(id)
          ? { ...row, approvalStatus: Number(status), approvalRemarks: remarks || '' }
          : row
      )
    )
  }

  const approveRow = async (row) => {
    if (!window.confirm(`Approve CA ${row.caNumber || row.id}?`)) return
    setActionId(row.id)
    setError('')
    try {
      await updateUlaApproval(row.id, AMC_DOC_APPROVAL.APPROVED)
      patchApproval(row.id, AMC_DOC_APPROVAL.APPROVED, '')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not approve this ULA survey.'))
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
    if (!rejectTarget?.id) return
    setActionId(rejectTarget.id)
    setRejectRemarksError('')
    try {
      await updateUlaApproval(rejectTarget.id, AMC_DOC_APPROVAL.REJECTED, remarks)
      patchApproval(rejectTarget.id, AMC_DOC_APPROVAL.REJECTED, remarks)
      setRejectTarget(null)
      setRejectRemarks('')
    } catch (err) {
      setRejectRemarksError(getApiErrorMessage(err, 'Could not reject this ULA survey.'))
    } finally {
      setActionId(null)
    }
  }

  const isAdmin = userIsAdmin()
  const seesAllSites = isAdmin && scope === 'all'

  const visitSeries = [
    summary.incomplete,
    summary.secondPending,
    summary.completeFirst,
    summary.completeSecond,
  ]
  const approvalSeries = [summary.pending, summary.approved, summary.rejected]

  return (
    <>
      <PageHeader />
      <div className="main-content ula-dash">
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <CardHeader title="Bihar ULA dashboard" />
              <div className="ula-dash-intro">
                <div>
                  <h5>{seesAllSites ? 'All ULA sites' : 'Your ULA work'}</h5>
                  <p>
                    {seesAllSites
                      ? 'Reports for every survey. Approve and reject from the site register.'
                      : 'Reports for sites you surveyed: your 1st visits and your 2nd visits.'}
                  </p>
                </div>
                <div className="ula-dash-no-print d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-light"
                    onClick={() => setRefreshKey((value) => value + 1)}
                  >
                    <FiRefreshCw size={13} /> Refresh
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => exportTable('csv')}>
                    <FiDownload size={13} /> CSV
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => exportTable('excel')}>
                    <FiDownload size={13} /> Excel
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => exportTable('json')}>
                    <FiDownload size={13} /> JSON
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}>
                    <FiPrinter size={13} /> Print
                  </button>
                </div>
              </div>

              {error ? <div className="alert alert-warning mx-3 mb-0 py-2 fs-13">{error}</div> : null}

              <div className="ula-dash-filters ula-dash-no-print">
                <div className="ula-dash-search">
                  <FiSearch size={14} />
                  <input
                    type="search"
                    value={filters.q}
                    placeholder="Search CA, name, village, serial, remarks"
                    onChange={(event) => setFilter('q', event.target.value)}
                  />
                </div>
                <select value={filters.district} onChange={(event) => setFilter('district', event.target.value)}>
                  <option value="">All districts</option>
                  {districtOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select value={filters.block} onChange={(event) => setFilter('block', event.target.value)}>
                  <option value="">All blocks</option>
                  {blockOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select value={filters.panchayat} onChange={(event) => setFilter('panchayat', event.target.value)}>
                  <option value="">All panchayats</option>
                  {panchayatOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <select value={filters.visit} onChange={(event) => setFilter('visit', event.target.value)}>
                  {ULA_VISIT_OPTIONS.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={filters.approval} onChange={(event) => setFilter('approval', event.target.value)}>
                  <option value="">All approvals</option>
                  <option value="0">Pending</option>
                  <option value="1">Approved</option>
                  <option value="2">Rejected</option>
                </select>
                <select value={filters.surveyor} onChange={(event) => setFilter('surveyor', event.target.value)}>
                  <option value="">All surveyors</option>
                  {surveyorOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} aria-label="From date" />
                <input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} aria-label="To date" />
                <button type="button" className="btn btn-sm btn-light" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
                  Clear
                </button>
              </div>

              <div className="ula-dash-tabs ula-dash-no-print">
                {ULA_REPORT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={report === tab.id ? 'is-active' : ''}
                    onClick={() => {
                      setReport(tab.id)
                      setPage(1)
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <CardLoader />
              ) : (
                <div className="ula-dash-body">
                  {report === 'overview' && (
                    <>
                      <div className="ula-dash-stats">
                        <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setReport('register'); setPage(1) }}>
                          <strong>{summary.total}</strong>
                          <span>Sites</span>
                        </button>
                        <button type="button" onClick={() => openVisitReport('second_pending')}>
                          <strong>{summary.secondPending}</strong>
                          <span>2nd visit pending</span>
                        </button>
                        <button type="button" onClick={() => openVisitReport('complete_first')}>
                          <strong>{summary.completeFirst}</strong>
                          <span>Complete on 1st visit</span>
                        </button>
                        <button type="button" onClick={() => openVisitReport('complete_second')}>
                          <strong>{summary.completeSecond}</strong>
                          <span>2nd visit complete</span>
                        </button>
                        <button type="button" onClick={() => openApprovalReport(0)}>
                          <strong>{summary.pending}</strong>
                          <span>Pending approval</span>
                        </button>
                        <button type="button" onClick={() => openApprovalReport(1)}>
                          <strong>{summary.approved}</strong>
                          <span>Approved</span>
                        </button>
                        <button type="button" onClick={() => openApprovalReport(2)}>
                          <strong>{summary.rejected}</strong>
                          <span>Rejected</span>
                        </button>
                        <button type="button" onClick={() => setReport('district')}>
                          <strong>{summary.districts}</strong>
                          <span>Districts</span>
                        </button>
                      </div>
                      <div className="ula-dash-charts">
                        <div>
                          <h6>Visit status</h6>
                          {visitSeries.some((value) => value > 0) ? (
                            <ReactApexChart
                              type="donut"
                              height={280}
                              series={visitSeries}
                              options={{
                                labels: ['1st incomplete', '2nd pending', 'Complete on 1st', '2nd complete'],
                                colors: ['#94a3b8', '#f59e0b', '#3454d1', '#25b865'],
                                legend: { position: 'bottom' },
                                dataLabels: { enabled: true },
                              }}
                            />
                          ) : (
                            <div className="ula-dash-empty">No visit data.</div>
                          )}
                        </div>
                        <div>
                          <h6>Approval</h6>
                          {approvalSeries.some((value) => value > 0) ? (
                            <ReactApexChart
                              type="donut"
                              height={280}
                              series={approvalSeries}
                              options={{
                                labels: ['Pending', 'Approved', 'Rejected'],
                                colors: ['#f59e0b', '#25b865', '#ea4d4d'],
                                legend: { position: 'bottom' },
                              }}
                            />
                          ) : (
                            <div className="ula-dash-empty">No approval data.</div>
                          )}
                        </div>
                        <div className="ula-dash-chart-wide">
                          <h6>Sites by district</h6>
                          {districtGroups.length ? (
                            <ReactApexChart
                              type="bar"
                              height={300}
                              series={[
                                { name: 'Sites', data: districtGroups.map((row) => row.total) },
                                { name: 'Approved', data: districtGroups.map((row) => row.approved) },
                                { name: '2nd visit pending', data: districtGroups.map((row) => row.secondPending) },
                              ]}
                              options={{
                                chart: { toolbar: { show: false } },
                                colors: ['#3454d1', '#25b865', '#f59e0b'],
                                xaxis: {
                                  categories: districtGroups.map((row) => row.label),
                                  labels: { rotate: -35, style: { fontSize: '11px' } },
                                },
                                plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
                                dataLabels: { enabled: false },
                                legend: { position: 'top' },
                              }}
                            />
                          ) : (
                            <div className="ula-dash-empty">No district data.</div>
                          )}
                        </div>
                      </div>
                      <h6 className="px-3">Top surveyors</h6>
                      <GroupTable
                        table={{
                          title: 'Surveyors',
                          headers: ['Surveyor', 'Sites', '1st visits', '2nd visits'],
                          rows: surveyorPreview.map((row) => [row.label, row.sites, row.firstVisits, row.secondVisits]),
                        }}
                      />
                    </>
                  )}

                  {report !== 'overview' && report !== 'register' && (
                    <>
                      <p className="ula-dash-count">{table.rows.length} rows in {table.title.toLowerCase()}</p>
                      <GroupTable table={{ ...table, rows: pagedRows }} />
                    </>
                  )}

                  {report === 'register' && (
                    <>
                      <p className="ula-dash-count">{filtered.length} sites</p>
                      <div className="table-responsive">
                        <table className="table table-hover mb-0 ula-dash-table">
                          <thead>
                            <tr>
                              <th>CA</th>
                              <th>Location</th>
                              <th>Visit</th>
                              <th>Surveyors</th>
                              <th>Approval</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {pagedRows.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center text-muted py-4">No sites match these filters.</td>
                              </tr>
                            ) : (
                              filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((row) => (
                                <tr key={row.id}>
                                  <td>
                                    <div className="fw-bold">{row.caNumber || '—'}</div>
                                    <div className="text-muted fs-12">{row.caName || '—'}</div>
                                  </td>
                                  <td>
                                    <div>{[row.village, row.panchayat].filter(Boolean).join(', ') || '—'}</div>
                                    <div className="text-muted fs-12">{[row.block, row.district].filter(Boolean).join(', ')}</div>
                                  </td>
                                  <td>{row.visitLabel}</td>
                                  <td>
                                    <div>{row.firstBy || '—'}</div>
                                    <div className="text-muted fs-12">{row.secondBy ? `2nd: ${row.secondBy}` : '2nd visit not done'}</div>
                                  </td>
                                  <td>
                                    <span className={`badge ${getAmcApprovalBadgeClass(row.approvalStatus)}`}>
                                      {getAmcApprovalLabel(row.approvalStatus)}
                                    </span>
                                    {row.approvalRemarks ? (
                                      <div className="text-muted fs-12 mt-1">{row.approvalRemarks}</div>
                                    ) : null}
                                  </td>
                                  <td className="text-end ula-dash-no-print">
                                    <div className="d-inline-flex gap-1">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-light"
                                        onClick={() => navigate(`${pages.bihar.ulaDetails}?id=${row.id}`)}
                                      >
                                        View
                                      </button>
                                      {isAdmin && (
                                        <>
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-success"
                                            disabled={actionId === row.id || row.approvalStatus === AMC_DOC_APPROVAL.APPROVED}
                                            onClick={() => approveRow(row)}
                                          >
                                            <FiCheck size={13} />
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-warning"
                                            disabled={actionId === row.id || row.approvalStatus === AMC_DOC_APPROVAL.REJECTED}
                                            onClick={() => {
                                              setRejectTarget(row)
                                              setRejectRemarks('')
                                              setRejectRemarksError('')
                                            }}
                                          >
                                            <FiX size={13} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {report !== 'overview' && table.rows.length > PER_PAGE && (
                    <div className="d-flex justify-content-end px-3 py-3 ula-dash-no-print">
                      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && rejectTarget ? (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100000 }} />
          <div className="modal fade show d-block" style={{ zIndex: 100001 }} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reject ULA survey</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setRejectTarget(null)} />
                </div>
                <div className="modal-body">
                  <p className="fs-13 text-muted">
                    CA {rejectTarget.caNumber || rejectTarget.id}
                    {rejectTarget.caName ? ` — ${rejectTarget.caName}` : ''}
                  </p>
                  <label className="form-label" htmlFor="ula-dash-reject">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="ula-dash-reject"
                    className={`form-control${rejectRemarksError ? ' is-invalid' : ''}`}
                    rows={4}
                    value={rejectRemarks}
                    placeholder="Write the reason for rejection"
                    onChange={(event) => {
                      setRejectRemarks(event.target.value)
                      if (rejectRemarksError) setRejectRemarksError('')
                    }}
                  />
                  {rejectRemarksError ? <div className="invalid-feedback d-block">{rejectRemarksError}</div> : null}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setRejectTarget(null)} disabled={Boolean(actionId)}>
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

export default BiharUlaDashboard
