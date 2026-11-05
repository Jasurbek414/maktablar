import axios from 'axios'

// "??" ishlatiladi, chunki bo'sh satr ("" — bir xil origin/nisbiy yo'l degani)
// JavaScript'da "yolg'on" qiymat hisoblanadi va "||" bilan standart qiymatga
// almashtirilib ketardi.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor - JWT token qo'shish
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - 401 da token yangilash
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Login va refresh endpointlarini interceptordan o'tkazmaymiz
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login/') ||
                           originalRequest.url?.includes('/auth/refresh/')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh/`, {
            refresh: refreshToken,
          })
          localStorage.setItem('access_token', data.access)
          originalRequest.headers.Authorization = `Bearer ${data.access}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
