import { apiRootClient } from './client'

// Backend kontrakti: /api/cameras va /api/camera-events (V1 prefiksi YO'Q —
// bu kontroller SecurityConfig'dagi umumiy anyRequest().authenticated() ostida,
// lekin V1* API oilasiga kiritilmagan). Shu sabab apiRootClient (baseURL: /api)
// ishlatiladi, apiClient (baseURL: /api/v1) emas.
export const camerasAPI = {
  getCameras: (params) => apiRootClient.get('/cameras', { params }),
  getCamera: (id) => apiRootClient.get(`/cameras/${id}`),
  createCamera: (data) => apiRootClient.post('/cameras', data),
  updateCamera: (id, data) => apiRootClient.put(`/cameras/${id}`, data),
  deleteCamera: (id) => apiRootClient.delete(`/cameras/${id}`),

  getCameraEvents: (cameraId) => apiRootClient.get(`/cameras/${cameraId}/events`),
  createCameraEvent: (cameraId, data) => apiRootClient.post(`/cameras/${cameraId}/events`, data),

  getAllEvents: (params) => apiRootClient.get('/camera-events', { params }),
  updateCameraEvent: (id, data) => apiRootClient.patch(`/camera-events/${id}`, data),

  getEventStats: (params) => apiRootClient.get('/camera-events/stats', { params }),

  // Masofadan boshqariladigan kamera (brend+IP+login) — VPN orqali
  getSnapshot: (id) => apiRootClient.get(`/cameras/${id}/snapshot`, { responseType: 'blob' }),
  check: (id) => apiRootClient.post(`/cameras/${id}/check`, {}),
  getStream: (id) => apiRootClient.get(`/cameras/${id}/stream`),
}
