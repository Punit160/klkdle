/* eslint-disable react/prop-types */

import { Link } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { FiMoreVertical } from 'react-icons/fi'
import PageHeaderDate from '@/components/shared/pageHeader/PageHeaderDate'
import PageHeader from '@/components/shared/pageHeader/PageHeader'


const SiteOverviewStatistics = () => {
  // Demo statistics data matching your exact layout
  const crmStatisticsData = [
    {
      id: "1",
      completed_number: "420",
      total_number: "500",
      title: "Installed SHL Systems",
      progress_info: "Completion",
      progress: "84%",
      icon: "sun"
    },
    {
      id: "2",
      completed_number: "380",
      total_number: "400",
      title: "Active Sites",
      progress_info: "Grid Status",
      progress: "95%",
      icon: "site"
    },
    {
      id: "3",
      completed_number: "145",
      total_number: "180",
      title: "Survey Proposals",
      progress_info: "Verified",
      progress: "80%",
      icon: "file"
    },
    {
      id: "4",
      completed_number: "310",
      total_number: "350",
      title: "Subsidy Approved",
      progress_info: "Disbursed",
      progress: "88%",
      icon: "check"
    }
  ];

  return (
    <>
      {crmStatisticsData.map(({ id, completed_number, progress, progress_info, title, total_number, icon }) => (
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
                      <span className="counter">{completed_number ? completed_number + "/" : ""}</span>
                      <span className="counter">{total_number}</span>
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
                    <span className="fs-12 text-dark">{progress_info}</span>{" "}
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
  );
};

// ==========================================
// 2. PAYMENT RECORD CHART CONFIG & COMPONENT
// ==========================================
export const paymentRecordChartOption = () => {
  const chartOptions = {
    chart: {
      width: "100%",
      stacked: !1,
      toolbar: {
        show: !1
      },
    },
    stroke: {
      width: [1, 2, 3],
      curve: "smooth",
      lineCap: "round"
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        borderRadiusApplication: "end",
        columnWidth: "29%"
      }
    },
    colors: ["#3454d1", "#a2acc7", "#E1E3EA"],
    series: [
      {
        name: "Payment Rejected",
        type: "bar",
        data: [23, 11, 22, 27, 13, 22, 37, 21, 44, 22, 30, 21]
      },
      {
        name: "Payment Completed",
        type: "line",
        data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43, 41]
      },
      {
        name: "Awaiting Payment",
        type: "bar",
        data: [44, 55, 41, 67, 22, 43, 21, 41, 56, 27, 43, 56]
      }
    ],
    fill: {
      opacity: [.85, .25, 1, 1],
      gradient: {
        inverseColors: !1,
        shade: "light",
        type: "vertical",
        opacityFrom: .5,
        opacityTo: .1,
        stops: [0, 100, 100, 100]
      }
    },
    markers: {
      size: 0
    },
    xaxis: {
      categories: ["JAN/23", "FEB/23", "MAR/23", "APR/23", "MAY/23", "JUN/23", "JUL/23", "AUG/23", "SEP/23", "OCT/23", "NOV/23", "DEC/23"],
      axisBorder: {
        show: !1
      },
      axisTicks: {
        show: !1
      },
      labels: {
        style: {
          fontSize: "10px",
          colors: "#A0ACBB"
        }
      },
    },
    yaxis: {
      labels: {
        formatter: function (e) {
          return +e + "K"
        },
        offsetX: 0,
        offsetY: 0,
        style: {
          colors: "#A0ACBB"
        }
      }
    },
    grid: {
      xaxis: {
        lines: {
          show: !1
        }
      },
      yaxis: {
        lines: {
          show: !1
        }
      },
      padding: {
        left: 35,
        right: 28
      },
    },
    dataLabels: {
      enabled: !1
    },
    tooltip: {
      y: {
        formatter: function (e) {
          return +e + "K"
        }
      },
      style: {
        fontSize: "12px",
        fontFamily: "Inter"
      }
    },
    legend: {
      show: !1,
      labels: {
        fontSize: "12px",
        colors: "#A0ACBB"
      },
      fontSize: "12px",
      fontFamily: "Inter"
    }
  };
  return chartOptions;
};

const Card = ({ title, price, progress, bg_color }) => {
  return (
    <div className="col-lg-3">
      <div className="p-3 border border-dashed rounded">
        <div className="fs-12 text-muted mb-1">{title}</div>
        <h6 className="fw-bold text-dark">${price}</h6>
        <div className="progress mt-2 ht-3">
          <div className={`progress-bar ${bg_color}`} role="progressbar" style={{ width: progress }}></div>
        </div>
      </div>
    </div>
  );
};

const PaymentRecordChart = () => {
  const chartOptions = paymentRecordChartOption();

  return (
    <div className="col-xxl-12">
      <div className="card stretch stretch-full">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title fw-bold text-dark mb-0">Payment Record</h5>
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
            <Card bg_color={"bg-primary"} price={"5,486"} progress={"81%"} title={"Awaiting"} />
            <Card bg_color={"bg-success"} price={"9,275"} progress={"81%"} title={"Completed"} />
            <Card bg_color={"bg-danger"} price={"3,868"} progress={"81%"} title={"Rejected"} />
            <Card bg_color={"bg-dark"} price={"50,668"} progress={"81%"} title={"Revenue"} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. LATEST LEADS TABLE COMPONENT
// ==========================================
const userList = [
  {
    id: 1,
    user_name: "Rajesh Sharma",
    user_email: "rajesh@example.com",
    proposal: "300W SHL Kit",
    date: "01 Aug 2026",
    user_status: "Approved",
    color: "success",
    user_img: ""
  },
  {
    id: 2,
    user_name: "Priya Verma",
    user_email: "priya@example.com",
    proposal: "500W SHL Solar System",
    date: "03 Aug 2026",
    user_status: "Pending",
    color: "warning",
    user_img: ""
  },
  {
    id: 3,
    user_name: "Amit Patel",
    user_email: "amit@example.com",
    proposal: "150W Compact SHL",
    date: "04 Aug 2026",
    user_status: "In Progress",
    color: "primary",
    user_img: ""
  },
  {
    id: 4,
    user_name: "Sunita Devi",
    user_email: "sunita@example.com",
    proposal: "400W Rural Light Kit",
    date: "05 Aug 2026",
    user_status: "Rejected",
    color: "danger",
    user_img: ""
  }
];

const LatestLeads = ({ title }) => {
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
                  <th scope="row">Users</th>
                  <th>Proposal</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.map(({ date, id, proposal, user_email, user_img, user_name, user_status, color }) => (
                  <tr key={id} className="chat-single-item">
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        {user_img ? (
                          <div className="avatar-image">
                            <img src={user_img} alt="user-img" className="img-fluid" />
                          </div>
                        ) : (
                          <div className="text-white avatar-text user-avatar-text">
                            {user_name.substring(0, 1)}
                          </div>
                        )}
                        <a href="#">
                          <span className="d-block">{user_name}</span>
                          <span className="fs-12 d-block fw-normal text-muted">{user_email}</span>
                        </a>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-gray-200 text-dark">{proposal}</span>
                    </td>
                    <td>{date}</td>
                    <td>
                      <span className={`badge bg-soft-${color} text-${color}`}>{user_status}</span>
                    </td>
                    <td className="text-end">
                      <Link to="#"><FiMoreVertical size={16} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer">
          {/* Pagination Placeholder */}
          <div className="d-flex justify-content-end">
            <span className="fs-12 text-muted">Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN SINGLE DASHBOARD COMPONENT
// ==========================================
const DLEDashboard = () => {
  return (
    <div>
      <PageHeader>
        <PageHeaderDate />
      </PageHeader>


      <div className='main-content'>
        <div className="row">
          <div className="col-12">
            <div className="">
              <h4 className="fw-bold text-dark mb-0"> Dashboard</h4>
              <p className="fs-13 text-muted">Overview site AMC documentation status</p>
            </div>
          </div>
          <SiteOverviewStatistics />
          <PaymentRecordChart />
          <LatestLeads title={"Latest Leads"} />
        </div>
      </div>
    </div>
  );
};

export default DLEDashboard;