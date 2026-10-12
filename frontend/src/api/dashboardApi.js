import api from './axiosInstance'

export const getDashboardSummary = () => api.get('/crm/dashboard/')
