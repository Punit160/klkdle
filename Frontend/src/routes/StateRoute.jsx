import { Navigate } from 'react-router-dom'
import { pages } from '../api/routes'
import { getUser } from '../utils/auth'
import { userHasStateAccess } from '../utils/stateAccess'

const StateRoute = ({ stateKey, children }) => {
  const user = getUser()

  if (!userHasStateAccess(user, stateKey)) {
    return <Navigate to={pages.dashboard} replace />
  }

  return children
}

export default StateRoute
