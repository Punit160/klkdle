import axios from 'axios'
import { getToken, getCompanyId, clearAuthData } from '../utils/auth'

export const LOCAL_API_BASE = String(import.meta.env.VITE_BASE_URL || '').replace(/\/$/, '')
export const AUTH_PREFIX = '/dle/auth'

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
        const isAuthAttempt = url.includes('/dle/auth/login') || url.includes('/dle/auth/register')

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
