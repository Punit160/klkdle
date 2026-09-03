/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { FiLogOut, FiUser } from "react-icons/fi"
import { joinUrl, APP_API_BASE } from "../../../api/config"
import { app } from "../../../api/routes"
import { clearAuthData } from "../../../utils/auth"

const getInitials = (name = "") => {
    if (!name) return "U"

    const parts = name.trim().split(/\s+/)

    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase()
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase()
}

const ProfileModal = () => {
    const navigate = useNavigate()

    const [loggingOut, setLoggingOut] = useState(false)
    const [user, setUser] = useState(null)

    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = localStorage.getItem("user")

                if (storedUser) {
                    setUser(JSON.parse(storedUser))
                    return
                }

                const token = localStorage.getItem("token")

                if (!token) return

                const response = await fetch(
                    joinUrl(APP_API_BASE, app.auth.profile),
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                const data = await response.json()

                if (response.ok && data?.user) {
                    setUser(data.user)
                    localStorage.setItem(
                        "user",
                        JSON.stringify(data.user)
                    )
                }
            } catch (error) {
                console.error("Failed to load user profile:", error)
            }
        }

        loadUser()
    }, [])


  const handleLogout = async (e) => {
    e.preventDefault();

    if (loggingOut) return;

    setLoggingOut(true);

    try {
        const token = localStorage.getItem("token");

        const response = await fetch(
            joinUrl(APP_API_BASE, app.auth.logout),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token && {
                        Authorization: `Bearer ${token}`,
                    }),
                },
            }
        );

        const data = await response.json();

        console.log("Logout response:", data);

        // Remove login data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("dleUser");
        clearAuthData();

        // Go to login page
        navigate("/authentication/login/", {
            replace: true,
        });

    } catch (error) {
        console.error("Logout error:", error);

        // Remove login data even if backend is unavailable
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("dleUser");
        clearAuthData();

        navigate("/authentication/login/", {
            replace: true,
        });

    } finally {
        setLoggingOut(false);
    }
};

    const initials = useMemo(
        () => getInitials(user?.name),
        [user]
    )

    const imageUrl = user?.image_url || null


    const handleProfile = (e) => {
        e.preventDefault()
        navigate("/dle/user-profile")
    }

    return (
        <div className="dropdown nxl-h-item">
            <a
                href="#"
                data-bs-toggle="dropdown"
                role="button"
                data-bs-auto-close="outside"
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="user-image"
                        className="rounded-circle"
                        style={{
                            width: 38,
                            height: 38,
                            objectFit: "cover",
                            flexShrink: 0,
                        }}
                    />
                ) : (
                    <div
                        className="user-avtar me-0 d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-semibold"
                        style={{
                            width: 40,
                            height: 40,
                            fontSize: 14,
                        }}
                    >
                        {initials}
                    </div>
                )}
            </a>

            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-user-dropdown">
                <div className="dropdown-header">
                    <div className="d-flex align-items-center">
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="user-image"
                                className="rounded-circle mx-2"
                                style={{
                                    width: 50,
                                    height: 50,
                                    objectFit: "cover",
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <div
                                className="user-avtar d-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-semibold"
                                style={{
                                    width: 45,
                                    height: 45,
                                    fontSize: 16,
                                }}
                            >
                                {initials}
                            </div>
                        )}

                        <div>
                            <h6 className="text-dark mb-0">
                                {user?.name || "User"}

                                <span className="badge bg-soft-success text-success ms-1">
                                    PRO
                                </span>
                            </h6>

                            <span className="fs-12 fw-medium text-muted">
                                {user?.email || "-"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="dropdown">
                    <a
                        href="#"
                        className="dropdown-item"
                        data-bs-toggle="dropdown"
                    >
                        <span className="hstack">
                            <i
                                className={`wd-10 ht-10 border border-2 border-gray-1 rounded-circle me-2 ${Number(user?.status) === 1
                                    ? "bg-success"
                                    : "bg-danger"
                                    }`}
                            ></i>

                            <span>
                                {Number(user?.status) === 1
                                    ? "Active"
                                    : "Inactive"}
                            </span>
                        </span>
                    </a>
                </div>

                <div className="dropdown-divider"></div>

                <a
                    href="#"
                    className="dropdown-item"
                    onClick={handleProfile}
                >
                    <i>
                        <FiUser />
                    </i>

                    <span>Profile Details</span>
                </a>

                <div className="dropdown-divider"></div>

                <a
                    href="#"
                    className="dropdown-item"
                    onClick={handleLogout}
                >
                    <i>
                        <FiLogOut />
                    </i>

                    <span>
                        {loggingOut
                            ? "Logging out..."
                            : "Logout"}
                    </span>
                </a>
            </div>
        </div>
    )
}

export default ProfileModal