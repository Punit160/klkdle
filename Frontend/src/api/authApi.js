import axiosInstance from './axiosInstance'


export const loginUser = async (email, password) => {
    const response = await axiosInstance.post('/login', { email, password })
    return response.data // { success, message, token, user }
}   