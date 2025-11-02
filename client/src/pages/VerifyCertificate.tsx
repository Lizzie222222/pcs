import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, EmptyState, ErrorState } from "@/components/ui/states";
import { CertificateTemplate } from "@/components/CertificateTemplate";
import { SocialMetaTags } from "@/components/SocialMetaTags";
import { CheckCircle, XCircle, Download, ArrowLeft, Shield } from "lucide-react";
import type { Certificate, School } from "@shared/schema";

interface CertificateVerificationResponse extends Certificate {
  school: School;
  isValid: boolean;
}

export default function VerifyCertificate() {
  const { certificateNumber } = useParams();

  const { data: certificate, isLoading, error } = useQuery<CertificateVerificationResponse>({
    queryKey: ['/api/certificates/verify', certificateNumber],
    queryFn: async () => {
      const response = await fetch(`/api/certificates/verify/${certificateNumber}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Certificate not found');
        }
        throw new Error('Failed to verify certificate');
      }
      return response.json();
    },
    enabled: !!certificateNumber,
  });

  // Fetch certificate background setting (public endpoint, no authentication required)
  const { data: backgroundData } = useQuery<{ url: string | null }>({
    queryKey: ['/api/settings/certificate-background'],
    retry: false,
  });

  // Extract metadata
  const roundNumber = certificate ? (certificate.metadata as any)?.round || 1 : 1;
  const completionDate = certificate ? new Date(certificate.completedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  // SEO and Open Graph meta tags
  const pageTitle = certificate 
    ? `Plastic Clever School Certificate - ${certificate.school.name}` 
    : 'Certificate Verification';
  const pageDescription = certificate
    ? `Round ${roundNumber} Completion Certificate - Verified on ${completionDate}`
    : 'Verify a Plastic Clever Schools certificate';
  const pageUrl = `https://plasticcleverschools.org/verify-certificate/${certificateNumber}`;
  const ogImage = certificate?.shareableUrl || 'https://plasticcleverschools.org/assets/Logo_1757848498470.png';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <LoadingSpinner size="xl" message="Verifying certificate..." fullScreen />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32">
        <SocialMetaTags
          title="Certificate Not Found"
          description="The certificate you're looking for could not be found or has been deactivated."
          url={pageUrl}
          type="website"
        />
        <div className="container mx-auto px-4 py-12">
          <ErrorState
            title="Certificate Not Found"
            description="The certificate number you entered could not be found or has been deactivated. Please check the number and try again."
            showHome={true}
            onGoHome={() => window.location.href = '/'}
            showRetry={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-16">
      <SocialMetaTags
        title={pageTitle}
        description={pageDescription}
        url={pageUrl}
        image={ogImage}
        type="website"
      />

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-navy" data-testid="text-page-title">
              Certificate Verification
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This certificate has been verified and is authentic. Below are the details of this achievement.
          </p>
        </div>

        {/* Verification Status */}
        <Card className="mb-8 border-2 border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" data-testid="icon-verified" />
              <div>
                <h2 className="text-2xl font-bold text-green-800" data-testid="text-verification-status">
                  Certificate Verified
                </h2>
                <p className="text-green-700" data-testid="text-verification-message">
                  This is a valid Plastic Clever Schools certificate
                </p>
              </div>
              <Badge className="bg-green-600 hover:bg-green-700" data-testid="badge-valid">
                Valid
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Certificate Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">School Name</h3>
                <p className="text-lg font-medium text-navy" data-testid="text-school-name">
                  {certificate.school.name}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Country</h3>
                <p className="text-lg font-medium text-navy" data-testid="text-school-country">
                  {certificate.school.country}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Round Number</h3>
                <p className="text-lg font-medium text-navy" data-testid="text-round-number">
                  Round {roundNumber}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Completion Date</h3>
                <p className="text-lg font-medium text-navy" data-testid="text-completion-date">
                  {completionDate}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Certificate Number</h3>
                <p className="text-lg font-mono font-medium text-navy" data-testid="text-certificate-number">
                  {certificate.certificateNumber}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">Issue Date</h3>
                <p className="text-lg font-medium text-navy" data-testid="text-issue-date">
                  {new Date(certificate.issuedDate || certificate.createdAt || new Date()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {certificate.description && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
                <p className="text-gray-700" data-testid="text-certificate-description">
                  {certificate.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificate Preview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Certificate Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="max-w-4xl w-full">
                <CertificateTemplate 
                  certificate={certificate} 
                  showBorder={true}
                  backgroundUrl={backgroundData?.url || undefined}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => window.location.href = `/api/certificates/${certificate.id}?download=true`}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-download-pdf"
          >
            <Download className="h-5 w-5 mr-2" />
            Download PDF Certificate
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            size="lg"
            data-testid="button-back-home-footer"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Achievement Stages Info */}
        <Card className="mt-8 bg-gradient-to-br from-blue-50 to-green-50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-navy mb-4 text-center">
              Programme Achievements
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl mb-2">✓</div>
                <h4 className="font-semibold text-navy mb-1">Inspire</h4>
                <p className="text-sm text-gray-600">Learned about plastic pollution</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl mb-2">✓</div>
                <h4 className="font-semibold text-navy mb-1">Investigate</h4>
                <p className="text-sm text-gray-600">Conducted plastic waste audit</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl mb-2">✓</div>
                <h4 className="font-semibold text-navy mb-1">Act</h4>
                <p className="text-sm text-gray-600">Took action to reduce plastic</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
