import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enChat from './locales/en/chat.json';
import enSettings from './locales/en/settings.json';
import enFlow from './locales/en/flow.json';
import enSkills from './locales/en/skills.json';

import viCommon from './locales/vi/common.json';
import viChat from './locales/vi/chat.json';
import viSettings from './locales/vi/settings.json';
import viFlow from './locales/vi/flow.json';
import viSkills from './locales/vi/skills.json';

const resources = {
  en: {
    common: enCommon,
    chat: enChat,
    settings: enSettings,
    flow: enFlow,
    skills: enSkills,
  },
  vi: {
    common: viCommon,
    chat: viChat,
    settings: viSettings,
    flow: viFlow,
    skills: viSkills,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
