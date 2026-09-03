import axios from 'axios'
import { getToken, getCompanyId, clearAuthData } from '../utils/auth'

export const LOCAL_API_BASE = String(import.meta.env.VITE_BASE_URL || '').replace(/\/$/, '')

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
        if (error.response?.status === 401) {
            clearAuthData()
            if (!window.location.pathname.startsWith('/authentication/login')) {
                window.location.href = '/authentication/login/'
            }
        }
        return Promise.reject(error)
    }
)

export default localApi
