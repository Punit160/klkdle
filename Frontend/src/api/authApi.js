import localApi from './localApi'

export const loginUser = async (email, password) => {
    const response = await localApi.post('/klkdle/auth/login', { email, password })
    return response.data
}
