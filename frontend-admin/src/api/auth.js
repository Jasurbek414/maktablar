import apiClient from './client'

export const authAPI = {
  login: (phone, password) =>
    apiClient.post('/auth/login/', { phone, password }),

  logout: (refreshToken) =>
    apiClient.post('/auth/logout/', { refresh: refreshToken }),

  refreshToken: (refresh) =>
    apiClient.post('/auth/refresh/', { refresh }),

  getMe: () =>
    apiClient.get('/auth/me/'),

  updateMe: (data) =>
    apiClient.patch('/auth/me/', data),

  changePassword: (data) =>
    apiClient.post('/auth/change-password/', data),
}

export const usersAPI = {
  getUsers: (params) => apiClient.get('/auth/users/', { params }),
  getUser: (id) => apiClient.get(`/auth/users/${id}/`),
  createUser: (data) => apiClient.post('/auth/users/', data),
  updateUser: (id, data) => apiClient.patch(`/auth/users/${id}/`, data),
  deactivateUser: (id) => apiClient.post(`/auth/users/${id}/deactivate/`),
  activateUser: (id) => apiClient.post(`/auth/users/${id}/activate/`),
  setUserPassword: (id, data) => apiClient.post(`/auth/users/${id}/set-password/`, data),
  getUserRoles: (id) => apiClient.get(`/auth/users/${id}/roles/`),
  assignRole: (id, data) => apiClient.post(`/auth/users/${id}/roles/`, data),
  removeRole: (userId, roleId) => apiClient.delete(`/auth/users/${userId}/roles/${roleId}/`),
  getRoles: () => apiClient.get('/auth/roles/'),
  getAuditLogs: (params) => apiClient.get('/auth/audit-logs/', { params }),
}
