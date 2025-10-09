import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'ar', key: 'arabic' },
  { code: 'zh', key: 'chinese' },
  { code: 'nl', key: 'dutch' },
  { code: 'en', key: 'english' },
  { code: 'fr', key: 'french' },
  { code: 'de', key: 'german' },
  { code: 'el', key: 'greek' },
  { code: 'id', key: 'indonesian' },
  { code: 'it', key: 'italian' },
  { code: 'ko', key: 'korean' },
  { code: 'pt', key: 'portuguese' },
  { code: 'ru', key: 'russian' },
  { code: 'es', key: 'spanish' },
  { code: 'cy', key: 'welsh' },
];

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
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
            {t(`common:language.${lang.key}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}