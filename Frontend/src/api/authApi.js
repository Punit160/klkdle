import localApi from './localApi'
import { app } from './routes'

export const loginUser = async (email, password) => {
    const response = await localApi.post(app.auth.login, { email, password })
    return response.data
}
