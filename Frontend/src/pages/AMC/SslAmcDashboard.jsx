import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import {
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
  FiFileText,
  FiLayers,
  FiMapPin,
  FiRefreshCw,
  FiSun,
  FiTool,
  FiXCircle,
} from 'react-icons/fi'
import PageHeaderDate from '@/components/shared/pageHeader/PageHeaderDate'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getCompanyId } from '../../utils/auth'
import { getSslAmcConfig } from '../../utils/sslAmcConfig'
import '../../styles/Bihar/bihar-ssl-amc-dashboard.css'

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const StatTile = ({ icon: Icon, title, value, subtitle, tone = 'primary' }) => (
  <div className="bihar-amc-stat">
    <div className="bihar-amc-stat-top">
      <div className={`bihar-amc-stat-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <strong>{value?.toLocaleString?.() ?? value ?? '—'}</strong>
    </div>
    <span>{title}</span>
    {subtitle && <small>{subtitle}</small>}
  </div>
)

const SectionBlock = ({ tone, icon: Icon, title, subtitle, actionTo, actionLabel, children }) => (
  <div className="col-12 bihar-amc-section">
    <div className="bihar-amc-section-card">
      <div className="bihar-amc-section-head">
        <div className="bihar-amc-section-head-left">
          <div className={`bihar-amc-section-icon ${tone}`}>
            <Icon size={20} />
          </div>
          <div>
            <h5>{title}</h5>
            <p>{subtitle}</p>
          </div>
        </div>
        {actionTo && (
          <Link to={actionTo} className="btn btn-sm btn-light-brand d-inline-flex align-items-center gap-2">
            {actionLabel} <FiArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="bihar-amc-section-body">{children}</div>
    </div>
  </div>
)

const buildFieldAmcStats = (rows) => {
  const working = rows.filter((row) => row.light_working === 'Yes').length
  const notWorking = rows.length - working
  const districts = new Set(rows.map((row) => row.district).filter(Boolean)).size
  const uniqueLights = new Set(rows.map((row) => row.ssl_id || row.unique_id).filter(Boolean)).size

  return { total: rows.length, working, notWorking, districts, uniqueLights }
}

const fieldAmcChartOptions = (working, notWorking) => ({
  chart: { type: 'donut', toolbar: { show: false } },
  labels: ['Working', 'Not Working'],
  colors: ['#25b865', '#ea4d4d'],
  legend: { position: 'bottom', fontSize: '12px' },
  dataLabels: { enabled: true, formatter: (val) => `${Math.round(val)}%` },
  plotOptions: {
    pie: {
      donut: {
        size: '72%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total AMC',
            fontSize: '12px',
            formatter: () => String(working + notWorking),
          },
        },
      },
    },
  },
})

export const districtLightsChartOption = (districts, completedLabel, pendingLabel) => {
  const categories = districts.map((d) => d.district.trim())
  const lights = districts.map((d) => d.total_lights)
  const completed = districts.map((d) => d.completed)
  const pending = districts.map((d) => d.pending)

  return {
    chart: { width: '100%', stacked: false, toolbar: { show: false } },
    stroke: { width: [1, 0], curve: 'smooth', lineCap: 'round' },
    plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '48%' } },
    colors: ['#3454d1', '#25b865', '#ea4d4d'],
    series: [
      { name: 'Total Lights', type: 'bar', data: lights },
      { name: completedLabel, type: 'bar', data: completed },
      { name: pendingLabel, type: 'bar', data: pending },
    ],
    fill: { opacity: [0.9, 1, 1] },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '10px', colors: '#64748b' }, rotate: -35 },
    },
    yaxis: { labels: { style: { colors: '#64748b' } } },
    grid: { borderColor: '#eef2f6', strokeDashArray: 4 },
    dataLabels: { enabled: false },
    legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
  }
}

const FieldAmcSection = ({ amcRows, amcConfig }) => {
  const stats = useMemo(() => buildFieldAmcStats(amcRows), [amcRows])
  const recentRows = amcRows.slice(0, 8)
  const chartOptions = fieldAmcChartOptions(stats.working, stats.notWorking)

  return (
    <SectionBlock
      tone="amc"
      icon={FiTool}
      title="Field AMC"
      subtitle="On-ground light AMC visits with GPS location and working status"
      actionTo={amcConfig.pages.lightAmcList}
      actionLabel="View all field AMC"
    >
      <div className="bihar-amc-stat-grid">
        <StatTile icon={FiActivity} title="Field AMC Records" value={stats.total} subtitle="Total visits submitted" tone="primary" />
        <StatTile icon={FiSun} title="Unique Lights" value={stats.uniqueLights} subtitle="Distinct poles serviced" tone="info" />
        <StatTile icon={FiCheckCircle} title="Lights Working" value={stats.working} subtitle="Marked working in AMC" tone="success" />
        <StatTile icon={FiMapPin} title="Districts Covered" value={stats.districts} subtitle="Districts with AMC data" tone="warning" />
      </div>

      <div className="bihar-amc-panel-grid">
        <div className="bihar-amc-panel">
          <div className="bihar-amc-panel-head">
            <h6>Recent Field AMC Records</h6>
            <Link to={amcConfig.pages.lightAmc} className="fs-12 fw-semibold text-primary">Do AMC</Link>
          </div>
          <div className="table-responsive">
            <table className="table bihar-amc-table mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Light / Pole</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.length === 0 ? (
                  <tr><td colSpan={4}><div className="bihar-amc-empty">No field AMC records yet. Start with Do Field AMC.</div></td></tr>
                ) : (
                  recentRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.amc_date)}</td>
                      <td>
                        <div className="fw-semibold">{row.unique_id || row.ssl_id || '—'}</div>
                        <div className="fs-11 text-muted">Pole {row.pole_no || '—'}</div>
                      </td>
                      <td className="fs-12 text-muted">{[row.district, row.block, row.panchayat].filter(Boolean).join(' / ') || '—'}</td>
                      <td>
                        <span className={`badge ${row.light_working === 'Yes' ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                          {row.light_working === 'Yes' ? 'Working' : 'Not Working'}
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
            <h6>Working Status Split</h6>
          </div>
          <div className="p-3">
            {stats.total === 0 ? (
              <div className="bihar-amc-empty">No AMC data to chart yet.</div>
            ) : (
              <ReactApexChart
                options={chartOptions}
                series={[stats.working, stats.notWorking]}
                type="donut"
                height={280}
              />
            )}
          </div>
          <div className="bihar-amc-footer-stats">
            <div className="bihar-amc-footer-stat"><span>Working</span><strong>{stats.working}</strong></div>
            <div className="bihar-amc-footer-stat"><span>Not Working</span><strong>{stats.notWorking}</strong></div>
          </div>
        </div>
      </div>
    </SectionBlock>
  )
}

const DocumentationSection = ({ docData, amcConfig }) => {
  const summary = docData.summary
  const districts = docData.districts
  const localityPlural = amcConfig.key === 'up' ? 'Villages' : 'Panchayats'
  const completedLabel = `${localityPlural} Completed`
  const pendingLabel = `${localityPlural} Pending`
  const chartOptions = districtLightsChartOption(districts, completedLabel, pendingLabel)

  const totalLocalities = summary.completed_panchayats + summary.pending_panchayats
  const completionPct = totalLocalities
    ? Math.round((summary.completed_panchayats / totalLocalities) * 100)
    : 0

  return (
    <SectionBlock
      tone="docs"
      icon={FiFileText}
      title="Documentation"
      subtitle={`SSL AMC document uploads and ${localityPlural.toLowerCase()} completion tracking`}
      actionTo={amcConfig.pages.amcList}
      actionLabel="View all documentation"
    >
      <div className="bihar-amc-stat-grid">
        <StatTile icon={FiLayers} title="Total Districts" value={summary.total_district} subtitle="Documentation coverage" tone="primary" />
        <StatTile icon={FiSun} title="Total SSL Lights" value={summary.total_lights} subtitle="Installed base" tone="info" />
        <StatTile icon={FiCheckCircle} title={`${localityPlural} Completed`} value={summary.completed_panchayats} subtitle={`${completionPct}% completion`} tone="success" />
        <StatTile icon={FiXCircle} title={`${localityPlural} Pending`} value={summary.pending_panchayats} subtitle={`${100 - completionPct}% pending`} tone="danger" />
      </div>

      <div className="bihar-amc-panel mb-3">
        <div className="bihar-amc-panel-head">
          <h6>District-wise SSL Progress</h6>
          <Link to={amcConfig.pages.amcUpload} className="fs-12 fw-semibold text-primary">Add documentation</Link>
        </div>
        <div className="p-2 pb-0">
          <ReactApexChart options={chartOptions} series={chartOptions.series} height={340} />
        </div>
        <div className="bihar-amc-footer-stats">
          <div className="bihar-amc-footer-stat"><span>Total Lights</span><strong>{summary.total_lights?.toLocaleString?.() ?? '—'}</strong></div>
          <div className="bihar-amc-footer-stat"><span>Completed</span><strong>{summary.completed_panchayats}</strong></div>
          <div className="bihar-amc-footer-stat"><span>Pending</span><strong>{summary.pending_panchayats}</strong></div>
          <div className="bihar-amc-footer-stat"><span>Completion</span><strong>{completionPct}%</strong></div>
        </div>
      </div>

      <div className="bihar-amc-panel">
        <div className="bihar-amc-panel-head">
          <h6>District Status Table</h6>
        </div>
        <div className="table-responsive">
          <table className="table bihar-amc-table mb-0">
            <thead>
              <tr>
                <th>District</th>
                <th>Blocks</th>
                <th>{localityPlural}</th>
                <th>Lights</th>
                <th>Done</th>
                <th>Pending</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d, idx) => {
                const pct = d.total_panchayats ? Math.round((d.completed / d.total_panchayats) * 100) : 0
                const color = pct >= 50 ? 'success' : pct > 0 ? 'warning' : 'danger'

                return (
                  <tr key={`${d.district}-${idx}`}>
                    <td>
                      <div className="bihar-amc-district-cell">
                        <span className="bihar-amc-district-avatar">{d.district.trim().substring(0, 1)}</span>
                        <span className="fw-semibold">{d.district.trim()}</span>
                      </div>
                    </td>
                    <td>{d.total_blocks}</td>
                    <td>{d.total_panchayats}</td>
                    <td><span className="badge bg-gray-200 text-dark">{d.total_lights.toLocaleString()}</span></td>
                    <td>{d.completed}</td>
                    <td>{d.pending}</td>
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </SectionBlock>
  )
}

const SslAmcDashboard = ({ region = 'bihar' }) => {
  const amcConfig = getSslAmcConfig(region)
  const [docData, setDocData] = useState(null)
  const [amcRows, setAmcRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)

    try {
      const [docRes, amcRes] = await Promise.all([
        localApi.get(app.ssl.dashboardDistrict(amcConfig.sslState)),
        localApi.get(app.lightAmc.get, {
          params: { company_id: getCompanyId(), state: amcConfig.stateName },
        }),
      ])

      if (docRes.data?.success) {
        setDocData(docRes.data)
      } else {
        throw new Error(docRes.data?.message || 'Failed to load documentation dashboard.')
      }

      setAmcRows(amcRes.data?.data || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data')
      setDocData(null)
      setAmcRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [amcConfig.sslState, amcConfig.stateName])

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
                <span className="bihar-amc-hero-badge">{amcConfig.stateName} Operations</span>
                <h4>{amcConfig.moduleTitle}</h4>
                <p>Field AMC activity first, then documentation progress — all in one dashboard.</p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link to={amcConfig.pages.lightAmc} className="btn btn-primary d-inline-flex align-items-center gap-2">
                  <FiTool size={15} /> Do Field AMC
                </Link>
                <Link to={amcConfig.pages.amcUpload} className="btn btn-light-brand d-inline-flex align-items-center gap-2">
                  <FiFileText size={15} /> Add Documentation
                </Link>
                <button
                  type="button"
                  className="btn btn-light d-inline-flex align-items-center gap-2"
                  onClick={fetchDashboard}
                  disabled={loading}
                >
                  <FiRefreshCw className={loading ? 'spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="col-12">
              <div className="bihar-amc-section-card">
                <div className="bihar-amc-empty">Loading {amcConfig.moduleTitle} dashboard...</div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="col-12">
              <div className="bihar-amc-section-card">
                <div className="bihar-amc-empty">
                  <p className="text-danger mb-2">{error}</p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={fetchDashboard}>Try Again</button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && docData && (
            <>
              <FieldAmcSection amcRows={amcRows} amcConfig={amcConfig} />
              <DocumentationSection docData={docData} amcConfig={amcConfig} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SslAmcDashboard
