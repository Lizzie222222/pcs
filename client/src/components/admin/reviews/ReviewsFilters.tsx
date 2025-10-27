import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

interface ReviewsFiltersProps {
  reviewTab: 'evidence' | 'audits' | 'photo-consent';
  setReviewTab: (tab: 'evidence' | 'audits' | 'photo-consent') => void;
  evidenceCount: number;
  auditsCount: number;
  photoConsentCount: number;
}

export default function ReviewsFilters({
  reviewTab,
  setReviewTab,
  evidenceCount,
  auditsCount,
  photoConsentCount
}: ReviewsFiltersProps) {
  const { t } = useTranslation('admin');

  return (
    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          reviewTab === 'evidence'
            ? 'bg-white text-navy shadow-sm'
            : 'text-gray-600 hover:text-navy'
        }`}
        onClick={() => setReviewTab('evidence')}
        data-testid="subtab-evidence"
      >
        {t('reviews.filters.evidenceReview')}
        {evidenceCount > 0 && (
          <Badge className="ml-2 bg-red-500 text-white" data-testid="badge-evidence-count">
            {evidenceCount}
          </Badge>
        )}
      </button>
      <button
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          reviewTab === 'audits'
            ? 'bg-white text-navy shadow-sm'
            : 'text-gray-600 hover:text-navy'
        }`}
        onClick={() => setReviewTab('audits')}
        data-testid="subtab-audits"
      >
        {t('reviews.filters.auditReview')}
        {auditsCount > 0 && (
          <Badge className="ml-2 bg-red-500 text-white" data-testid="badge-audits-count">
            {auditsCount}
          </Badge>
        )}
      </button>
      <button
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          reviewTab === 'photo-consent'
            ? 'bg-white text-navy shadow-sm'
            : 'text-gray-600 hover:text-navy'
        }`}
        onClick={() => setReviewTab('photo-consent')}
        data-testid="tab-review-photo-consent"
      >
        {t('reviews.filters.photoConsent')}
        {photoConsentCount > 0 && (
          <Badge className="ml-2 bg-red-500 text-white">
            {photoConsentCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
