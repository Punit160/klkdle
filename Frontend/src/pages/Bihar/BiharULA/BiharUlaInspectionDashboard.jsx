import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import {
  FiActivity,
  FiCheckCircle,
  FiClipboard,
  FiDownload,
  FiRefreshCw,
  FiXCircle,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Pagination from '@/components/shared/Pagination'
import { api, pages } from '../../../api/routes'
import localApi from '../../../api/localApi'
import { userIsAdmin } from '../../../utils/userRoles'
import { AMC_DOC_APPROVAL, getAmcApprovalLabel } from '../../../utils/amcApproval'
import { getApiErrorMessage } from '../../../utils/apiError'
import { downloadTextFile, slugFilePart, tableToCsv, tableToExcelHtml } from './ulaDashboardReports'
import { INSPECTION_REPORT_TABS, groupInspections, inspectionReportTable } from './inspectionDashboardReports'
import '../../../styles/Bihar/bihar-ssl-amc-dashboard.css'
import '../../../styles/ula-dashboard.css'
import '../../../styles/bihar-ula.css'

const PER_PAGE = 15
const EMPTY_FILTERS = {
  q: '',
  district: '',
  block: '',
  panchayat: '',
  approval: '',
  inspector: '',
  from: '',
  to: '',
}

const dayKey = (value) => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

const formatDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '—'
  return `${match[3]}-${match[2]}-${match[1]}`
}

const uniqueSorted = (values) =>
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )

const normalize = (row) => ({
  id: row.id,
  ca: row.ca_no || '',
  name: row.consumer_name || '',
  mobile: row.mobile || '',
  district: String(row.district || '').trim(),
  block: String(row.block || '').trim(),
  panchayat: String(row.panchayat || '').trim(),
  village: String(row.village || '').trim(),
  day: dayKey(row.inspection_date),
  month: dayKey(row.inspection_date).slice(0, 7),
  inspector: String(row.user_name || '').trim() || 'Unknown',
  status: Number(row.approval_status ?? 0),
  remarks: row.approval_remarks || '',
  by: row.approval_by || '',
  photos: Number(row.photo_count) || 0,
  latitude: row.latitude || '',
  longitude: row.longitude || '',
})

