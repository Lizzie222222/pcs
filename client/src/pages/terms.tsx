import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, FileText, Shield, Users, BookOpen, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";

export default function TermsPage() {
  const { t } = useTranslation('common');

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
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Welcome to Plastic Clever Schools ("we," "our," or "us"). These Terms and Conditions govern your use of the Plastic Clever Schools platform and services. By accessing or using our platform, you agree to be bound by these terms.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Plastic Clever Schools is a global initiative managed by Common Seas in partnership with Kids Against Plastic, designed to help schools reduce single-use plastic and educate students about environmental responsibility.
            </p>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              1. Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              By registering your school or creating an account on the Plastic Clever Schools platform, you confirm that:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-gray-700">
              <li>You are authorized to represent your educational institution</li>
              <li>You are at least 18 years of age or have obtained parental/guardian consent</li>
              <li>You agree to comply with all applicable laws and regulations</li>
              <li>All information provided during registration is accurate and current</li>
            </ul>
          </CardContent>
        </Card>

        {/* User Accounts and Responsibilities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              2. User Accounts and Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">2.1 Account Security</h3>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized access or security breaches.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">2.2 School Roles</h3>
            <p className="text-gray-700 leading-relaxed">
              Our platform supports multiple user roles within schools:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Head Teacher:</strong> Full administrative access to school account, team management, and evidence approval</li>
              <li><strong>Teacher:</strong> Ability to submit evidence, view resources, and participate in school activities</li>
              <li><strong>Pending Teacher:</strong> Limited access pending verification by head teacher</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">2.3 Acceptable Use</h3>
            <p className="text-gray-700 leading-relaxed">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Upload false, misleading, or fraudulent evidence</li>
              <li>Impersonate another school, teacher, or organization</li>
              <li>Use the platform for commercial purposes without authorization</li>
              <li>Interfere with the security or operation of the platform</li>
              <li>Upload content that infringes intellectual property rights</li>
              <li>Share inappropriate, offensive, or harmful content</li>
            </ul>
          </CardContent>
        </Card>

        {/* Program Participation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.book_open_icon")} />
              3. Program Participation
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">3.1 Three-Stage Journey</h3>
            <p className="text-gray-700 leading-relaxed">
              The Plastic Clever Schools program consists of three stages: Inspire, Investigate, and Act. Schools must complete evidence requirements for each stage in order to progress.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">3.2 Evidence Submission</h3>
            <p className="text-gray-700 leading-relaxed">
              All evidence submitted must be:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Original work created by your school community</li>
              <li>Accurate and truthful representations of your activities</li>
              <li>Compliant with student privacy and data protection regulations</li>
              <li>Free from copyrighted material unless you have permission to use it</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">3.3 Evidence Review</h3>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to review, approve, or reject any evidence submissions. Rejected evidence will include feedback for improvement. Schools may resubmit evidence after addressing feedback.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">3.4 Award Recognition</h3>
            <p className="text-gray-700 leading-relaxed">
              Schools that complete all three stages will receive Plastic Clever Schools recognition. We reserve the right to revoke recognition if evidence is found to be fraudulent or if schools violate these terms.
            </p>
          </CardContent>
        </Card>

        {/* Content and Intellectual Property */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              4. Content and Intellectual Property
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">4.1 Your Content</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of all content you upload to the platform (photos, videos, documents, etc.). By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content for the purposes of:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Operating and improving the Plastic Clever Schools platform</li>
              <li>Showcasing school achievements in our inspiration gallery</li>
              <li>Promoting the program in marketing materials (with your school's consent)</li>
              <li>Creating case studies to inspire other schools</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">4.2 Our Content</h3>
            <p className="text-gray-700 leading-relaxed">
              All platform content, including resources, educational materials, logos, and branding, is owned by Common Seas and its partners. You may use these materials for educational purposes within your school but may not reproduce, distribute, or commercialize them without permission.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">4.3 Student Privacy</h3>
            <p className="text-gray-700 leading-relaxed">
              When submitting photos or videos featuring students, you confirm that you have obtained appropriate consent from parents/guardians and comply with all applicable data protection laws (including GDPR, COPPA, etc.).
            </p>
          </CardContent>
        </Card>

        {/* Privacy and Data Protection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              5. Privacy and Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Our Privacy Policy explains how we collect, use, and protect your personal data. By using the platform, you consent to our data practices as described in the Privacy Policy. We are committed to protecting student privacy and complying with all applicable data protection regulations.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              For detailed information about our privacy practices, please review our{' '}
              <a href="https://commonseas.com/privacy" target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">
                Privacy Policy
              </a>.
            </p>
          </CardContent>
        </Card>

        {/* Termination and Suspension */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-coral" aria-label={t("accessibility.alert_circle_icon")} />
              6. Termination and Suspension
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to suspend or terminate your account if:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>You violate these Terms and Conditions</li>
              <li>You submit fraudulent or misleading evidence</li>
              <li>Your account is inactive for an extended period</li>
              <li>We discontinue the service (with reasonable notice)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              You may request account deletion at any time by contacting us. Upon deletion, your evidence submissions and school data will be removed, though anonymized data may be retained for statistical purposes.
            </p>
          </CardContent>
        </Card>

        {/* Disclaimers and Limitations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow" aria-label={t("accessibility.alert_circle_icon")} />
              7. Disclaimers and Limitations of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              The Plastic Clever Schools platform is provided "as is" without warranties of any kind. We do not guarantee:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Uninterrupted or error-free access to the platform</li>
              <li>The accuracy or completeness of content provided by other users</li>
              <li>That the platform will meet all your specific needs</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Terms */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.file_text_icon")} />
              8. Changes to These Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We may update these Terms and Conditions from time to time. We will notify registered users of significant changes via email or platform notification. Your continued use of the platform after changes take effect constitutes acceptance of the revised terms.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.shield_icon")} />
              9. Governing Law and Disputes
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              These Terms and Conditions are governed by the laws of England and Wales. Any disputes arising from these terms or your use of the platform shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" aria-label={t("accessibility.users_icon")} />
              10. Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              If you have questions about these Terms and Conditions, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>Plastic Clever Schools</strong><br />
                Managed by Common Seas
              </p>
              <p className="text-gray-700 mb-2">
                Email: <a href="mailto:hello@plasticcleverschools.org" className="text-pcs_blue hover:underline">hello@plasticcleverschools.org</a>
              </p>
              <p className="text-gray-700">
                Website: <a href="https://commonseas.com" target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">commonseas.com</a>
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
      <footer className="bg-navy text-white py-12">
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
                <li><a href="https://www.instagram.com/plasticcleverschools" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_instagram')}</a></li>
                <li><a href="https://www.facebook.com/plasticcleverschools" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_facebook')}</a></li>
                <li><a href="https://www.linkedin.com/company/plastic-clever-schools" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_linkedin')}</a></li>
                <li><a href="mailto:info@plasticcleverschools.org" className="hover:text-teal transition-colors">{t('footer.connect_email')}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              {t('footer.copyright')} | 
              <a href="/privacy" className="hover:text-teal transition-colors ml-1">{t('footer.privacy')}</a> | 
              <a href="/terms" className="hover:text-teal transition-colors ml-1">{t('footer.terms')}</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
