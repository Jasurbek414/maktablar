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

// Kameralar (Camera/CameraEvent) backend'da faqat oddiy /api/* prefiksi ostida
// mavjud (V1* kontraktiga kiritilmagan) — shu sabab /api/v1 bazaviy yo'lini
// chetlab o'tadigan alohida klient kerak. Token/refresh interceptorlari xuddi
// asosiy apiClient'dagidek qo'llaniladi, faqat baseURL farq qiladi.
export const apiRootClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// MUHIM (2026-09-18 audit):
// 1) Backend har refresh'da ESKI refresh tokenni bekor qilib, YANGISINI qaytaradi
//    (V1AuthController#refresh, bir martalik/rotating token). Avval bu yerda faqat
//    data.access saqlanardi — ikkinchi marta 401 kelganda ESKI (endi bekor qilingan)
//    refresh_token bilan urinilib, majburan logout bo'lardi.
// 2) Panel /spd bazaviy yo'lida ishlaydi, lekin logout '/login'ga (asosiy sayt) yo'naltirardi.
// 3) Bir vaqtda bir nechta so'rov 401 olsa, HAR BIRI alohida refresh so'rovi yuborardi —
//    birinchisi eskisini bekor qilib yangisini olgach, qolganlari ALLAQACHON eskirgan
//    tokenni ishlatib xato beradi. Endi bitta umumiy "in-flight" promise orqali faqat
//    BITTA refresh so'rovi ketadi, qolganlari shu natijani kutadi.
let refreshPromise = null

function redirectToLogin() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/spd/login'
}

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return Promise.reject(new Error('no refresh token'))
  refreshPromise = axios.post(`${BASE_URL}/api/v1/auth/refresh/`, { refresh: refreshToken })
    .then(({ data }) => {
      localStorage.setItem('access_token', data.access)
      if (data.refresh) localStorage.setItem('refresh_token', data.refresh)
      return data.access
    })
    .finally(() => { refreshPromise = null })
  return refreshPromise
}

apiRootClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiRootClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const newAccess = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return apiRootClient(originalRequest)
      } catch (refreshError) {
        redirectToLogin()
      }
    }
    return Promise.reject(error)
  }
)

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
      try {
        const newAccess = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        redirectToLogin()
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
