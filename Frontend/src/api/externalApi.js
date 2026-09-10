import axios from 'axios'
import { getCompanyId } from '../utils/auth'
import { EXTERNAL_API_BASE } from './config'
import {
  filterExternalPayloadByUser,
  getDleAmcUserId,
} from '../utils/externalApiUser'

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
    const userId = getDleAmcUserId()

    config.params = {
      ...(config.params || {}),
    }

    if (companyId) {
      config.params.company_id = companyId
    }

    if (userId) {
      config.params.dle_amc_id = userId
      config.params.user_id = config.params.user_id ?? userId
    }

    return config
  },
  (error) => Promise.reject(error)
)

externalApi.interceptors.response.use(
  (response) => {
    const userId = getDleAmcUserId()

    if (response?.data && userId) {
      response.data = filterExternalPayloadByUser(response.data, userId)
    }

    return response
  },
  (error) => Promise.reject(error)
)

export { EXTERNAL_API_BASE }
export default externalApi
