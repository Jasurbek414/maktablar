import apiClient from './client'

export const orgAPI = {
  // Regions
  getRegions: (params) => apiClient.get('/regions/', { params }),
  createRegion: (data) => apiClient.post('/regions/', data),
  updateRegion: (id, data) => apiClient.patch(`/regions/${id}/`, data),
  deleteRegion: (id) => apiClient.delete(`/regions/${id}/`),

  // Districts
  getDistricts: (params) => apiClient.get('/districts/', { params }),
  createDistrict: (data) => apiClient.post('/districts/', data),
  updateDistrict: (id, data) => apiClient.patch(`/districts/${id}/`, data),
  deleteDistrict: (id) => apiClient.delete(`/districts/${id}/`),
  deleteSchool: (id) => apiClient.delete(`/schools/${id}/`),

  // Schools
  getSchools: (params) => apiClient.get('/schools/', { params }),
  getSchool: (id) => apiClient.get(`/schools/${id}/`),
  createSchool: (data) => apiClient.post('/schools/', data),
  updateSchool: (id, data) => apiClient.patch(`/schools/${id}/`, data),

  // Classes
  getClasses: (params) => apiClient.get('/classes/', { params }),
  createClass: (data) => apiClient.post('/classes/', data),
  updateClass: (id, data) => apiClient.patch(`/classes/${id}/`, data),
  deleteClass: (id) => apiClient.delete(`/classes/${id}/`),
}