const Stat = ({ icon: Icon, title, value, subtitle, tone = 'primary', active, onClick }) => (
  <button type="button" className={`bihar-amc-stat${active ? ' is-active' : ''}`} onClick={onClick}>
    <div className="bihar-amc-stat-top">
      <div className={`bihar-amc-stat-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <strong>{Number(value || 0).toLocaleString('en-IN')}</strong>
    </div>
    <span>{title}</span>
    {subtitle ? <small>{subtitle}</small> : null}
  </button>
)

const ReportTable = ({ table }) => {
  if (!table.rows.length) return <div className="bihar-amc-empty">No rows match these filters.</div>
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

const BiharUlaInspectionDashboard = () => {
  const navigate = useNavigate()
  const isAdmin = userIsAdmin()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [report, setReport] = useState('overview')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    localApi
      .get(api.biharUla.inspectionList)
      .then((res) => {
        if (!cancelled) setRecords(Array.isArray(res?.data?.data) ? res.data.data : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setRecords([])
          setError(getApiErrorMessage(err, 'Could not load the inspection dashboard.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const rows = useMemo(() => records.map(normalize), [records])
  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase()
    return rows.filter((row) => {
      if (filters.district && row.district !== filters.district) return false
      if (filters.block && row.block !== filters.block) return false
      if (filters.panchayat && row.panchayat !== filters.panchayat) return false
      if (filters.approval !== '' && row.status !== Number(filters.approval)) return false
      if (filters.inspector && row.inspector !== filters.inspector) return false
      if (filters.from && (!row.day || row.day < filters.from)) return false
      if (filters.to && (!row.day || row.day > filters.to)) return false
      if (!query) return true
      return [row.ca, row.name, row.mobile, row.district, row.block, row.village, row.inspector, row.remarks]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [rows, filters])

  const summary = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    return {
      total: filtered.length,
      pending: filtered.filter((row) => row.status !== 1 && row.status !== 2).length,
      approved: filtered.filter((row) => row.status === AMC_DOC_APPROVAL.APPROVED).length,
      rejected: filtered.filter((row) => row.status === AMC_DOC_APPROVAL.REJECTED).length,
      districts: new Set(filtered.map((row) => row.district).filter(Boolean)).size,
      thisMonth: filtered.filter((row) => row.month === currentMonth).length,
    }
  }, [filtered])

  const districtGroups = useMemo(
    () => groupInspections(filtered, (row) => row.district).slice(0, 8),
    [filtered]
  )
  const table = useMemo(() => inspectionReportTable(report, filtered), [report, filtered])
  const totalPages = Math.max(Math.ceil(table.rows.length / PER_PAGE), 1)
  const pagedRows = table.rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const districtOptions = useMemo(() => uniqueSorted(rows.map((row) => row.district)), [rows])
  const blockOptions = useMemo(() => {
    const source = filters.district ? rows.filter((row) => row.district === filters.district) : rows
    return uniqueSorted(source.map((row) => row.block))
  }, [rows, filters.district])
  const panchayatOptions = useMemo(() => {
    const source = rows.filter((row) => {
      if (filters.district && row.district !== filters.district) return false
      if (filters.block && row.block !== filters.block) return false
      return true
    })
    return uniqueSorted(source.map((row) => row.panchayat))
  }, [rows, filters.district, filters.block])
  const inspectorOptions = useMemo(() => uniqueSorted(rows.map((row) => row.inspector)), [rows])

  const setFilter = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'district') {
        next.block = ''
        next.panchayat = ''
      }
      if (key === 'block') next.panchayat = ''
      return next
    })
    setPage(1)
  }

  const openApprovalReport = (status) => {
    setFilters((prev) => ({ ...prev, approval: status }))
    setReport(status === '' ? 'register' : 'approval')
    setPage(1)
  }

  const exportReport = (format) => {
    const stamp = new Date().toISOString().slice(0, 10)
    const base = `${slugFilePart(table.title)}-${stamp}`
    if (format === 'excel') {
      downloadTextFile(`${base}.xls`, tableToExcelHtml(table), 'application/vnd.ms-excel')
      return
    }
    if (format === 'json') {
      const recordsOut = table.rows.map((row) =>
        Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? '']))
      )
      downloadTextFile(
        `${base}.json`,
        JSON.stringify({ title: table.title, count: recordsOut.length, records: recordsOut }, null, 2),
        'application/json'
      )
      return
    }
    downloadTextFile(`${base}.csv`, tableToCsv(table), 'text/csv;charset=utf-8')
  }

  return (
    <>
      <PageHeader />
      <div className="main-content bihar-amc-dashboard">
        <div className="row">
          <div className="col-12">
            <div className="bihar-amc-hero">
              <div>
                <h4>Bihar ULA inspection</h4>
                <p>
                  {isAdmin
                    ? 'District, block, inspector, daily, monthly, and approval reports for every inspection.'
                    : 'Reports for the inspections you submitted.'}
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link to={pages.bihar.ulaInspection} className="btn btn-primary d-inline-flex align-items-center gap-2">
                  <FiClipboard size={15} /> Do inspection
                </Link>
                <Link to={pages.bihar.ulaInspectionList} className="btn btn-light-brand d-inline-flex align-items-center gap-2">
                  Inspection table
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
                <div className="bihar-amc-empty">Loading inspection dashboard...</div>
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
            <div className="col-12 bihar-amc-section">
              <div className="bihar-amc-section-card">
                <div className="bihar-amc-section-head">
                  <div className="bihar-amc-section-head-left">
                    <div className="bihar-amc-section-icon amc">
                      <FiActivity size={20} />
                    </div>
                    <div>
                      <h5>Inspection reports</h5>
                      <p>
                        {summary.thisMonth} this month · {summary.districts} districts · {filtered.length} in this report
                      </p>
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => exportReport('csv')} disabled={!table.rows.length}>
                      <FiDownload size={13} /> CSV
                    </button>
                    <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => exportReport('excel')} disabled={!table.rows.length}>
                      <FiDownload size={13} /> Excel
                    </button>
                  </div>
                </div>
                <div className="bihar-amc-section-body">
                  <div className="bihar-amc-stat-grid">
                    <Stat icon={FiClipboard} title="Inspections" value={summary.total} subtitle="Open the register" active={report === 'register' && filters.approval === ''} onClick={() => openApprovalReport('')} />
                    <Stat icon={FiActivity} title="Pending approval" value={summary.pending} subtitle="Waiting for admin" tone="warning" active={filters.approval === '0'} onClick={() => openApprovalReport('0')} />
                    <Stat icon={FiCheckCircle} title="Approved" value={summary.approved} subtitle="Accepted inspections" tone="success" active={filters.approval === '1'} onClick={() => openApprovalReport('1')} />
                    <Stat icon={FiXCircle} title="Rejected" value={summary.rejected} subtitle="Can be inspected again this month" tone="danger" active={filters.approval === '2'} onClick={() => openApprovalReport('2')} />
                  </div>

                  <div className="ula-dash-filters">
                    <input type="search" value={filters.q} placeholder="Search CA, name, village" onChange={(event) => setFilter('q', event.target.value)} />
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
                    <select value={filters.inspector} onChange={(event) => setFilter('inspector', event.target.value)}>
                      <option value="">All inspectors</option>
                      {inspectorOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <select value={filters.approval} onChange={(event) => setFilter('approval', event.target.value)}>
                      <option value="">All approvals</option>
                      <option value="0">Pending</option>
                      <option value="1">Approved</option>
                      <option value="2">Rejected</option>
                    </select>
                    <input type="date" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} aria-label="From date" />
                    <input type="date" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} aria-label="To date" />
                    <button type="button" className="btn btn-sm btn-light" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
                      Clear
                    </button>
                  </div>

                  <div className="ula-dash-tabs">
                    {INSPECTION_REPORT_TABS.map((tab) => (
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
                      <div className="bihar-amc-panel-grid">
                        <div className="bihar-amc-panel">
                          <div className="bihar-amc-panel-head"><h6>Approval</h6></div>
                          {summary.total ? (
                            <div className="p-3">
                              <ReactApexChart
                                type="donut"
                                height={280}
                                series={[summary.approved, summary.pending, summary.rejected]}
                                options={{
                                  labels: ['Approved', 'Pending', 'Rejected'],
                                  colors: ['#25b865', '#e49e3d', '#ea4d4d'],
                                  legend: { position: 'bottom', fontSize: '12px' },
                                  dataLabels: { enabled: true },
                                  plotOptions: { pie: { donut: { size: '72%' } } },
                                }}
                              />
                            </div>
                          ) : (
                            <div className="bihar-amc-empty">No inspections match these filters.</div>
                          )}
                        </div>
                        <div className="bihar-amc-panel">
                          <div className="bihar-amc-panel-head"><h6>Districts</h6></div>
                          {districtGroups.length ? (
                            <div className="p-2 pb-0">
                              <ReactApexChart
                                type="bar"
                                height={280}
                                series={[
                                  { name: 'Inspections', data: districtGroups.map((row) => row.total) },
                                  { name: 'Approved', data: districtGroups.map((row) => row.approved) },
                                  { name: 'Pending', data: districtGroups.map((row) => row.pending) },
                                ]}
                                options={{
                                  chart: { toolbar: { show: false } },
                                  colors: ['#3454d1', '#25b865', '#e49e3d'],
                                  plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
                                  xaxis: {
                                    categories: districtGroups.map((row) => row.label),
                                    labels: { rotate: -25, style: { fontSize: '11px', colors: '#64748b' } },
                                  },
                                  grid: { borderColor: '#eef2f6', strokeDashArray: 4 },
                                  dataLabels: { enabled: false },
                                  legend: { position: 'top', fontSize: '12px' },
                                }}
                              />
                            </div>
                          ) : (
                            <div className="bihar-amc-empty">No district data.</div>
                          )}
                        </div>
                      </div>
                      <div className="bihar-amc-panel mt-3">
                        <div className="bihar-amc-panel-head">
                          <h6>Recent inspections</h6>
                          <button type="button" className="btn btn-link btn-sm p-0 fs-12 fw-semibold" onClick={() => { setReport('register'); setPage(1) }}>
                            Open register
                          </button>
                        </div>
                        <div className="table-responsive">
                          <table className="table bihar-amc-table mb-0">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>CA</th>
                                <th>Location</th>
                                <th>Inspector</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.slice(0, 8).length === 0 ? (
                                <tr><td colSpan={5}><div className="bihar-amc-empty">No inspections match these filters.</div></td></tr>
                              ) : (
                                filtered.slice(0, 8).map((row) => (
                                  <tr key={row.id} className="ula-clickable-row" onClick={() => navigate(`${pages.bihar.ulaInspectionDetails}?id=${row.id}`)}>
                                    <td>{formatDate(row.day)}</td>
                                    <td>
                                      <div className="fw-semibold">{row.ca || '—'}</div>
                                      <div className="fs-11 text-muted">{row.name || '—'}</div>
                                    </td>
                                    <td className="fs-12">{[row.district, row.block, row.village].filter(Boolean).join(' / ') || '—'}</td>
                                    <td>{row.inspector}</td>
                                    <td>{getAmcApprovalLabel(row.status)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {report !== 'overview' && report !== 'register' && (
                    <div className="bihar-amc-panel">
                      <div className="bihar-amc-panel-head">
                        <h6>{table.title}</h6>
                        <span className="fs-12 text-muted">{table.rows.length} rows</span>
                      </div>
                      <ReportTable table={{ ...table, rows: pagedRows }} />
                      {table.rows.length > PER_PAGE ? (
                        <div className="p-3">
                          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {report === 'register' && (
                    <div className="bihar-amc-panel">
                      <div className="bihar-amc-panel-head">
                        <h6>Inspection register</h6>
                        <span className="fs-12 text-muted">{filtered.length} inspections</span>
                      </div>
                      <div className="table-responsive">
                        <table className="table bihar-amc-table mb-0">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>CA</th>
                              <th>Location</th>
                              <th>Inspector</th>
                              <th>Photos</th>
                              <th>Status</th>
                              <th>View</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).length === 0 ? (
                              <tr><td colSpan={7}><div className="bihar-amc-empty">No inspections match these filters.</div></td></tr>
                            ) : (
                              filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((row) => (
                                <tr key={row.id}>
                                  <td>{formatDate(row.day)}</td>
                                  <td>
                                    <div className="fw-semibold">{row.ca || '—'}</div>
                                    <div className="fs-11 text-muted">{row.name || '—'}</div>
                                  </td>
                                  <td className="fs-12">{[row.district, row.block, row.panchayat, row.village].filter(Boolean).join(' / ') || '—'}</td>
                                  <td>{row.inspector}</td>
                                  <td>{row.photos}</td>
                                  <td>{getAmcApprovalLabel(row.status)}</td>
                                  <td>
                                    <button type="button" className="btn btn-sm btn-light" onClick={() => navigate(`${pages.bihar.ulaInspectionDetails}?id=${row.id}`)}>
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {filtered.length > PER_PAGE ? (
                        <div className="p-3">
                          <Pagination currentPage={page} totalPages={Math.max(Math.ceil(filtered.length / PER_PAGE), 1)} onPageChange={setPage} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default BiharUlaInspectionDashboard
