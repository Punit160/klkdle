import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import NavigationManu from '@/components/shared/navigationMenu/NavigationMenu'
import Header from '@/components/shared/header/Header'
import useBootstrapUtils from '@/hooks/useBootstrapUtils'
import Footer from '../components/shared/Footer'
import PunchInFirstModalHost from '../components/shared/PunchInFirstModal'
import localApi from '../api/localApi'
import { app } from '../api/routes'
import { getToken, getUser, saveAuthData, isAuthenticated } from '../utils/auth'
import { refreshSessionToken } from '../api/authSession'


const RootLayout = () => {
    const pathName = useLocation().pathname
    useBootstrapUtils(pathName)

    useEffect(() => {
        const user = getUser()
        const token = getToken()
        if (!user?.id || !token || !isAuthenticated()) return

        refreshSessionToken({ force: true })
            .catch(() => {})
            .finally(() => {
        localApi
            .get(app.auth.profile, { params: { userId: user.id } })
            .then((res) => {
                if (res.data?.user) {
                    const next = {
                        ...user,
                        ...res.data.user,
                        role: Number(res.data.user.role ?? user.role ?? 2),
                    }
                    if (res.data.user.portal_permissions != null) {
                        next.portal_permissions = res.data.user.portal_permissions
                    }
                    saveAuthData(getToken(), next)
                }
            })
            .catch(() => {})
            })
    }, [])

    return (
        <>
            <PunchInFirstModalHost />
            <Header />
            <NavigationManu />
            <main
                className="nxl-container"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                }}
            >
                <div
                    className="nxl-content"
                    style={{
                        flex: '1 0 auto',
                    }}
                >
                    <Outlet />
                </div>

                <Footer />
            </main>
        </>
    )
}

export default RootLayout