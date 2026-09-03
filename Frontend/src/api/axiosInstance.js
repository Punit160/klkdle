import axios from 'axios'
import { getToken, getCompanyId, clearAuthData } from '../utils/auth'

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 20000,
})

axiosInstance.interceptors.request.use(
    (config) => {
        const token = getToken()
        const companyId = getCompanyId()

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        // Company ID automatically add ho jayega query params mein
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

axiosInstance.interceptors.response.use(
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

export default axiosInstance