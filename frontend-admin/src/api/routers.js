import { apiRootClient } from './client'

// Backend kontrakti: /api/routers (V1 prefiksi YO'Q — RouterController umumiy
// anyRequest().authenticated() ostida, lekin V1* API oilasiga kiritilmagan).
// Shu sabab apiRootClient (baseURL: /api) ishlatiladi, apiClient (baseURL: /api/v1) emas
// — camerasAPI bilan bir xil naqsh.
export const routersAPI = {
  getRouters: (params) => apiRootClient.get('/routers', { params }),
  getRouter: (id) => apiRootClient.get(`/routers/${id}`),
  getOverview: () => apiRootClient.get('/routers/overview'),
  createKey: (data) => apiRootClient.post('/routers/create-key', data),
  updateRouter: (id, data) => apiRootClient.put(`/routers/${id}`, data),
  assignSchool: (id, schoolId) => apiRootClient.put(`/routers/${id}/assign-school`, { schoolId }),
  deleteRouter: (id) => apiRootClient.delete(`/routers/${id}`),

  getTerminals: (routerId) => apiRootClient.get(`/routers/${routerId}/terminals`),
  addTerminal: (routerId, data) => apiRootClient.post(`/routers/${routerId}/terminals`, data),
  updateTerminal: (id, data) => apiRootClient.put(`/routers/terminals/${id}`, data),
  deleteTerminal: (id) => apiRootClient.delete(`/routers/terminals/${id}`),

  getWgConfig: (id) => apiRootClient.get(`/routers/${id}/wg-config`),
  getWgScript: (id) => apiRootClient.get(`/routers/${id}/wg-script`),

  // Routerning o'z ARP/DHCP jadvalidan haqiqiy ulangan qurilmalar — "Terminal qo'shish"
  // formasida IP maydonini avtomatik to'ldirish uchun (MikrotikRestClient, RouterController).
  getLanHosts: (id) => apiRootClient.get(`/routers/${id}/lan-hosts`),

  // Router ortidagi qurilmalarni qidirish (VPN orqali, ~1 daqiqagacha davom etishi mumkin)
  discover: (routerId, creds) => apiRootClient.post(`/routers/${routerId}/discover`, creds || {}, { timeout: 120000 }),
}

// Face ID terminalini masofadan boshqarish — backend FaceTerminalController (/api/terminals)
export const terminalsAPI = {
  status: (id) => apiRootClient.get(`/terminals/${id}/status`),
  door: (id, cmd = 'open') => apiRootClient.post(`/terminals/${id}/door`, { cmd }),
  reboot: (id) => apiRootClient.post(`/terminals/${id}/reboot`, {}),
  syncTime: (id) => apiRootClient.post(`/terminals/${id}/sync-time`, {}),
  users: (id, offset = 0, limit = 30) => apiRootClient.get(`/terminals/${id}/users`, { params: { offset, limit } }),
  deleteUser: (id, employeeNo) => apiRootClient.delete(`/terminals/${id}/users/${encodeURIComponent(employeeNo)}`),
  syncFaces: (id, studentIds) => apiRootClient.post(`/terminals/${id}/sync-faces`, studentIds ? { studentIds } : {}),
  syncFacesStatus: (id, jobId) => apiRootClient.get(`/terminals/${id}/sync-faces/${jobId}`),
  backfill: (id, from, to) => apiRootClient.post(`/terminals/${id}/events/backfill`, { from, to }, { timeout: 120000 }),

  // "Tanidi" deb hisoblangan, lekin joriy o'quvchiga moslanmagan so'nggi voqealar
  // (FaceAttendanceIngestService#saveUnmatched, FaceTerminalController).
  unmatchedEvents: (id) => apiRootClient.get(`/terminals/${id}/unmatched-events`),
}
