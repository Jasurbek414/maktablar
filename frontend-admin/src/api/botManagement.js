import { apiRootClient } from './client'

// /api/bot/** — JWT bilan (SUPERADMIN/ADMIN/DIRECTOR/MUDIR), apiRootClient (/api) orqali,
// botConfig.js bilan bir xil naqsh (apiClient /api/v1 emas).
export const botManagementAPI = {
  getInbox: (schoolId) => apiRootClient.get('/bot/messages', { params: schoolId ? { schoolId } : {} }),
  sendBroadcast: (text, schoolId) => apiRootClient.post('/bot/broadcast', { text, schoolId }),
  getBroadcastHistory: () => apiRootClient.get('/bot/broadcast/history'),
  // Mavjud StudentController#sendMessage endpointi — bot inbox tredidagi xabarga javob berish.
  replyToStudentThread: (studentId, text) => apiRootClient.post(`/students/${studentId}/messages`, { text }),
}
