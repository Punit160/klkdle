import axios from 'axios'
import { getCompanyId } from '../utils/auth'

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 20000,
})

axiosInstance.interceptors.request.use(
    (config) => {
        const companyId = getCompanyId()

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

export default axiosInstance
