import apiClient from './client'

export const notificationsAPI = {
  getNotifications: () => apiClient.get('/notifications/'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read/`),
  markAllRead: () => apiClient.post('/notifications/mark-all-read/'),
}
