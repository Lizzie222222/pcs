import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, FileText, Shield, Users, BookOpen, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";

export default function TermsPage() {
  const { t } = useTranslation('common');
  
  const getStringList = (key: string): string[] => {
    return t(key, { returnObjects: true }) as string[];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-16">
      {/* Header */}
      <div className="bg-navy text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" aria-label={t('accessibility.arrow_left_icon')} />
            {t('navigation.back_to_home')}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-terms-title">
            {t('terms.title')}
          </h1>
          <p className="text-white/90 text-lg">
            {t('terms.last_updated')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.file_text_icon")} />
              {t('terms.introduction.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.introduction.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('terms.introduction.paragraph2')}
            </p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              {t('terms.section1.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section1.intro')}
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-700">
              {getStringList('terms.section1.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* User Accounts and Responsibilities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              {t('terms.section2.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{t('terms.section2.subsection2_1.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section2.subsection2_1.content')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section2.subsection2_2.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section2.subsection2_2.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('terms.section2.subsection2_2.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section2.subsection2_3.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section2.subsection2_3.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('terms.section2.subsection2_3.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Program Participation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.book_open_icon")} />
              {t('terms.section3.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{t('terms.section3.subsection3_1.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section3.subsection3_1.content')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section3.subsection3_2.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section3.subsection3_2.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('terms.section3.subsection3_2.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section3.subsection3_3.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section3.subsection3_3.content')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section3.subsection3_4.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section3.subsection3_4.content')}
            </p>
          </CardContent>
        </Card>

        {/* Content and Intellectual Property */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              {t('terms.section4.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{t('terms.section4.subsection4_1.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section4.subsection4_1.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('terms.section4.subsection4_1.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section4.subsection4_2.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section4.subsection4_2.content')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('terms.section4.subsection4_3.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section4.subsection4_3.content')}
            </p>
          </CardContent>
        </Card>

        {/* Privacy and Data Protection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              {t('terms.section5.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section5.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('terms.section5.paragraph2')}{' '}
              <a href="https://commonseas.com/privacy" target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">
                {t('terms.section5.privacy_policy_link_text')}
              </a>.
            </p>
          </CardContent>
        </Card>

        {/* Termination and Suspension */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-coral" aria-label={t("accessibility.alert_circle_icon")} />
              {t('terms.section6.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section6.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('terms.section6.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('terms.section6.outro')}
            </p>
          </CardContent>
        </Card>

        {/* Disclaimers and Limitations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow" aria-label={t("accessibility.alert_circle_icon")} />
              {t('terms.section7.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section7.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('terms.section7.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('terms.section7.outro')}
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.file_text_icon")} />
              {t('terms.section8.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section8.content')}
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              {t('terms.section9.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section9.content')}
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              {t('terms.section10.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('terms.section10.intro')}
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>{t('terms.section10.contact_title')}</strong><br />
                {t('terms.section10.contact_subtitle')}
              </p>
              <p className="text-gray-700 mb-2">
                {t('terms.section10.contact_email_label')} <a href={`mailto:${t('terms.section10.contact_email')}`} className="text-pcs_blue hover:underline">{t('terms.section10.contact_email')}</a>
              </p>
              <p className="text-gray-700">
                {t('terms.section10.contact_website_label')} <a href={`https://${t('terms.section10.contact_website')}`} target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">{t('terms.section10.contact_website')}</a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <div className="bg-ocean-blue/10 border-l-4 border-ocean-blue p-6 rounded-r-lg mb-12">
          <p className="text-gray-800 leading-relaxed">
            <strong>{t('terms.acknowledgment')}</strong>
          </p>
          <p className="text-gray-700 mt-4 text-sm">
            {t('terms.acknowledgment_message')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
