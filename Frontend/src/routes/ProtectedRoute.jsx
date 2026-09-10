 
import { Navigate } from 'react-router-dom'
import { clearAuthData, isAuthenticated } from '@/utils/auth'
import { pages } from '../api/routes'

// Wrap any private layout/page with this, e.g.:
// element: <ProtectedRoute><RootLayout /></ProtectedRoute>
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        clearAuthData()
        return <Navigate to={pages.login} replace />
    }
    return children
}

export default ProtectedRoute