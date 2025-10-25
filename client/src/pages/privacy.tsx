import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, Shield, Database, Eye, Lock, Users, Globe, FileText, AlertCircle, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-privacy-title">
            {t('privacy.title')}
          </h1>
          <p className="text-white/90 text-lg">
            {t('privacy.last_updated')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.shield_icon')} />
              {t('privacy.introduction.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.introduction.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.introduction.paragraph2')}
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.database_icon')} />
              {t('privacy.section1.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{t('privacy.section1.subsection1_1.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section1.subsection1_1.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section1.subsection1_1.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section1.subsection1_2.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section1.subsection1_2.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section1.subsection1_2.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section1.subsection1_3.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section1.subsection1_3.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section1.subsection1_3.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section1.subsection1_4.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section1.subsection1_4.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section1.subsection1_4.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.eye_icon')} />
              {t('privacy.section2.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section2.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section2.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Legal Basis for Processing */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.file_text_icon")} />
              {t('privacy.section3.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section3.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section3.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Data Sharing and Disclosure */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              {t('privacy.section4.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">{t('privacy.section4.subsection4_1.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section4.subsection4_1.content')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section4.subsection4_2.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section4.subsection4_2.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section4.subsection4_2.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section4.subsection4_2.outro')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section4.subsection4_3.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section4.subsection4_3.content')}
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section4.subsection4_4.title')}</h3>
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section4.subsection4_4.content')}
            </p>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.lock_icon")} />
              {t('privacy.section5.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section5.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section5.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section5.outro')}
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" />
              {t('privacy.section6.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section6.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section6.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section6.outro')}
            </p>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.user_check_icon")} />
              {t('privacy.section7.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section7.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section7.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section7.outro')}
            </p>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.globe_icon")} />
              {t('privacy.section8.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section8.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section8.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section8.outro')}
            </p>
          </CardContent>
        </Card>

        {/* International Data Transfers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.globe_icon")} />
              {t('privacy.section9.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section9.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section9.paragraph2')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section9.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" />
              {t('privacy.section10.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section10.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section10.paragraph2')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section10.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section10.paragraph3')}
            </p>
          </CardContent>
        </Card>

        {/* Third-Party Links */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.globe_icon")} />
              {t('privacy.section11.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section11.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section11.paragraph2')}
            </p>
          </CardContent>
        </Card>

        {/* Changes to Privacy Policy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.file_text_icon")} />
              {t('privacy.section12.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section12.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section12.paragraph2')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section12.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section12.paragraph3')}
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              {t('privacy.section13.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section13.intro')}
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>{t('privacy.section13.contact_title')}</strong><br />
                {t('privacy.section13.contact_subtitle')}
              </p>
              <p className="text-gray-700 mb-2">
                {t('privacy.section13.contact_email_label')} <a href={`mailto:${t('privacy.section13.contact_email_privacy')}`} className="text-pcs_blue hover:underline">{t('privacy.section13.contact_email_privacy')}</a>
              </p>
              <p className="text-gray-700 mb-2">
                {t('privacy.section13.contact_email_general_label')} <a href={`mailto:${t('privacy.section13.contact_email_general')}`} className="text-pcs_blue hover:underline">{t('privacy.section13.contact_email_general')}</a>
              </p>
              <p className="text-gray-700">
                {t('privacy.section13.contact_website_label')} <a href={`https://${t('privacy.section13.contact_website')}`} target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">{t('privacy.section13.contact_website')}</a>
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.section13.outro')}
            </p>
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <div className="bg-ocean-blue/10 border-l-4 border-ocean-blue p-6 rounded-r-lg mb-12">
          <p className="text-gray-800 leading-relaxed">
            <strong>{t('privacy.acknowledgment')}</strong>
          </p>
          <p className="text-gray-700 mt-4 text-sm">
            {t('privacy.acknowledgment_message')}
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
