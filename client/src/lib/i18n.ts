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

// Generic function to load translations for any language
const loadTranslations = async (lang: string) => {
  const [common, landing, dashboard, resources, forms, auth, admin, map, search, newsletter] = await Promise.all([
    import(`../locales/${lang}/common.json`),
    import(`../locales/${lang}/landing.json`),
    import(`../locales/${lang}/dashboard.json`),
    import(`../locales/${lang}/resources.json`),
    import(`../locales/${lang}/forms.json`),
    import(`../locales/${lang}/auth.json`),
    import(`../locales/${lang}/admin.json`),
    import(`../locales/${lang}/map.json`),
    import(`../locales/${lang}/search.json`),
    import(`../locales/${lang}/newsletter.json`),
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
      bindI18n: 'languageChanged loaded', // Ensure components re-render on language change
    },
  });

// Supported languages for lazy loading
const supportedLanguages = ['ar', 'zh', 'nl', 'el', 'fr', 'de', 'id', 'it', 'ko', 'pt', 'ru', 'es', 'cy'];

// RTL languages that require right-to-left layout
const rtlLanguages = ['ar']; // Arabic

// Load translations when language changes
i18n.on('languageChanged', async (lng) => {
  document.documentElement.lang = lng;
  
  // Set text direction based on language
  document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  
  // Lazy load translations if not already loaded (skip English as it's loaded upfront)
  if (lng !== 'en' && supportedLanguages.includes(lng) && !i18n.hasResourceBundle(lng, 'common')) {
    try {
      const translations = await loadTranslations(lng);
      
      // Add all namespaces to i18n
      Object.entries(translations).forEach(([namespace, resources]) => {
        i18n.addResourceBundle(lng, namespace, resources, true, true);
      });
      
      // Emit loaded event to trigger React re-render
      i18n.emit('loaded', [lng]);
    } catch (error) {
      console.warn(`Failed to load ${lng} translations:`, error);
      // Fallback to English if language fails to load
      i18n.changeLanguage('en');
    }
  }
});

export default i18n;