import { Outlet, useLocation } from 'react-router-dom'
import NavigationManu from '@/components/shared/navigationMenu/NavigationMenu'
import Header from '@/components/shared/header/Header'
import useBootstrapUtils from '@/hooks/useBootstrapUtils'
import Footer from '../components/shared/Footer'


const RootLayout = () => {
    const pathName = useLocation().pathname
    useBootstrapUtils(pathName)

    return (
        <>
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