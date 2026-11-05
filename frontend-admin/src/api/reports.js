import apiClient from './client'

export const reportsAPI = {
  getOverview: () => apiClient.get('/reports/overview/'),
  getDaily: (params) => apiClient.get('/reports/daily/', { params }),
  getWeekly: (params) => apiClient.get('/reports/weekly/', { params }),
  getMonthly: (params) => apiClient.get('/reports/monthly/', { params }),
  getStudentReport: (studentId) => apiClient.get(`/reports/student/${studentId}/`),
  getAnalytics: (params) => apiClient.get('/reports/analytics/', { params }),
}
