import axios from 'axios'
import { getToken, getCompanyId, clearAuthData } from '../utils/auth'
import { APP_API_BASE } from './config'
import { app } from './routes'

export const LOCAL_API_BASE = APP_API_BASE
export const AUTH_PREFIX = '/api/auth'

const localApi = axios.create({
    baseURL: LOCAL_API_BASE || undefined,
    timeout: 60000,
})

localApi.interceptors.request.use(
    (config) => {
        const token = getToken()
        const companyId = getCompanyId()

        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }

        if (companyId) {
            config.params = {
                ...(config.params || {}),
                company_id: companyId,
            }
        }

        return config
    },
    (error) => Promise.reject(error)
)

localApi.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status
        const url = String(error.config?.url || '')
        const isAuthAttempt =
            url.includes(app.auth.login) ||
            url.includes(app.auth.register)

        if (status === 401 && !isAuthAttempt) {
            clearAuthData()
            if (!window.location.pathname.startsWith('/authentication/login')) {
                window.location.href = '/authentication/login/'
            }
        }
        return Promise.reject(error)
    }
)

export default localApi
