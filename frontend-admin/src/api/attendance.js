import apiClient from './client'

export const attendanceAPI = {
  getAttendance: (params) => apiClient.get('/attendance/', { params }),
  getStatistics: (params) => apiClient.get('/attendance/statistics/', { params }),
  getToday: (params) => apiClient.get('/attendance/today/', { params }),
  updateAttendance: (id, data) => apiClient.patch(`/attendance/${id}/`, data),
  exportExcel: (params) => apiClient.get('/attendance/export-excel/', { params, responseType: 'blob' }),
}
