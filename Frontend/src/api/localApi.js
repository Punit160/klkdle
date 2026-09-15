import axios from 'axios'
import { getToken, getCompanyId, getUser, clearAuthData } from '../utils/auth'
import { APP_API_BASE } from './config'
import { app, pages } from './routes'

export const LOCAL_API_BASE = APP_API_BASE
export const AUTH_PREFIX = '/api/auth'

const localApi = axios.create({
    baseURL: LOCAL_API_BASE || undefined,
    timeout: 60000,
})

const isAuthRequest = (url = '') =>
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register')

localApi.interceptors.request.use(
    (config) => {
        const requestUrl = String(config.url || '')
        const skipAuthContext = isAuthRequest(requestUrl)

        config.params = {
            ...(config.params || {}),
        }

        if (skipAuthContext) {
            return config
        }

        const token = getToken()
        const companyId = getCompanyId()
        const user = getUser()
        const userId = user?.id ?? user?.user_id ?? null

        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }

        if (companyId) {
            config.params.company_id = companyId
        }

        if (userId && config.params.user_id == null) {
            config.params.user_id = String(userId)
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
            if (!window.location.pathname.startsWith(pages.login)) {
                window.location.href = pages.login
            }
        }
        return Promise.reject(error)
    }
)

export default localApi
