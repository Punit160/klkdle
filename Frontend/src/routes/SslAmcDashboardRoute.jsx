import { Navigate } from 'react-router-dom'
import { getUser } from '../utils/auth'
import { pages } from '../api/routes'
import StateRoute from './StateRoute'
import { userCanAccessSslAmcDashboard } from '../utils/stateAccess'

const SslAmcDashboardRoute = ({ region, children }) => {
  const user = getUser()
  if (!userCanAccessSslAmcDashboard(user, region)) {
    return <Navigate to={pages.dashboard} replace />
  }
  return <StateRoute stateKey={region}>{children}</StateRoute>
}

export default SslAmcDashboardRoute
