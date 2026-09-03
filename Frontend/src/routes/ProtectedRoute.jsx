/* eslint-disable react/prop-types */
import { Navigate } from 'react-router-dom'
import { isAuthenticated } from '@/utils/auth'
import { pages } from '../api/routes'

// Wrap any private layout/page with this, e.g.:
// element: <ProtectedRoute><RootLayout /></ProtectedRoute>
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to={pages.login} replace />
    }
    return children
}

export default ProtectedRoute