/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser } from '../../api/authApi'
import { saveAuthData } from '../../utils/auth'

const LoginForm = ({ registerPath, resetPath }) => {
    const navigate = useNavigate()

    const [loginType, setLoginType] = useState('user') 
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleTabChange = (type) => {
        setLoginType(type)
        setFormData({ email: '', password: '' })
        setError('')
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (error) setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.email || !formData.password) {
            setError('Please enter both email and password.')
            return
        }

        setLoading(true)
        try {
            const data = await loginUser(formData.email, formData.password, loginType)

            if (data.success) {
                saveAuthData(data.token, data.user)
           navigate('/DLE/dashboard', { replace: true })
            } else {
                setError(data.message || 'Login failed. Please try again.')
            }
        } catch (err) {
            const message =
                err.response?.data?.message ||
                'Unable to login. Please check your credentials and try again.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Welcome Back</h2>

            <h4 className="fs-14 fw-bold mb-2">
                Solar Panel ERP System
            </h4>

            <p className="fs-12 text-muted mb-0">
                Log in to manage solar projects, production, inventory, dispatch,
                installation, warranty, AMC services, and document management through
                the centralized ERP platform.
            </p>

            {/* User / Vendor Tabs */}
            <ul className="nav nav-tabs mt-4" role="tablist">
                <li className="nav-item flex-fill text-center" role="presentation">
                    <button
                        type="button"
                        className={`nav-link w-100 ${loginType === 'user' ? 'active' : ''}`}
                        onClick={() => handleTabChange('user')}
                    >
                        User Login
                    </button>
                </li>
                <li className="nav-item flex-fill text-center" role="presentation">
                    <button
                        type="button"
                        className={`nav-link w-100 ${loginType === 'vendor' ? 'active' : ''}`}
                        onClick={() => handleTabChange('vendor')}
                    >
                        Vendor Login
                    </button>
                </li>
            </ul>

            {error && (
                <div className="alert alert-danger fs-12 py-2 px-3 mt-3 mb-0" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder={loginType === 'vendor' ? 'Vendor Email or Username' : 'Email or Username'}
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="password"
                        name="password"
                        className="form-control"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="custom-control custom-checkbox">
                            <input type="checkbox" className="custom-control-input" id="rememberMe" />
                            <label className="custom-control-label c-pointer" htmlFor="rememberMe">Remember Me</label>
                        </div>
                    </div>
                </div>
                <div className="mt-5">
                    <button type="submit" className="btn btn-lg btn-primary w-100" disabled={loading}>
                        {loading
                            ? 'Logging in...'
                            : loginType === 'vendor'
                                ? 'Login as Vendor'
                                : 'Login as User'}
                    </button>
                </div>
            </form>
        </>
    )
}

export default LoginForm