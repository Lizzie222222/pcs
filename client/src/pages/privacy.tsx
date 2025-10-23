import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowLeft, Shield, Database, Eye, Lock, Users, Globe, FileText, AlertCircle, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";

export default function PrivacyPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-16">
      {/* Header */}
      <div className="bg-navy text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('navigation.back_to_home')}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-privacy-title">
            Privacy Policy
          </h1>
          <p className="text-white/90 text-lg">
            Last updated: October 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" />
              Introduction
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Plastic Clever Schools ("we," "our," or "us") is committed to protecting your privacy and the privacy of students participating in our program. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Plastic Clever Schools platform.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Plastic Clever Schools is managed by Common Seas, a UK-registered charity, in partnership with Kids Against Plastic. We comply with all applicable data protection laws, including the UK General Data Protection Regulation (GDPR) and the Children's Online Privacy Protection Act (COPPA).
            </p>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" />
              1. Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">1.1 School and Teacher Information</h3>
            <p className="text-gray-700 leading-relaxed">
              When you register a school or create a teacher account, we collect:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>School name, address, country, and contact information</li>
              <li>Teacher names and email addresses</li>
              <li>Account credentials (usernames and encrypted passwords)</li>
              <li>Role information (head teacher, teacher, pending teacher)</li>
              <li>Language preferences</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">1.2 Evidence and Program Data</h3>
            <p className="text-gray-700 leading-relaxed">
              As schools participate in the program, we collect:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Photos, videos, and documents submitted as evidence</li>
              <li>Plastic audit data and reduction promises</li>
              <li>Progress through program stages (Inspire, Investigate, Act)</li>
              <li>Case study content and success stories</li>
              <li>Event registrations and participation records</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">1.3 Student Information</h3>
            <p className="text-gray-700 leading-relaxed">
              We do not directly collect personal information from students. However, photos or videos submitted by schools may include student images. Schools are responsible for:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Obtaining appropriate parental/guardian consent before submitting student images</li>
              <li>Ensuring compliance with local data protection laws</li>
              <li>Anonymizing or obscuring student identities when appropriate</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">1.4 Automatically Collected Information</h3>
            <p className="text-gray-700 leading-relaxed">
              When you use our platform, we automatically collect:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>IP addresses and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on the platform</li>
              <li>Referring websites and search terms</li>
              <li>Login times and session information</li>
            </ul>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-pcs_blue" />
              2. How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Operate the Program:</strong> Manage school registrations, track progress, and provide platform access</li>
              <li><strong>Evidence Review:</strong> Review and approve evidence submissions, provide feedback, and award recognition</li>
              <li><strong>Communication:</strong> Send program updates, resources, event notifications, and newsletters</li>
              <li><strong>Showcase Success:</strong> Feature approved evidence and case studies in our inspiration gallery to motivate other schools</li>
              <li><strong>Analytics:</strong> Analyze platform usage, track program impact, and generate anonymized statistics</li>
              <li><strong>Improvement:</strong> Enhance platform features, user experience, and educational resources</li>
              <li><strong>Support:</strong> Respond to inquiries, provide technical assistance, and resolve issues</li>
              <li><strong>Legal Compliance:</strong> Fulfill legal obligations and protect our rights and interests</li>
            </ul>
          </CardContent>
        </Card>

        {/* Legal Basis for Processing */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" />
              3. Legal Basis for Processing (GDPR)
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Under GDPR, we process your personal data based on the following legal grounds:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Consent:</strong> You have given explicit consent for us to process your information for specific purposes (e.g., newsletter subscriptions)</li>
              <li><strong>Contract:</strong> Processing is necessary to fulfill our obligations under our agreement with your school</li>
              <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate interests in operating and improving the program, provided these interests do not override your rights</li>
              <li><strong>Legal Obligation:</strong> Processing is required to comply with applicable laws and regulations</li>
            </ul>
          </CardContent>
        </Card>

        {/* Data Sharing and Disclosure */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" />
              4. Data Sharing and Disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">4.1 Within the Platform</h3>
            <p className="text-gray-700 leading-relaxed">
              Approved evidence may be shared publicly in our inspiration gallery to showcase school achievements and inspire other participants. Schools can control the visibility of their submissions.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">4.2 Service Providers</h3>
            <p className="text-gray-700 leading-relaxed">
              We work with trusted third-party service providers who assist us in operating the platform:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Cloud Storage:</strong> Google Cloud Platform for file storage and database hosting</li>
              <li><strong>Email Services:</strong> SendGrid for transactional emails and communications</li>
              <li><strong>Authentication:</strong> Google OAuth for secure single sign-on</li>
              <li><strong>Analytics:</strong> Anonymized usage analytics to improve the platform</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              These providers are contractually bound to protect your data and only use it for the purposes we specify.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">4.3 Program Partners</h3>
            <p className="text-gray-700 leading-relaxed">
              We may share anonymized program statistics with our partners (Common Seas, Kids Against Plastic) for reporting and fundraising purposes. We do not share personal information without consent.
            </p>

            <h3 className="text-lg font-semibold text-navy mt-6 mb-2">4.4 Legal Requirements</h3>
            <p className="text-gray-700 leading-relaxed">
              We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of Plastic Clever Schools, our users, or the public.
            </p>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-pcs_blue" />
              5. Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Encryption:</strong> All data transmissions use HTTPS/TLS encryption</li>
              <li><strong>Password Protection:</strong> Passwords are hashed and salted using industry-standard algorithms</li>
              <li><strong>Access Controls:</strong> Role-based access ensures users only see data they're authorized to access</li>
              <li><strong>Secure Storage:</strong> Files and database records are stored on secure cloud infrastructure</li>
              <li><strong>Regular Backups:</strong> Data is regularly backed up to prevent loss</li>
              <li><strong>Monitoring:</strong> We monitor for unauthorized access and security vulnerabilities</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              While we strive to protect your data, no method of transmission or storage is 100% secure. Please use strong passwords and notify us immediately of any suspected security breaches.
            </p>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-pcs_blue" />
              6. Data Retention
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We retain your information for as long as necessary to provide our services and fulfill the purposes described in this policy:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Active Accounts:</strong> Data is retained while your school account is active</li>
              <li><strong>Inactive Accounts:</strong> Accounts inactive for 3 years may be archived or deleted</li>
              <li><strong>Evidence Submissions:</strong> Approved evidence may be retained indefinitely for historical and inspirational purposes</li>
              <li><strong>Anonymized Data:</strong> Aggregated statistics may be retained permanently for research and reporting</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer to comply with legal obligations</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              You may request deletion of your account at any time (see Your Rights section below).
            </p>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-pcs_blue" />
              7. Your Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Under GDPR and other data protection laws, you have the following rights:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete information</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data (right to be forgotten)</li>
              <li><strong>Restriction:</strong> Request that we limit how we use your data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain types of processing (e.g., marketing)</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time where we rely on consent</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise these rights, please contact us using the information provided at the end of this policy. We will respond within 30 days.
            </p>
          </CardContent>
        </Card>

        {/* Cookies and Tracking */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" />
              8. Cookies and Tracking Technologies
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li><strong>Essential Cookies:</strong> Required for authentication and basic platform functionality</li>
              <li><strong>Preference Cookies:</strong> Remember your language settings and display preferences</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform (anonymized)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              You can control cookie settings through your browser preferences. Note that disabling essential cookies may limit platform functionality.
            </p>
          </CardContent>
        </Card>

        {/* International Data Transfers */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" />
              9. International Data Transfers
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              The Plastic Clever Schools program operates globally. Your information may be transferred to and stored in countries outside your home country, including the United Kingdom and European Economic Area.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              When transferring data internationally, we ensure appropriate safeguards are in place:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>EU-approved Standard Contractual Clauses with service providers</li>
              <li>Data Processing Agreements that comply with GDPR requirements</li>
              <li>Use of providers certified under recognized privacy frameworks</li>
            </ul>
          </CardContent>
        </Card>

        {/* Children's Privacy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-pcs_blue" />
              10. Children's Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              While our program involves schools and students, we do not knowingly collect personal information directly from children under 13 (or under 16 in the EU) without parental consent.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Teachers and schools are responsible for:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Obtaining appropriate parental/guardian consent before submitting photos or videos featuring students</li>
              <li>Ensuring student privacy is protected in all submissions</li>
              <li>Complying with COPPA, GDPR, and local child protection laws</li>
              <li>Reviewing and approving all content before submission</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              If we become aware that we have collected personal information from a child without proper consent, we will delete it promptly.
            </p>
          </CardContent>
        </Card>

        {/* Third-Party Links */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-pcs_blue" />
              11. Third-Party Links
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Our platform may contain links to third-party websites, including partner organizations and educational resources. We are not responsible for the privacy practices of these external sites.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              We encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </CardContent>
        </Card>

        {/* Changes to Privacy Policy */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-pcs_blue" />
              12. Changes to This Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform features.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              When we make significant changes, we will:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2 text-gray-700">
              <li>Update the "Last Updated" date at the top of this policy</li>
              <li>Notify registered users via email or platform notification</li>
              <li>Post a notice on the platform homepage</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Your continued use of the platform after changes take effect constitutes acceptance of the updated policy.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pcs_blue" />
              13. Contact Us & Data Protection Officer
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              If you have questions about this Privacy Policy, wish to exercise your data protection rights, or have privacy concerns, please contact us:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>Plastic Clever Schools - Data Protection</strong><br />
                Managed by Common Seas
              </p>
              <p className="text-gray-700 mb-2">
                Email: <a href="mailto:privacy@plasticcleverschools.org" className="text-pcs_blue hover:underline">privacy@plasticcleverschools.org</a>
              </p>
              <p className="text-gray-700 mb-2">
                General Inquiries: <a href="mailto:hello@plasticcleverschools.org" className="text-pcs_blue hover:underline">hello@plasticcleverschools.org</a>
              </p>
              <p className="text-gray-700">
                Website: <a href="https://commonseas.com" target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">commonseas.com</a>
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              You also have the right to lodge a complaint with your local data protection authority if you believe we have not handled your data appropriately.
            </p>
          </CardContent>
        </Card>

        {/* Acknowledgment */}
        <div className="bg-ocean-blue/10 border-l-4 border-ocean-blue p-6 rounded-r-lg mb-12">
          <p className="text-gray-800 leading-relaxed">
            <strong>Your privacy is important to us. We are committed to protecting your personal information and being transparent about our data practices.</strong>
          </p>
          <p className="text-gray-700 mt-4 text-sm">
            Thank you for trusting Plastic Clever Schools with your data as we work together to reduce plastic waste in schools worldwide! 🌍🔒
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
