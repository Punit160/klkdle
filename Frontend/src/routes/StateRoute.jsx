import { getUser } from '../utils/auth'
import { userIsAdmin } from '../utils/userRoles'
import { getFieldModulesPunchInLabel } from '../utils/stateAccess'
import { usePunchInStatus } from '../hooks/usePunchInStatus'
import CardLoader from '../components/shared/CardLoader'
import PunchInRedirect from './PunchInRedirect'

const StateRoute = ({ children }) => {
  const user = getUser()
  const { loading, isPunchedIn } = usePunchInStatus()

  if (loading) {
    return (
      <div className="main-content py-5">
        <CardLoader />
      </div>
    )
  }

  if (!isPunchedIn && !userIsAdmin(user)) {
    return <PunchInRedirect stateLabel={getFieldModulesPunchInLabel(user)} />
  }

  return children
}

export default StateRoute
