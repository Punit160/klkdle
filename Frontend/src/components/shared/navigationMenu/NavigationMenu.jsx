/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiLogOut } from "react-icons/fi";
import PerfectScrollbar from "react-perfect-scrollbar";
import Menus from './Menus';
import { NavigationContext } from '../../../contentApi/navigationProvider';
import { LOCAL_API_BASE } from '../../../api/localApi'
import { clearAuthData } from '../../../utils/auth'

const BASE_URL = LOCAL_API_BASE


const getInitials = (name = "") => {
    if (!name) return "U"
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const NavigationManu = () => {
    const { navigationOpen, setNavigationOpen } = useContext(NavigationContext)
    const pathName = useLocation().pathname
    const navigate = useNavigate()
    const [loggingOut, setLoggingOut] = useState(false)
    const [user, setUser] = useState(null)

    useEffect(() => {
        setNavigationOpen(false)
    }, [pathName])

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem("user")
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage:", error)
        }
    }, [])

    const initials = useMemo(() => getInitials(user?.name), [user])

const imageUrl = user?.image_url || null

    const handleLogout = async (e) => {
        e.preventDefault()

        if (loggingOut) return
        setLoggingOut(true)

        try {
            const token = localStorage.getItem("token")

            await fetch(`${BASE_URL}/klkdle/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            })
        } catch (error) {
            console.error("Logout API failed:", error)
        } finally {
            localStorage.clear()
            clearAuthData()
            setLoggingOut(false)
            navigate("/authentication/login/")
        }
    }

    return (
        <nav className={`nxl-navigation ${navigationOpen ? "mob-navigation-active" : ""}`}>
            <div className="navbar-wrapper" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div className="m-header">
                    <Link to="/bihar/ssl/dashboard" className="b-brand">
                        <img src="/images/logo-full.png" alt="logo" className="logo logo-lg w-50" />
                        <img src="/images/logo-abbr.png" alt="logo" className="logo logo-sm" />
                    </Link>
                </div>

                <div className="navbar-content" style={{ flex: 1, overflow: "hidden" }}>
                    <PerfectScrollbar>
                  
                        <ul className="nxl-navbar mb-3">
                            <Menus />
                        </ul>
                    </PerfectScrollbar>
                </div>

                <div
                    className="card mb-0"
                    style={{ flexShrink: 0, padding: "10px" }}
                >
                    <div className="d-flex align-items-center" style={{ gap: "10px" }}>
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="user-image"
                                className="rounded-circle"
                                style={{ width: 38, height: 38, objectFit: "cover", flexShrink: 0 }}
                            />
                        ) : (
                            <div
                                className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-semibold"
                                style={{ width: 38, height: 38, fontSize: 14, flexShrink: 0 }}
                            >
                                {initials}
                            </div>
                        )}

                        <div style={{ overflow: "hidden", flex: 1 }}>
                            <h6
                                className="text-dark mb-0"
                                style={{
                                    fontSize: 13,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {user?.name || "User"}
                            </h6>
                            <span
                                className="fs-11 text-muted"
                                style={{
                                    display: "block",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {user?.email || "-"}
                            </span>
                        </div>

                        <Link
                            to="#"
                            onClick={handleLogout}
                            title="Logout"
                            className="d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                                width: 30,
                                height: 30,
                                flexShrink: 0,
                                backgroundColor: "#f5f5f5",
                                pointerEvents: loggingOut ? "none" : "auto",
                                opacity: loggingOut ? 0.6 : 1,
                            }}
                        >
                            <FiLogOut size={15} />
                        </Link>
                    </div>
                </div>
            </div>
            <div onClick={() => setNavigationOpen(false)} className={`${navigationOpen ? "nxl-menu-overlay" : ""}`}></div>
        </nav>
    )
}

export default NavigationManu