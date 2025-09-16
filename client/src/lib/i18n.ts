import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations - optimized to load only English upfront, Greek on demand
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

// Greek translations loaded lazily
const loadGreekTranslations = async () => {
  const [common, landing, dashboard, resources, forms, auth, admin, map, search, newsletter] = await Promise.all([
    import('../locales/el/common.json'),
    import('../locales/el/landing.json'),
    import('../locales/el/dashboard.json'),
    import('../locales/el/resources.json'),
    import('../locales/el/forms.json'),
    import('../locales/el/auth.json'),
    import('../locales/el/admin.json'),
    import('../locales/el/map.json'),
    import('../locales/el/search.json'),
    import('../locales/el/newsletter.json'),
  ]);
  
  return {
    common: common.default,
    landing: landing.default,
    dashboard: dashboard.default,
    resources: resources.default,
    forms: forms.default,
    auth: auth.default,
    admin: admin.default,
    map: map.default,
    search: search.default,
    newsletter: newsletter.default,
  };
};

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
      // Greek translations will be loaded on demand
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

// Load Greek translations when language changes to 'el'
i18n.on('languageChanged', async (lng) => {
  document.documentElement.lang = lng;
  
  // Lazy load Greek translations if not already loaded
  if (lng === 'el' && !i18n.hasResourceBundle('el', 'common')) {
    try {
      const greekTranslations = await loadGreekTranslations();
      
      // Add all Greek namespaces to i18n
      Object.entries(greekTranslations).forEach(([namespace, resources]) => {
        i18n.addResourceBundle('el', namespace, resources);
      });
      
      // Force re-render by changing language again
      i18n.changeLanguage(lng);
    } catch (error) {
      console.warn('Failed to load Greek translations:', error);
      // Fallback to English if Greek fails to load
      i18n.changeLanguage('en');
    }
  }
});

export default i18n;