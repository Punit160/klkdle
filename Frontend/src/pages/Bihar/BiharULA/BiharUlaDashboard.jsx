import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import {
  FiActivity,
  FiCheck,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiLayers,
  FiMapPin,
  FiPrinter,
  FiRefreshCw,
  FiSun,
  FiX,
  FiXCircle,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PageHeaderDate from '@/components/shared/pageHeader/PageHeaderDate'
import Pagination from '@/components/shared/Pagination'
import { pages } from '../../../api/routes'
import {
  countUlaSurveyPhotos,
  fetchUlaReport,
  formatSurveyDateDisplay,
  resolveUlaSecondSurveyorDisplayName,
  resolveUlaSurveyorDisplayName,
  ulaSolarMeterOnFirstVisit,
  ulaVisitsReadyForApproval,
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
import '../../../styles/Bihar/bihar-ssl-amc-dashboard.css'
import '../../../styles/bihar-ula.css'
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
    visitsReady: ulaVisitsReadyForApproval(row),
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

const StatButton = ({ icon: Icon, title, value, subtitle, tone = 'primary', active, onClick }) => (
  <button type="button" className={`bihar-amc-stat${active ? ' is-active' : ''}`} onClick={onClick}>
    <div className="bihar-amc-stat-top">
      <div className={`bihar-amc-stat-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <strong>{value?.toLocaleString?.() ?? value ?? '—'}</strong>
    </div>
    <span>{title}</span>
    {subtitle ? <small>{subtitle}</small> : null}
  </button>
)

const GroupTable = ({ table }) => {
  if (!table.rows.length) {
    return <div className="bihar-amc-empty">No rows match these filters.</div>
  }
  return (
    <div className="table-responsive">
      <table className="table bihar-amc-table mb-0">
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
    if (!row?.visitsReady) return
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

  const approvalSeries = [summary.pending, summary.approved, summary.rejected]

  const completionPct = summary.total
    ? Math.round(((summary.completeFirst + summary.completeSecond) / summary.total) * 100)
    : 0
  const recentSites = filtered.slice(0, 8)

  return (
    <div>
      <PageHeader>
        <PageHeaderDate />
      </PageHeader>
      <div className="main-content bihar-amc-dashboard">
        <div className="row g-3">
          <div className="col-12">
            <div className="bihar-amc-hero">
              <div>
                <span className="bihar-amc-hero-badge">Bihar Operations</span>
                <h4>{seesAllSites ? 'ULA Dashboard' : 'Your ULA work'}</h4>
                <p>
                  {seesAllSites
                    ? 'Every ULA site, visit progress, and approval — in one dashboard.'
                    : 'Sites you surveyed on the 1st visit or the 2nd visit.'}
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2 ula-dash-no-print">
                <Link to={pages.bihar.ulaForm} className="btn btn-primary d-inline-flex align-items-center gap-2">
                  <FiSun size={15} /> New 1st visit
                </Link>
                <Link to={pages.bihar.ulaList} className="btn btn-light-brand d-inline-flex align-items-center gap-2">
                  <FiFileText size={15} /> ULA data table
                </Link>
                <button
                  type="button"
                  className="btn btn-light d-inline-flex align-items-center gap-2"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  disabled={loading}
                >
                  <FiRefreshCw size={15} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="col-12">
              <div className="bihar-amc-section-card">
                <div className="bihar-amc-empty">Loading ULA dashboard...</div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="col-12">
              <div className="bihar-amc-section-card">
                <div className="bihar-amc-empty">
                  <p className="text-danger mb-2">{error}</p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setRefreshKey((value) => value + 1)}>
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="col-12 bihar-amc-section">
                <div className="bihar-amc-section-card">
                  <div className="bihar-amc-section-head">
                    <div className="bihar-amc-section-head-left">
                      <div className="bihar-amc-section-icon amc">
                        <FiActivity size={20} />
                      </div>
                      <div>
                        <h5>Site visits</h5>
                        <p>Completion, 2nd visit queue, and approval of the filtered sites</p>
                      </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-light-brand" onClick={() => openVisitReport('')}>
                      View site register
                    </button>
                  </div>
                  <div className="bihar-amc-section-body">
                    <div className="bihar-amc-stat-grid">
                      <StatButton icon={FiLayers} title="Sites" value={summary.total} subtitle={`${summary.districts} districts`} tone="primary" onClick={() => { setFilters(EMPTY_FILTERS); setReport('register'); setPage(1) }} />
                      <StatButton icon={FiMapPin} title="2nd visit pending" value={summary.secondPending} subtitle="1st visit done" tone="warning" active={filters.visit === 'second_pending'} onClick={() => openVisitReport('second_pending')} />
                      <StatButton icon={FiCheckCircle} title="Visits complete" value={summary.completeFirst + summary.completeSecond} subtitle={`${completionPct}% complete`} tone="success" onClick={() => setReport('overview')} />
                      <StatButton icon={FiXCircle} title="1st visit incomplete" value={summary.incomplete} subtitle="Photos still missing" tone="danger" active={filters.visit === 'incomplete'} onClick={() => openVisitReport('incomplete')} />
                    </div>
                    <div className="bihar-amc-stat-grid">
                      <StatButton icon={FiActivity} title="Pending approval" value={summary.pending} subtitle="Waiting for admin" tone="warning" active={filters.approval === '0'} onClick={() => openApprovalReport(0)} />
                      <StatButton icon={FiCheckCircle} title="Approved" value={summary.approved} subtitle="Click to view sites" tone="success" active={filters.approval === '1'} onClick={() => openApprovalReport(1)} />
                      <StatButton icon={FiXCircle} title="Rejected" value={summary.rejected} subtitle="Click to view sites" tone="danger" active={filters.approval === '2'} onClick={() => openApprovalReport(2)} />
                      <StatButton icon={FiSun} title="Complete on 1st visit" value={summary.completeFirst} subtitle="Solar meter already captured" tone="info" active={filters.visit === 'complete_first'} onClick={() => openVisitReport('complete_first')} />
                    </div>

                    <div className="bihar-amc-panel-grid">
                      <div className="bihar-amc-panel">
                        <div className="bihar-amc-panel-head">
                          <h6>Recent sites</h6>
                          <button type="button" className="btn btn-link btn-sm p-0 fs-12 fw-semibold" onClick={() => setReport('register')}>
                            View all
                          </button>
                        </div>
                        <div className="table-responsive">
                          <table className="table bihar-amc-table mb-0">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>CA</th>
                                <th>Location</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentSites.length === 0 ? (
                                <tr>
                                  <td colSpan={4}><div className="bihar-amc-empty">No ULA sites yet.</div></td>
                                </tr>
                              ) : (
                                recentSites.map((row) => (
                                  <tr key={row.id}>
                                    <td>{row.surveyDateLabel}</td>
                                    <td>
                                      <div className="fw-semibold">{row.caNumber || '—'}</div>
                                      <div className="fs-11 text-muted">{row.caName || '—'}</div>
                                    </td>
                                    <td className="fs-12 text-muted">{[row.district, row.block, row.panchayat].filter(Boolean).join(' / ') || '—'}</td>
                                    <td>
                                      <span className={`badge ${getAmcApprovalBadgeClass(row.approvalStatus)}`}>
                                        {getAmcApprovalLabel(row.approvalStatus)}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bihar-amc-panel">
                        <div className="bihar-amc-panel-head">
                          <h6>Approval split</h6>
                        </div>
                        <div className="p-3">
                          {summary.total === 0 ? (
                            <div className="bihar-amc-empty">No ULA data to chart yet.</div>
                          ) : (
                            <ReactApexChart
                              type="donut"
                              height={280}
                              series={approvalSeries}
                              options={{
                                labels: ['Pending', 'Approved', 'Rejected'],
                                colors: ['#e49e3d', '#25b865', '#ea4d4d'],
                                legend: { position: 'bottom', fontSize: '12px' },
                                dataLabels: { enabled: true },
                                plotOptions: { pie: { donut: { size: '72%' } } },
                              }}
                            />
                          )}
                        </div>
                        <div className="bihar-amc-footer-stats">
                          <div className="bihar-amc-footer-stat"><span>Pending</span><strong>{summary.pending}</strong></div>
                          <div className="bihar-amc-footer-stat"><span>Approved</span><strong>{summary.approved}</strong></div>
                          <div className="bihar-amc-footer-stat"><span>Rejected</span><strong>{summary.rejected}</strong></div>
                          <div className="bihar-amc-footer-stat"><span>Sites</span><strong>{summary.total}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 bihar-amc-section">
                <div className="bihar-amc-section-card">
                  <div className="bihar-amc-section-head">
                    <div className="bihar-amc-section-head-left">
                      <div className="bihar-amc-section-icon docs">
                        <FiFileText size={20} />
                      </div>
                      <div>
                        <h5>Reports</h5>
                        <p>District, block, surveyor, daily, and site register exports</p>
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 ula-dash-no-print">
                      <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => exportTable('csv')}>
                        <FiDownload size={13} /> CSV
                      </button>
                      <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => exportTable('excel')}>
                        <FiDownload size={13} /> Excel
                      </button>
                      <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => exportTable('json')}>
                        <FiDownload size={13} /> JSON
                      </button>
                      <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => window.print()}>
                        <FiPrinter size={13} /> Print
                      </button>
                    </div>
                  </div>
                  <div className="bihar-amc-section-body">
                    <div className="ula-dash-filters ula-dash-no-print">
                      <input type="search" value={filters.q} placeholder="Search CA, name, village, serial" onChange={(event) => setFilter('q', event.target.value)} />
                      <select value={filters.district} onChange={(event) => setFilter('district', event.target.value)}>
                        <option value="">All districts</option>
                        {districtOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <select value={filters.block} onChange={(event) => setFilter('block', event.target.value)}>
                        <option value="">All blocks</option>
                        {blockOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <select value={filters.panchayat} onChange={(event) => setFilter('panchayat', event.target.value)}>
                        <option value="">All panchayats</option>
                        {panchayatOptions.map((name) => <option key={name} value={name}>{name}</option>)}
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
                        {surveyorOptions.map((name) => <option key={name} value={name}>{name}</option>)}
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
                          onClick={() => { setReport(tab.id); setPage(1) }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {report === 'overview' && (
                      <>
                        <div className="bihar-amc-panel mb-3">
                          <div className="bihar-amc-panel-head">
                            <h6>District-wise ULA progress</h6>
                          </div>
                          <div className="p-2 pb-0">
                            {districtGroups.length ? (
                              <ReactApexChart
                                type="bar"
                                height={340}
                                series={[
                                  { name: 'Sites', data: districtGroups.map((row) => row.total) },
                                  { name: 'Approved', data: districtGroups.map((row) => row.approved) },
                                  { name: '2nd visit pending', data: districtGroups.map((row) => row.secondPending) },
                                ]}
                                options={{
                                  chart: { toolbar: { show: false } },
                                  colors: ['#3454d1', '#25b865', '#e49e3d'],
                                  stroke: { width: [0, 0, 0], curve: 'smooth' },
                                  plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
                                  xaxis: {
                                    categories: districtGroups.map((row) => row.label),
                                    labels: { rotate: -35, style: { fontSize: '11px', colors: '#64748b' } },
                                  },
                                  grid: { borderColor: '#eef2f6', strokeDashArray: 4 },
                                  dataLabels: { enabled: false },
                                  legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
                                }}
                              />
                            ) : (
                              <div className="bihar-amc-empty">No district data.</div>
                            )}
                          </div>
                          <div className="bihar-amc-footer-stats">
                            <div className="bihar-amc-footer-stat"><span>Sites</span><strong>{summary.total}</strong></div>
                            <div className="bihar-amc-footer-stat"><span>Complete</span><strong>{summary.completeFirst + summary.completeSecond}</strong></div>
                            <div className="bihar-amc-footer-stat"><span>2nd pending</span><strong>{summary.secondPending}</strong></div>
                            <div className="bihar-amc-footer-stat"><span>Completion</span><strong>{completionPct}%</strong></div>
                          </div>
                        </div>

                        <div className="bihar-amc-panel mb-3">
                          <div className="bihar-amc-panel-head">
                            <h6>District status</h6>
                          </div>
                          <div className="table-responsive">
                            <table className="table bihar-amc-table mb-0">
                              <thead>
                                <tr>
                                  <th>District</th>
                                  <th>Sites</th>
                                  <th>Done</th>
                                  <th>2nd pending</th>
                                  <th>Approved</th>
                                  <th>Rejected</th>
                                  <th>Progress</th>
                                </tr>
                              </thead>
                              <tbody>
                                {districtGroups.length === 0 ? (
                                  <tr><td colSpan={7}><div className="bihar-amc-empty">No districts in this filter.</div></td></tr>
                                ) : (
                                  districtGroups.map((row) => {
                                    const done = row.completeFirst + row.completeSecond
                                    const pct = row.total ? Math.round((done / row.total) * 100) : 0
                                    const color = pct >= 50 ? 'success' : pct > 0 ? 'warning' : 'danger'
                                    return (
                                      <tr key={row.label}>
                                        <td>
                                          <div className="bihar-amc-district-cell">
                                            <span className="bihar-amc-district-avatar">{row.label.trim().substring(0, 1)}</span>
                                            <span className="fw-semibold">{row.label}</span>
                                          </div>
                                        </td>
                                        <td><span className="badge bg-gray-200 text-dark">{row.total}</span></td>
                                        <td>{done}</td>
                                        <td>{row.secondPending}</td>
                                        <td>{row.approved}</td>
                                        <td>{row.rejected}</td>
                                        <td>
                                          <div className="bihar-amc-progress-wrap">
                                            <div className="progress">
                                              <div className={`progress-bar bg-${color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className={`badge bg-soft-${color} text-${color}`}>{pct}%</span>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="bihar-amc-panel">
                          <div className="bihar-amc-panel-head">
                            <h6>Top surveyors</h6>
                          </div>
                          <GroupTable
                            table={{
                              title: 'Surveyors',
                              headers: ['Surveyor', 'Sites', '1st visits', '2nd visits'],
                              rows: surveyorPreview.map((row) => [row.label, row.sites, row.firstVisits, row.secondVisits]),
                            }}
                          />
                        </div>
                      </>
                    )}

                    {report !== 'overview' && report !== 'register' && (
                      <div className="bihar-amc-panel">
                        <div className="bihar-amc-panel-head">
                          <h6>{table.title}</h6>
                          <span className="fs-12 text-muted">{table.rows.length} rows</span>
                        </div>
                        <GroupTable table={{ ...table, rows: pagedRows }} />
                      </div>
                    )}

                    {report === 'register' && (
                      <div className="bihar-amc-panel">
                        <div className="bihar-amc-panel-head">
                          <h6>Site register</h6>
                          <span className="fs-12 text-muted">{filtered.length} sites</span>
                        </div>
                        <div className="table-responsive">
                          <table className="table bihar-amc-table mb-0">
                            <thead>
                              <tr>
                                <th>CA</th>
                                <th>Location</th>
                                <th>Visit</th>
                                <th>Surveyors</th>
                                <th>Approval</th>
                                <th className="ula-dash-no-print">View</th>
                                {isAdmin ? <th className="ula-dash-no-print">Actions</th> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).length === 0 ? (
                                <tr>
                                  <td colSpan={isAdmin ? 7 : 6}><div className="bihar-amc-empty">No sites match these filters.</div></td>
                                </tr>
                              ) : (
                                filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((row) => (
                                  <tr key={row.id}>
                                    <td>
                                      <div className="fw-semibold">{row.caNumber || '—'}</div>
                                      <div className="fs-11 text-muted">{row.caName || '—'}</div>
                                    </td>
                                    <td className="fs-12 text-muted">
                                      {[row.village, row.panchayat, row.block, row.district].filter(Boolean).join(' / ') || '—'}
                                    </td>
                                    <td>{row.visitLabel}</td>
                                    <td>
                                      <div>{row.firstBy || '—'}</div>
                                      <div className="fs-11 text-muted">{row.secondBy ? `2nd: ${row.secondBy}` : '2nd visit not done'}</div>
                                    </td>
                                    <td>
                                      <span className={`badge ${getAmcApprovalBadgeClass(row.approvalStatus)}`}>
                                        {getAmcApprovalLabel(row.approvalStatus)}
                                      </span>
                                      {row.approvalRemarks ? <div className="fs-11 text-muted mt-1">{row.approvalRemarks}</div> : null}
                                    </td>
                                    <td className="ula-dash-no-print">
                                      <button type="button" className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1" onClick={() => navigate(`${pages.bihar.ulaDetails}?id=${row.id}`)}>
                                        View
                                      </button>
                                    </td>
                                    {isAdmin ? (
                                      <td className="ula-dash-no-print">
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
                                              onClick={() => approveRow(row)}
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
                                              onClick={() => {
                                                setRejectTarget(row)
                                                setRejectRemarks('')
                                                setRejectRemarksError('')
                                              }}
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
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {report !== 'overview' && table.rows.length > PER_PAGE && (
                      <div className="d-flex justify-content-end pt-3 ula-dash-no-print">
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
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
    </div>
  )
}

export default BiharUlaDashboard
