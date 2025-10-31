import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, Shield, Database, Eye, Lock, Users, Globe, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  const { t } = useTranslation('common');
  
  const getStringList = (key: string): string[] => {
    const result = t(key, { returnObjects: true });
    return Array.isArray(result) ? result : [];
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
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.acknowledgment')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.acknowledgment_message')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.introduction.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('privacy.introduction.paragraph2')}
            </p>
          </CardContent>
        </Card>

        {/* Definitions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.file_text_icon')} />
              {t('privacy.introduction.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none space-y-4">
            {t('privacy.section1.subsection1_1.title') && (
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section1.subsection1_1.title')}</h3>
                <p className="text-gray-700 leading-relaxed">{t('privacy.section1.subsection1_1.intro')}</p>
              </div>
            )}
            {t('privacy.section1.subsection1_2.title') && (
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section1.subsection1_2.title')}</h3>
                <p className="text-gray-700 leading-relaxed">{t('privacy.section1.subsection1_2.intro')}</p>
              </div>
            )}
            {t('privacy.section1.subsection1_3.title') && (
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section1.subsection1_3.title')}</h3>
                <p className="text-gray-700 leading-relaxed">{t('privacy.section1.subsection1_3.intro')}</p>
              </div>
            )}
            {t('privacy.section1.subsection1_4.title') && (
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section1.subsection1_4.title')}</h3>
                <p className="text-gray-700 leading-relaxed">{t('privacy.section1.subsection1_4.intro')}</p>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-navy mb-2">Data Controller</h3>
              <p className="text-gray-700 leading-relaxed">Data Controller means the natural or legal person who (either alone or jointly or in common with other persons) determines the purposes for which and the manner in which any personal information are, or are to be, processed. For the purpose of this Privacy Policy, we are a Data Controller of your Personal Data.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy mb-2">Data Processors (or Service Providers)</h3>
              <p className="text-gray-700 leading-relaxed">Data Processor (or Service Provider) means any natural or legal person who processes the data on behalf of the Data Controller. We may use the services of various Service Providers in order to process your data more effectively.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-navy mb-2">Data Subject (or User)</h3>
              <p className="text-gray-700 leading-relaxed">Data Subject is any living individual who is using our Service and is the subject of Personal Data.</p>
            </div>
          </CardContent>
        </Card>

        {/* Information Collection and Use */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.database_icon')} />
              {t('privacy.section2.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('privacy.section2.intro')}
            </p>
            <h3 className="text-lg font-semibold text-navy mb-2">Personal Data</h3>
            <p className="text-gray-700 leading-relaxed mb-2">While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section2.items').map((item: string, index: number) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* School Data */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.users_icon')} />
              {t('privacy.section3.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section3.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section3.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Usage Data & Tracking */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-pcs_blue" aria-label={t('accessibility.eye_icon')} />
              {t('privacy.section4.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('privacy.section4.subsection4_1.content')}
            </p>
            
            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">{t('privacy.section4.subsection4_2.title')}</h3>
            <p className="text-gray-700 leading-relaxed mb-2">
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

        {/* Use of Data */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" />
              {t('privacy.section5.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-2">
              {t('privacy.section5.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section5.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            {t('privacy.section5.outro') && (
              <p className="text-gray-700 leading-relaxed mt-4">
                {t('privacy.section5.outro')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legal Basis for Processing */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.file_text_icon")} />
              {t('privacy.section6.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-2">
              {t('privacy.section6.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section6.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" />
              {t('privacy.section7.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-2">
              {t('privacy.section7.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section7.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Transfer of Data */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.globe_icon")} />
              {t('privacy.section8.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-2">
              {t('privacy.section8.intro')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section8.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Disclosure of Data */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.alert_circle_icon")} />
              {t('privacy.section9.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('privacy.section9.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
              {t('privacy.section9.paragraph2')}
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              {getStringList('privacy.section9.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Security of Data */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.lock_icon")} />
              {t('privacy.section10.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section10.paragraph1')}
            </p>
          </CardContent>
        </Card>

        {/* Your Data Protection Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" />
              {t('privacy.section11.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('privacy.section11.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('privacy.section11.paragraph2')}
            </p>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              {t('privacy.section12.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('privacy.section12.paragraph1')}
            </p>
            <p className="text-gray-700 leading-relaxed mb-2">
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

        {/* Service Providers & Analytics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.globe_icon")} />
              {t('privacy.section13.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none space-y-4">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section13.intro')}
            </p>
            
            <div>
              <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section13.contact_title')}</h3>
              <p className="text-gray-700 leading-relaxed mb-2">
                {t('privacy.section13.contact_subtitle')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                {t('privacy.section13.contact_email_label')}
              </p>
              <p className="text-gray-700 leading-relaxed mb-2">
                <a href="https://policies.google.com/privacy?hl=en" target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">
                  {t('privacy.section13.contact_email_privacy')}
                </a>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section13.contact_email_general_label')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('privacy.section13.contact_email_general')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-navy mb-2">{t('privacy.section13.contact_website_label')}</h3>
              <p className="text-gray-700 leading-relaxed">
                {t('privacy.section13.contact_website')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Us */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {t('privacy.section13.outro')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
