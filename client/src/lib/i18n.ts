import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';
import enDashboard from '../locales/en/dashboard.json';
import enResources from '../locales/en/resources.json';
import enForms from '../locales/en/forms.json';
import enAuth from '../locales/en/auth.json';
import enAdmin from '../locales/en/admin.json';
import enMap from '../locales/en/map.json';
import enSearch from '../locales/en/search.json';
import enNewsletter from '../locales/en/newsletter.json';

import elCommon from '../locales/el/common.json';
import elLanding from '../locales/el/landing.json';
import elDashboard from '../locales/el/dashboard.json';
import elResources from '../locales/el/resources.json';
import elForms from '../locales/el/forms.json';
import elAuth from '../locales/el/auth.json';
import elAdmin from '../locales/el/admin.json';
import elMap from '../locales/el/map.json';
import elSearch from '../locales/el/search.json';
import elNewsletter from '../locales/el/newsletter.json';

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    debug: import.meta.env.DEV, // Enable debug in development
    
    resources: {
      en: {
        common: enCommon,
        landing: enLanding,
        dashboard: enDashboard,
        resources: enResources,
        forms: enForms,
        auth: enAuth,
        admin: enAdmin,
        map: enMap,
        search: enSearch,
        newsletter: enNewsletter,
      },
      el: {
        common: elCommon,
        landing: elLanding,
        dashboard: elDashboard,
        resources: elResources,
        forms: elForms,
        auth: elAuth,
        admin: elAdmin,
        map: elMap,
        search: elSearch,
        newsletter: elNewsletter,
      },
    },
    
    // Default language
    fallbackLng: 'en',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // Default namespace
    defaultNS: 'common',
    ns: ['common', 'landing', 'dashboard', 'resources', 'forms', 'auth', 'admin', 'map', 'search', 'newsletter'],
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // React options
    react: {
      useSuspense: false, // Set to false to avoid suspense mode
    },
  });

// Update document language attribute when language changes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;