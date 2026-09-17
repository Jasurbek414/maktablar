import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import uz from './locales/uz.json';
import ru from './locales/ru.json';
import en from './locales/en.json';
import { api } from '../services/api';

// Backend bilan kelishilgan uchta til kodi: uz / ru / en.
// Til o'zgarganda Accept-Language header ham shu uchta qiymatdan biriga
// o'rnatiladi — backend shu header orqali javob xabarlarini lokalizatsiya qiladi.
function applyApiLanguageHeader(lng) {
  const lang = ['uz', 'ru', 'en'].includes(lng) ? lng : 'uz';
  api.setLanguage(lang);
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
    supportedLngs: ['uz', 'ru', 'en'],
    lowerCaseLng: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

// Boshlang'ich yuklanishda va har bir til almashtirishda Accept-Language header'ini yangilaymiz.
applyApiLanguageHeader(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', applyApiLanguageHeader);

export default i18n;
