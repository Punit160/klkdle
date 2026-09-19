import { Navigate } from 'react-router-dom'
import { pages } from '../api/routes'
import { getUser } from '../utils/auth'
import { getStateLabel, userHasStateAccess } from '../utils/stateAccess'
import { usePunchInStatus } from '../hooks/usePunchInStatus'
import CardLoader from '../components/shared/CardLoader'
import PunchInRedirect from './PunchInRedirect'

const StateRoute = ({ stateKey, children }) => {
  const user = getUser()
  const { loading, isPunchedIn } = usePunchInStatus()

  if (!userHasStateAccess(user, stateKey)) {
    return <Navigate to={pages.dashboard} replace />
  }

  if (loading) {
    return (
      <div className="main-content py-5">
        <CardLoader />
      </div>
    )
  }

  if (!isPunchedIn) {
    return <PunchInRedirect stateLabel={getStateLabel(user)} />
  }

  return children
}

export default StateRoute
