import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN/translation.json';
import en from './locales/en/translation.json';

const savedLanguage = typeof window !== 'undefined'
  ? localStorage.getItem('nook-language') ?? 'zh-CN'
  : 'zh-CN';

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false,
  },
  returnObjects: true,
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('nook-language', lng);
  document.documentElement.lang = lng;
});

export default i18n;
