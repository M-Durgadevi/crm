import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('crms_token')) {
      localStorage.removeItem('crms_token')
      localStorage.removeItem('crms_refresh')
      localStorage.removeItem('crms_user')
      if (window.location.pathname !== '/login') window.location.replace('/login')
    }
    return Promise.reject(error)
  },
)

export default api
