import { useTranslation } from "react-i18next";
import { AdvancedSearch } from "@/components/AdvancedSearch";

export default function Search() {
  const { t } = useTranslation(['search', 'common']);
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Page Header */}
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="text-search-title">
            {t('search:page.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t('search:page.subtitle')}
          </p>
        </div>

        {/* Advanced Search Component */}
        <AdvancedSearch />
      </div>
    </div>
  );
}