import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiCalendar,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSun,
  FiUser,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import AttendanceWidget from './AttendanceWidget'
import { pages } from '../../api/routes'
import { getUser } from '../../utils/auth'
import { getStateHubSections, getStateLabel } from '../../utils/stateAccess'
import '../../styles/DLE/dle-dashboard.css'

const ICONS = {
  dashboard: FiSun,
  upload: FiFileText,
  field: FiMapPin,
}

const ProfileField = ({ label, value }) => (
  <div className="profile-field">
    <span>{label}</span>
    <strong>{value || '—'}</strong>
  </div>
)

const DLEDashboard = () => {
  const user = getUser()
  const stateSections = getStateHubSections(user)
  const todayLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div>
      <PageHeader>
        <div />
      </PageHeader>

      <div className="main-content dashboard-home">
        <div className="card stretch stretch-full dashboard-welcome-card">
          <div className="card-body">
            <div className="dashboard-welcome-inner">
              <div className="dashboard-welcome-left">
                <div className="dashboard-welcome-icon">
                  <FiSun size={22} />
                </div>
                <div className="dashboard-welcome-text">
                  <span className="dashboard-welcome-date">{todayLabel}</span>
                  <h3>Welcome back, {user?.name || 'User'}</h3>
                  <p>
                    Manage your daily attendance, profile, and {getStateLabel(user)} operations from one place.
                  </p>
                </div>
              </div>
              <div className="dashboard-welcome-actions">
                <Link to={pages.attendance} className="btn btn-primary d-inline-flex align-items-center gap-2">
                  <FiCalendar size={15} /> Attendance Report
                </Link>
                <Link to={pages.profile} className="btn btn-light-brand d-inline-flex align-items-center gap-2">
                  <FiUser size={15} /> My Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-xxl-4 col-lg-5">
            <div className="card stretch stretch-full profile-summary-card">
              <div className="card-body">
                <div className="profile-summary-head">
                  <div className="profile-avatar">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-1">{user?.name || 'User'}</h5>
                    <p className="fs-12 text-muted mb-0">{user?.email || '—'}</p>
                    <span className="profile-state-pill">{getStateLabel(user)}</span>
                  </div>
                </div>

                <div className="profile-summary-grid">
                  <ProfileField label="District" value={user?.district} />
                  <ProfileField label="Block" value={user?.block} />
                  <ProfileField label="Panchayat" value={user?.panchayat} />
                  <ProfileField label="Contact" value={user?.contact_no} />
                </div>

                <div className="profile-contact-list">
                  <div><FiMail size={14} /> {user?.email || '—'}</div>
                  <div><FiPhone size={14} /> {user?.contact_no || '—'}</div>
                  <div><FiMapPin size={14} /> {user?.address || 'Address not added'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xxl-8 col-lg-7">
            <AttendanceWidget showReportLink />
          </div>
        </div>

        {stateSections.map((section) => (
          <div key={section.title} className="dashboard-module-section">
            <div className="dashboard-module-head">
              <h5 className="fw-semibold text-dark mb-0">{section.title}</h5>
              <p className="fs-12 text-muted mb-0">Quick access to your assigned modules</p>
            </div>

            <div className="row g-3">
              {section.items.map((item, index) => {
                const Icon = index === 0 ? ICONS.dashboard : index === 1 ? ICONS.upload : ICONS.field

                return (
                  <div key={item.path} className="col-xxl-4 col-md-6">
                    <Link to={item.path} className="text-decoration-none">
                      <div className="hub-link-card">
                        <div className="hub-link-icon">
                          <Icon size={18} />
                        </div>
                        <div className="hub-link-body">
                          <h6>{item.label}</h6>
                          <p>{item.desc}</p>
                        </div>
                        <FiArrowRight className="hub-link-arrow" />
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DLEDashboard
