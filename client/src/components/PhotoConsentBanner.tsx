import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface PhotoConsentBannerProps {
  schoolId: string;
}

export function PhotoConsentBanner({ schoolId }: PhotoConsentBannerProps) {
  const { t } = useTranslation('dashboard');
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch photo consent status
  const { data: consentStatus } = useQuery<{
    status: string | null;
    documentUrl: string | null;
    uploadedAt: Date | null;
    approvedAt: Date | null;
    reviewNotes: string | null;
  }>({
    queryKey: ['/api/schools', schoolId, 'photo-consent'],
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/jpg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: t('photo_consent.toast_invalid_file_type'),
        description: t('photo_consent.toast_invalid_file_type_desc'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('photo_consent.toast_file_too_large'),
        description: t('photo_consent.toast_file_too_large_desc'),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiRequest('POST', `/api/schools/${schoolId}/photo-consent/upload`, formData);
      
      toast({
        title: t('photo_consent.toast_success'),
        description: t('photo_consent.toast_success_desc'),
      });

      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId, 'photo-consent'] });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        title: t('photo_consent.toast_upload_failed'),
        description: error.message || t('photo_consent.toast_upload_failed_desc'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Don't show banner if approved
  if (consentStatus?.status === 'approved') {
    return null;
  }

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertCircle className="h-5 w-5 text-orange-600" />
      <AlertDescription className="ml-2">
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-semibold text-orange-900 mb-2">
              {t('photo_consent.title')}
            </p>
            <p className="text-sm text-orange-800 mb-3">
              {t('photo_consent.description')}
            </p>
          </div>

          {consentStatus?.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">{t('photo_consent.status_pending')}</span>
            </div>
          )}

          {consentStatus?.status === 'rejected' && consentStatus?.reviewNotes && (
            <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">{t('photo_consent.status_rejected')}</p>
                <p>{consentStatus.reviewNotes}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <a href="/Photo_Consent_Confirmation_Template_2025.docx" download>
              <Button variant="outline" size="sm" data-testid="button-download-consent-template">
                <Download className="h-4 w-4 mr-2" />
                {t('photo_consent.download_template')}
              </Button>
            </a>

            <Button 
              variant="default" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid="button-upload-consent"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? t('photo_consent.uploading') : consentStatus?.documentUrl ? t('photo_consent.reupload_document') : t('photo_consent.upload_signed_document')}
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {consentStatus?.documentUrl && (
              <a href={consentStatus.documentUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" data-testid="button-view-consent-doc">
                  {t('photo_consent.view_uploaded_document')}
                </Button>
              </a>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
