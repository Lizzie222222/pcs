import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

const languages = [
  { code: 'ar', nativeName: 'العربية' },
  { code: 'zh', nativeName: '中文' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'el', nativeName: 'Ελληνικά' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'es', nativeName: 'Español' },
  { code: 'cy', nativeName: 'Cymraeg' },
];

// Function to load translations for a language
const loadTranslations = async (lang: string) => {
  const [common, landing, dashboard, resources, forms, auth, admin, map, search, newsletter, help, inspiration] = await Promise.all([
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
    import(`../locales/${lang}/help.json`),
    import(`../locales/${lang}/inspiration.json`),
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
    help: help.default,
    inspiration: inspiration.default,
  };
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const handleLanguageChange = async (lang: string) => {
    // If not English and translations not loaded, load them first
    if (lang !== 'en' && !i18n.hasResourceBundle(lang, 'common')) {
      try {
        const translations = await loadTranslations(lang);
        // Add all namespaces to i18n
        Object.entries(translations).forEach(([namespace, resources]) => {
          i18n.addResourceBundle(lang, namespace, resources, true, true);
        });
      } catch (error) {
        console.warn(`Failed to load ${lang} translations:`, error);
        return; // Don't change language if translations fail to load
      }
    }
    
    // Change language - React will re-render automatically
    await i18n.changeLanguage(lang);

    // Try to save language preference to database (will fail silently if not authenticated)
    try {
      await apiRequest('PUT', '/api/user/language', { language: lang });
      // Invalidate user query to refresh user data with new language preference
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    } catch (error) {
      // Silently fail if not authenticated or if request fails
      // Language preference is still saved to localStorage via i18n
      console.log('Language preference not saved to database (user may not be authenticated)');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-9 px-0"
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('common:language.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[400px] overflow-y-auto">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            data-testid={`language-option-${lang.code}`}
            className={i18n.language === lang.code ? 'bg-accent' : ''}
          >
            {lang.nativeName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
