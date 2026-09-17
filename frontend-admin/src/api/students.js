import apiClient from './client'

export const studentsAPI = {
  getStudents: (params) => apiClient.get('/students/', { params }),
  getStudent: (id) => apiClient.get(`/students/${id}/`),
  createStudent: (data) => apiClient.post('/students/', data),
  updateStudent: (id, data) => apiClient.patch(`/students/${id}/`, data),
  deleteStudent: (id) => apiClient.delete(`/students/${id}/`),
  getStudentAttendance: (id) => apiClient.get(`/students/${id}/attendance/`),
  uploadPhoto: (id, formData) => apiClient.post(`/students/${id}/upload-photo/`, formData),
  pushFace: (id) => apiClient.post(`/students/${id}/push-face/`),

  getTeachers: (params) => apiClient.get('/teachers/', { params }),
  createTeacher: (data) => apiClient.post('/teachers/', data),
  updateTeacher: (id, data) => apiClient.patch(`/teachers/${id}/`, data),
  deleteTeacher: (id) => apiClient.delete(`/teachers/${id}/`),

  getParents: (params) => apiClient.get('/parents/', { params }),
  createParentLink: (data) => apiClient.post('/parent-links/', data),
  getParentLinks: (params) => apiClient.get('/parent-links/', { params }),
}
