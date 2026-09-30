import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './zh-CN';

// Chinese only — the English bundle and the language switcher were removed.
i18n.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: zh } },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

export default i18n;
