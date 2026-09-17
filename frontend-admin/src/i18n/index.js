import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import uz from './locales/uz.json'
import ru from './locales/ru.json'
import en from './locales/en.json'
// Qurilma boshqaruvi (Mikrotik/Face ID/kameralar) matnlari — asosiy sayt (frontend/) lokalizatsiyasidan
// olingan alohida fayllar; asosiy fayllarning formatiga tegmaslik uchun init'dan keyin qo'shiladi.
import devicesUz from './locales/devices-management.uz.json'
import devicesRu from './locales/devices-management.ru.json'
import devicesEn from './locales/devices-management.en.json'
import apiClient, { apiRootClient } from '../api/client'

export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en']
const STORAGE_KEY = 'app_language'

// Backend Accept-Language header orqali javob xabarlarini (validatsiya, xatolik
// matnlari va h.k.) lokalizatsiya qiladi — shu sababli tanlangan til bilan doimo
// aniq "uz"/"ru"/"en" qiymatlaridan biri sifatida sinxron ushlab turiladi.
export function applyLanguageHeader(lang) {
  const value = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'uz'
  apiClient.defaults.headers.common['Accept-Language'] = value
  apiRootClient.defaults.headers.common['Accept-Language'] = value
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
      en: { translation: en },
    },
    fallbackLng: 'uz',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      // Standart til har doim "uz" — brauzer tilini avtomatik aniqlashga tayanmaymiz,
      // faqat foydalanuvchi tugma orqali tanlagan tilni localStorage'dan o'qiymiz.
      order: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

// deep=true (ichki obyektlar birlashtiriladi), overwrite=false — mavjud tarjima hech qachon almashtirilmaydi
for (const [lng, bundle] of [['uz', devicesUz], ['ru', devicesRu], ['en', devicesEn]]) {
  i18n.addResourceBundle(lng, 'translation', bundle, true, false)
}

applyLanguageHeader(i18n.resolvedLanguage || i18n.language || 'uz')

i18n.on('languageChanged', (lng) => {
  applyLanguageHeader(lng)
})

export default i18n
