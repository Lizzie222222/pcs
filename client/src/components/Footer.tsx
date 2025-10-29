import { useTranslation } from "react-i18next";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";

export function Footer() {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-navy text-white py-12 mt-16" data-testid="footer">
      <div className="container-width">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <img 
                src={whiteLogoUrl} 
                alt="Plastic Clever Schools Logo" 
                className="w-48 h-auto max-w-full object-contain" 
              />
            </div>
            <p className="text-gray-300 text-sm sm:text-base">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.program_title')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/#how-it-works" className="hover:text-teal transition-colors">{t('footer.program_how_it_works')}</a></li>
              <li><a href="/resources" className="hover:text-teal transition-colors">{t('footer.program_resources')}</a></li>
              <li><a href="/inspiration" className="hover:text-teal transition-colors">{t('footer.program_success_stories')}</a></li>
              <li><a href="/#how-it-works" className="hover:text-teal transition-colors">{t('footer.program_award_criteria')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.support_title')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/help-center" className="hover:text-teal transition-colors">{t('footer.support_help_center')}</a></li>
              <li><a href="/contact" className="hover:text-teal transition-colors">{t('footer.support_contact_us')}</a></li>
              <li><a href="/schools-map" className="hover:text-teal transition-colors">{t('footer.support_community')}</a></li>
              <li><a href="/resources" className="hover:text-teal transition-colors">{t('footer.support_training')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.connect_title')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/register" className="hover:text-teal transition-colors">{t('footer.connect_newsletter')}</a></li>
              <li><a href="https://www.instagram.com/plasticcleverschools/" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_social_media')}</a></li>
              <li><a href="/events" className="hover:text-teal transition-colors">{t('footer.connect_events')}</a></li>
              <li><a href="/#partners" className="hover:text-teal transition-colors">{t('footer.connect_partners')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>
            {t('footer.copyright')} | 
            <a href="https://commonseas.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors ml-1">{t('footer.privacy')}</a> | 
            <a href="/terms" className="hover:text-teal transition-colors ml-1">{t('footer.terms')}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
