import apiClient from './client'

export const devicesAPI = {
  getDevices: (params) => apiClient.get('/devices/', { params }),
  getDevice: (id) => apiClient.get(`/devices/${id}/`),
  createDevice: (data) => apiClient.post('/devices/', data),
  updateDevice: (id, data) => apiClient.patch(`/devices/${id}/`, data),
  deleteDevice: (id) => apiClient.delete(`/devices/${id}/`),
  getDeviceStatus: (id) => apiClient.get(`/devices/${id}/status/`),
  syncStudents: (id) => apiClient.post(`/devices/${id}/sync/`),
  pullLogs: (id) => apiClient.post(`/devices/${id}/pull-logs/`),
  getSyncLogs: (id) => apiClient.get(`/devices/${id}/sync-logs/`),
  getAllSyncLogs: (params) => apiClient.get('/device-sync-logs/', { params }),
}
