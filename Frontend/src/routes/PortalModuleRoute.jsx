import { Navigate } from 'react-router-dom'
import { getUser } from '../utils/auth'
import { pages } from '../api/routes'
import StateRoute from './StateRoute'
import { userCanAccessPagePath } from '../utils/portalModuleAccess'

const PortalModuleRoute = ({ stateKey, pagePath, children }) => {
  const user = getUser()
  if (!userCanAccessPagePath(user, pagePath)) {
    return <Navigate to={pages.dashboard} replace />
  }
  if (stateKey) {
    return <StateRoute stateKey={stateKey}>{children}</StateRoute>
  }
  return children
}

export default PortalModuleRoute
