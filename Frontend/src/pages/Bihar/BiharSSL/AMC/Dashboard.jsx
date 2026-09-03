/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { FiMoreVertical, FiRefreshCw } from 'react-icons/fi'
import PageHeaderDate from '@/components/shared/pageHeader/PageHeaderDate'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import localApi from '../../../../api/localApi'

const SiteOverviewStatistics = ({ summary }) => {
  if (!summary) return null

  const totalPanchayats = summary.completed_panchayats + summary.pending_panchayats
  const completionPct = totalPanchayats
    ? Math.round((summary.completed_panchayats / totalPanchayats) * 100)
    : 0

  const crmStatisticsData = [
    {
      id: '1',
      completed_number: '',
      total_number: summary.total_district,
      title: 'Total Districts',
      progress_info: 'Covered',
      progress: '100%',
    },
    {
      id: '2',
      completed_number: '',
      total_number: summary.total_lights,
      title: 'Total SSL Lights',
      progress_info: 'Installed Base',
      progress: '100%',
    },
    {
      id: '3',
      completed_number: summary.completed_panchayats,
      total_number: totalPanchayats,
      title: 'Panchayats Completed',
      progress_info: 'Completion',
      progress: `${completionPct}%`,
    },
    {
      id: '4',
      completed_number: summary.pending_panchayats,
      total_number: totalPanchayats,
      title: 'Panchayats Pending',
      progress_info: 'Pending',
      progress: `${100 - completionPct}%`,
    },
  ]

  return (
    <>
      {crmStatisticsData.map(({ id, completed_number, progress, progress_info, title, total_number }) => (
        <div key={id} className="col-xxl-3 col-md-6">
          <div className="card stretch stretch-full short-info-card">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-4">
                <div className="d-flex gap-4 align-items-center">
                  <div className="avatar-text avatar-lg bg-gray-200 icon">
                    <span className="fw-bold">{title.substring(0, 1)}</span>
                  </div>
                  <div>
                    <div className="fs-4 fw-bold text-dark">
                      <span className="counter">
                        {completed_number !== '' ? `${completed_number}/` : ''}
                      </span>
                      <span className="counter">{total_number?.toLocaleString?.() ?? total_number}</span>
                    </div>
                    <h3 className="fs-13 fw-semibold text-truncate-1-line">{title}</h3>
                  </div>
                </div>
                <Link to="#" className="lh-1">
                  <FiMoreVertical className="fs-16" />
                </Link>
              </div>
              <div className="pt-4">
                <div className="d-flex align-items-center justify-content-between">
                  <Link to="#" className="fs-12 fw-medium text-muted text-truncate-1-line">{title}</Link>
                  <div className="w-100 text-end">
                    <span className="fs-12 text-dark">{progress_info}</span>{' '}
                    <span className="fs-11 text-muted">({progress})</span>
                  </div>
                </div>
                <div className="progress mt-2 ht-3">
                  <div className={`progress-bar progress-${id}`} role="progressbar" style={{ width: progress }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

// ==========================================
// 2. DISTRICT-WISE LIGHTS CHART CONFIG & COMPONENT
// ==========================================
export const districtLightsChartOption = (districts) => {
  const categories = districts.map((d) => d.district.trim())
  const lights = districts.map((d) => d.total_lights)
  const completed = districts.map((d) => d.completed)
  const pending = districts.map((d) => d.pending)

  const chartOptions = {
    chart: {
      width: '100%',
      stacked: false,
      toolbar: { show: false },
    },
    stroke: {
      width: [1, 0],
      curve: 'smooth',
      lineCap: 'round',
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: 'end',
        columnWidth: '45%',
      },
    },
    colors: ['#3454d1', '#a2acc7', '#E1E3EA'],
    series: [
      { name: 'Total Lights', type: 'bar', data: lights },
      { name: 'Completed Panchayats', type: 'bar', data: completed },
      { name: 'Pending Panchayats', type: 'bar', data: pending },
    ],
    fill: {
      opacity: [0.85, 1, 1],
    },
    markers: { size: 0 },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '10px', colors: '#A0ACBB' },
        rotate: -45,
      },
    },
    yaxis: {
      labels: {
        offsetX: 0,
        offsetY: 0,
        style: { colors: '#A0ACBB' },
      },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { left: 20, right: 20 },
    },
    dataLabels: { enabled: false },
    tooltip: {
      style: { fontSize: '12px', fontFamily: 'Inter' },
    },
    legend: {
      show: true,
      labels: { fontSize: '12px', colors: '#A0ACBB' },
      fontSize: '12px',
      fontFamily: 'Inter',
    },
  }
  return chartOptions
}

const Card = ({ title, price, progress, bg_color }) => {
  return (
    <div className="col-lg-3">
      <div className="p-3 border border-dashed rounded">
        <div className="fs-12 text-muted mb-1">{title}</div>
        <h6 className="fw-bold text-dark">{price}</h6>
        <div className="progress mt-2 ht-3">
          <div className={`progress-bar ${bg_color}`} role="progressbar" style={{ width: progress }}></div>
        </div>
      </div>
    </div>
  )
}

const DistrictLightsChart = ({ districts, summary }) => {
  const chartOptions = districtLightsChartOption(districts)
  const totalCompleted = summary?.completed_panchayats ?? 0
  const totalPending = summary?.pending_panchayats ?? 0
  const totalPanchayats = totalCompleted + totalPending
  const completionPct = totalPanchayats ? Math.round((totalCompleted / totalPanchayats) * 100) : 0

  return (
    <div className="col-xxl-12">
      <div className="card stretch stretch-full">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title fw-bold text-dark mb-0">District-wise SSL Progress</h5>
          <Link to="#"><FiMoreVertical className="fs-16" /></Link>
        </div>
        <div className="card-body custom-card-action p-0">
          <ReactApexChart
            options={chartOptions}
            series={chartOptions.series}
            height={377}
          />
        </div>
        <div className="card-footer">
          <div className="row g-4">
            <Card bg_color={'bg-primary'} price={summary?.total_lights?.toLocaleString?.() ?? '-'} progress={'100%'} title={'Total Lights'} />
            <Card bg_color={'bg-success'} price={totalCompleted} progress={`${completionPct}%`} title={'Completed'} />
            <Card bg_color={'bg-danger'} price={totalPending} progress={`${100 - completionPct}%`} title={'Pending'} />
            <Card bg_color={'bg-dark'} price={summary?.total_district ?? '-'} progress={'100%'} title={'Districts'} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 3. DISTRICTS TABLE COMPONENT
// ==========================================
const DistrictsTable = ({ title, districts }) => {
  return (
    <div className="col-xxl-12">
      <div className="card stretch stretch-full">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title fw-bold text-dark mb-0">{title}</h5>
          <Link to="#"><FiMoreVertical className="fs-16" /></Link>
        </div>

        <div className="card-body custom-card-action p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr className="border-b">
                  <th scope="row">District</th>
                  <th>Blocks</th>
                  <th>Panchayats</th>
                  <th>Total Lights</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d, idx) => {
                  const pct = d.total_panchayats
                    ? Math.round((d.completed / d.total_panchayats) * 100)
                    : 0
                  const color = pct >= 50 ? 'success' : pct > 0 ? 'warning' : 'danger'

                  return (
                    <tr key={`${d.district}-${idx}`} className="chat-single-item">
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="text-white avatar-text user-avatar-text">
                            {d.district.trim().substring(0, 1)}
                          </div>
                          <a href="#">
                            <span className="d-block">{d.district.trim()}</span>
                          </a>
                        </div>
                      </td>
                      <td>{d.total_blocks}</td>
                      <td>{d.total_panchayats}</td>
                      <td>
                        <span className="badge bg-gray-200 text-dark">
                          {d.total_lights.toLocaleString()}
                        </span>
                      </td>
                      <td>{d.completed}</td>
                      <td>{d.pending}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress ht-3 w-100">
                            <div
                              className={`progress-bar bg-${color}`}
                              role="progressbar"
                              style={{ width: `${pct}%` }}
                            ></div>
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
        <div className="card-footer">
          <div className="d-flex justify-content-end">
            <span className="fs-12 text-muted">{districts.length} districts</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// 4. MAIN DASHBOARD COMPONENT
// ==========================================
const Dashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await localApi.get('/dle/bihar/ssl-amc/dashboard/district')

      if (res.data?.success) {
        setData(res.data)
      } else {
        setError(res.data?.message || 'Failed to load SSL AMC dashboard data.')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return (
    <div>
      <PageHeader>
        <PageHeaderDate />
      </PageHeader>

      <div className="main-content">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h4 className="fw-bold text-dark mb-0">AMC documentation - Bihar</h4>
                <p className="fs-13 text-muted">Overview of SSL site AMC documentation status</p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light-brand d-flex align-items-center gap-2"
                onClick={fetchDashboard}
                disabled={loading}
              >
                <FiRefreshCw className={loading ? 'spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {loading && (
            <div className="col-12">
              <div className="card stretch stretch-full">
                <div className="card-body text-center py-5">
                  <span className="fs-13 text-muted">Loading dashboard data...</span>
                </div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="col-12">
              <div className="card stretch stretch-full">
                <div className="card-body text-center py-5">
                  <p className="fs-13 text-danger mb-2">Failed to load data: {error}</p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={fetchDashboard}>
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              <SiteOverviewStatistics summary={data.summary} />
              <DistrictLightsChart districts={data.districts} summary={data.summary} />
              <DistrictsTable title={'District-wise AMC Status'} districts={data.districts} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard