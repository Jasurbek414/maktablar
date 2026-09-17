import { apiRootClient } from './client'

// /api/admin/** — SUPERADMIN, apiClient (/api/v1) emas, apiRootClient (/api) orqali.
export const botConfigAPI = {
  getStatus: () => apiRootClient.get('/admin/bot-config'),
  update: (botToken) => apiRootClient.put('/admin/bot-config', { botToken }),
  // Faqat feature-toggle maydonlarini yangilaydi (token'ga tegmaydi) — PUT qisman
  // yangilash bo'lgani uchun (backend BotConfigController#update, faqat body'dagi
  // kalitlar o'zgaradi).
  updateToggles: (toggles) => apiRootClient.put('/admin/bot-config', toggles),
}
