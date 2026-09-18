import apiClient, { apiRootClient } from './client'

export const attendanceAPI = {
  getAttendance: (params) => apiClient.get('/attendance/', { params }),
  getStatistics: (params) => apiClient.get('/attendance/statistics/', { params }),
  getToday: (params) => apiClient.get('/attendance/today/', { params }),
  updateAttendance: (id, data) => apiClient.patch(`/attendance/${id}/`, data),
  exportExcel: (params) => apiClient.get('/attendance/export-excel/', { params, responseType: 'blob' }),
  // Faqat SUPERADMIN (backend AdminAttendanceController): avval son, keyin shu son bilan o'chirish
  purgePreview: (params) => apiRootClient.get('/admin/attendance/purge-preview', { params }),
  purge: (data) => apiRootClient.post('/admin/attendance/purge', data),
}
