import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import {
  FiActivity,
  FiArrowRight,
  FiCheckCircle,
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
import { userIsAdmin } from '../../utils/userRoles'
import '../../styles/Bihar/bihar-ssl-amc-dashboard.css'

const ASSET = {
  kusumc: {
    singular: 'Pump',
    plural: 'Pumps',
    id: (row) => row.pump_id || row.ssl_id,
    extra: (row) => row.work_order_no || row.capacity || '—',
  },
  powerpack: {
    singular: 'Power pack',
    plural: 'Power packs',
    id: (row) => row.powerpack_id || row.ssl_id,
    extra: (row) => row.scheme_name || row.capacity || '—',
  },
  offgrid: {
    singular: 'Off grid',
    plural: 'Off grid plants',
    id: (row) => row.offgrid_id || row.ssl_id,
    extra: (row) => row.installed_place || row.scheme_name || '—',
  },
  ongrid: {
    singular: 'On grid',
    plural: 'On grid plants',
    id: (row) => row.ongrid_id || row.ssl_id,
    extra: (row) => row.installed_place || row.scheme_name || '—',
  },
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const StatTile = ({ icon: Icon, title, value, subtitle, tone = 'primary', to }) => {
  const body = (
    <>
      <div className="bihar-amc-stat-top">
        <div className={`bihar-amc-stat-icon ${tone}`}>
          <Icon size={18} />
        </div>
        <strong>{value?.toLocaleString?.() ?? value ?? '—'}</strong>
      </div>
      <span>{title}</span>
      {subtitle && <small>{subtitle}</small>}
    </>
  )
  if (!to) return <div className="bihar-amc-stat">{body}</div>
  return (
    <Link to={to} className="bihar-amc-stat bihar-amc-stat-link">
      {body}
    </Link>
  )
}

const buildStats = (rows, asset) => {
  const working = rows.filter((row) => row.light_working === 'Yes').length
  const districts = [...rows.reduce((map, row) => {
    const name = String(row.district || '').trim()
    if (!name) return map
    const current = map.get(name) || { district: name, total: 0, working: 0, notWorking: 0 }
    current.total += 1
    if (row.light_working === 'Yes') current.working += 1
    else current.notWorking += 1
    map.set(name, current)
    return map
  }, new Map()).values()].sort((a, b) => b.total - a.total)

  return {
    total: rows.length,
    working,
    notWorking: rows.length - working,
    districts: districts.length,
    uniqueAssets: new Set(rows.map((row) => asset.id(row)).filter(Boolean)).size,
    districtRows: districts,
  }
}

const FieldVisitDashboard = ({ region = 'kusumc' }) => {
  const navigate = useNavigate()
  const amcConfig = getSslAmcConfig(region)
  const asset = ASSET[region] || ASSET.kusumc
  const listPath = amcConfig.pages.lightAmcList
  const detailsPath = amcConfig.pages.lightAmcDetails
  const formPath = amcConfig.pages.lightAmc
  const isAdmin = userIsAdmin()
  const [rows, setRows] = useState([])
  const [scope, setScope] = useState('mine')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await localApi.get(app.lightAmc.get, {
        params: {
          company_id: getCompanyId(),
          state: amcConfig.stateName,
          region,
        },
      })
      setRows(Array.isArray(res?.data?.data) ? res.data.data : [])
      setScope(res?.data?.meta?.scope === 'all' ? 'all' : 'mine')
    } catch (err) {
      setRows([])
      setError(err?.response?.data?.message || err?.message || 'Failed to load the dashboard.')
    } finally {
      setLoading(false)
    }
  }, [amcConfig.stateName, region])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const stats = useMemo(() => buildStats(rows, asset), [rows, asset])
  const recent = rows.slice(0, 8)
  const categories = stats.districtRows.map((row) => row.district)

  const donutOptions = {
    chart: {
      type: 'donut',
      toolbar: { show: false },
      events: {
        dataPointSelection: (_event, _chart, config) => {
          if (config.dataPointIndex == null || config.dataPointIndex < 0) return
          navigate(`${listPath}?working=${config.dataPointIndex === 0 ? 'Yes' : 'No'}`)
        },
      },
    },
    labels: ['Working', 'Not Working'],
    colors: ['#25b865', '#ea4d4d'],
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, formatter: (value) => `${Math.round(value)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Visits',
              fontSize: '12px',
              formatter: () => String(stats.total),
            },
          },
        },
      },
    },
  }

  const districtOptions = {
    chart: {
      toolbar: { show: false },
      events: {
        dataPointSelection: (_event, _chart, config) => {
          const district = categories[config.dataPointIndex]
          if (district && config.dataPointIndex >= 0) {
            navigate(`${listPath}?district=${encodeURIComponent(district)}`)
          }
        },
      },
    },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
    colors: ['#25b865', '#ea4d4d'],
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { fontSize: '10px', colors: '#64748b' }, rotate: -35 },
    },
    yaxis: { labels: { style: { colors: '#64748b' } } },
    grid: { borderColor: '#eef2f6', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
  }

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
                <span className="bihar-amc-hero-badge">{amcConfig.stateName}</span>
                <h4>{amcConfig.moduleTitle}</h4>
                <p>
                  {scope === 'all' || isAdmin
                    ? `Every saved ${asset.singular.toLowerCase()} visit, with working status and district coverage.`
                    : `Your ${asset.singular.toLowerCase()} visits, with working status and district coverage.`}
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link to={formPath} className="btn btn-primary d-inline-flex align-items-center gap-2">
                  <FiTool size={15} /> Do AMC
                </Link>
                <Link to={listPath} className="btn btn-light-brand d-inline-flex align-items-center gap-2">
                  View AMC <FiArrowRight size={14} />
                </Link>
                <button type="button" className="btn btn-light d-inline-flex align-items-center gap-2" onClick={fetchDashboard} disabled={loading}>
                  <FiRefreshCw className={loading ? 'spin' : ''} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="col-12">
              <div className="bihar-amc-section-card"><div className="bihar-amc-empty">Loading dashboard...</div></div>
            </div>
          )}

          {!loading && error && (
            <div className="col-12">
              <div className="bihar-amc-section-card">
                <div className="bihar-amc-empty">
                  <p className="text-danger mb-2">{error}</p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={fetchDashboard}>Try again</button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="col-12">
                <div className="bihar-amc-stat-grid">
                  <StatTile icon={FiActivity} title="AMC visits" value={stats.total} subtitle="Open the visit table" to={listPath} />
                  <StatTile icon={FiSun} title={`Unique ${asset.plural}`} value={stats.uniqueAssets} subtitle="Sites with a saved visit" tone="info" to={listPath} />
                  <StatTile icon={FiCheckCircle} title="Working" value={stats.working} subtitle="Open working visits" tone="success" to={`${listPath}?working=Yes`} />
                  <StatTile icon={FiXCircle} title="Not working" value={stats.notWorking} subtitle="Open visits that need attention" tone="danger" to={`${listPath}?working=No`} />
                  <StatTile icon={FiMapPin} title="Districts" value={stats.districts} subtitle="Districts with a visit" tone="warning" to={listPath} />
                </div>
              </div>

              <div className="col-lg-7">
                <div className="bihar-amc-panel h-100">
                  <div className="bihar-amc-panel-head"><h6>District-wise visits</h6></div>
                  <div className="p-2">
                    {stats.districtRows.length === 0 ? (
                      <div className="bihar-amc-empty">No visits yet.</div>
                    ) : (
                      <ReactApexChart
                        options={districtOptions}
                        series={[
                          { name: 'Working', data: stats.districtRows.map((row) => row.working) },
                          { name: 'Not working', data: stats.districtRows.map((row) => row.notWorking) },
                        ]}
                        type="bar"
                        height={320}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="bihar-amc-panel h-100">
                  <div className="bihar-amc-panel-head"><h6>Working status</h6></div>
                  <div className="p-3">
                    {stats.total === 0 ? (
                      <div className="bihar-amc-empty">No visits to chart yet.</div>
                    ) : (
                      <ReactApexChart options={donutOptions} series={[stats.working, stats.notWorking]} type="donut" height={280} />
                    )}
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="bihar-amc-panel">
                  <div className="bihar-amc-panel-head">
                    <h6>Recent visits</h6>
                    <Link to={formPath} className="fs-12 fw-semibold text-primary">Do AMC</Link>
                  </div>
                  <div className="table-responsive">
                    <table className="table bihar-amc-table mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>{asset.singular}</th>
                          <th>Location</th>
                          <th>Beneficiary</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.length === 0 ? (
                          <tr><td colSpan={5}><div className="bihar-amc-empty">No visits yet. Start with Do AMC.</div></td></tr>
                        ) : recent.map((row) => (
                          <tr
                            key={row.id}
                            className="bihar-amc-row-link"
                            onClick={() => navigate(`${detailsPath}?id=${row.id}`, { state: { row } })}
                          >
                            <td>{formatDate(row.amc_date)}</td>
                            <td>
                              <div className="fw-semibold">{asset.id(row) || '—'}</div>
                              <div className="fs-11 text-muted">{asset.extra(row)}</div>
                            </td>
                            <td className="fs-12 text-muted">{[row.district, row.block, row.village || row.panchayat].filter(Boolean).join(' / ') || '—'}</td>
                            <td>{row.beneficiary_name || '—'}</td>
                            <td>
                              <span className={`badge ${row.light_working === 'Yes' ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                                {row.light_working === 'Yes' ? 'Working' : 'Not working'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FieldVisitDashboard
