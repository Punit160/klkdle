import axios from 'axios'
import { getCompanyId } from '../utils/auth'
import { EXTERNAL_API_BASE } from './config'

const externalApi = axios.create({
  baseURL: EXTERNAL_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
})

externalApi.interceptors.request.use(
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

export { EXTERNAL_API_BASE }
export default externalApi
