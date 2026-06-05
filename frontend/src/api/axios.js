import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      // Suppress toast for background/config calls that may fail due to role mismatch
      const url = error.config?.url || ''
      const silent = error.config?.silent403 || url.includes('/companies?') || url.includes('/report-permissions')
      if (!silent) toast.error('Sem permissão para esta ação')
    } else if (error.response?.status >= 500) {
      toast.error('Erro interno do servidor')
    }
    return Promise.reject(error)
  }
)

export default api
