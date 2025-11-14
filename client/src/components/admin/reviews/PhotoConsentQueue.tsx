import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { useTranslation } from 'react-i18next';

interface PhotoConsentQueueProps {
  activeTab: string;
  photoConsentPending: Array<{
    id: string;
    name: string;
    country: string;
    photoConsent: {
      documentUrl: string | null;
      uploadedAt: Date | null;
      status: string | null;
    } | null;
  }>;
  photoConsentLoading: boolean;
  approvePhotoConsentMutation: any;
  rejectPhotoConsentMutation: any;
}

export default function PhotoConsentQueue({
  activeTab,
  photoConsentPending,
  photoConsentLoading,
  approvePhotoConsentMutation,
  rejectPhotoConsentMutation,
}: PhotoConsentQueueProps) {
  const { t } = useTranslation('admin');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const handleApproveClick = (school: { id: string; name: string }) => {
    setSelectedSchool(school);
    setApproveDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (selectedSchool) {
      approvePhotoConsentMutation.mutate({ schoolId: selectedSchool.id, notes: '' });
      setApproveDialogOpen(false);
      setSelectedSchool(null);
    }
  };

  const handleRejectClick = (school: { id: string; name: string }) => {
    setSelectedSchool(school);
    setRejectionNotes('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedSchool && rejectionNotes.trim()) {
      rejectPhotoConsentMutation.mutate({ schoolId: selectedSchool.id, notes: rejectionNotes });
      setRejectDialogOpen(false);
      setSelectedSchool(null);
      setRejectionNotes('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('reviews.photoConsent.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {photoConsentPending.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={t('reviews.photoConsent.noPending')}
              description={t('reviews.photoConsent.allReviewed')}
            />
          ) : (
            <div className="space-y-4">
              {photoConsentPending.map((school) => (
                <div key={school.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{school.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {school.country}
                        </span>
                        {school.photoConsent?.uploadedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(school.photoConsent.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {school.photoConsent?.documentUrl && (
                        <div className="mt-2">
                          <a
                            href={school.photoConsent.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-pcs_blue hover:underline text-sm"
                            data-testid={`link-view-consent-${school.id}`}
                          >
                            <Eye className="h-4 w-4" />
                            {t('reviews.photoConsent.viewDocument')}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApproveClick({ id: school.id, name: school.name })}
                        disabled={approvePhotoConsentMutation.isPending || rejectPhotoConsentMutation.isPending}
                        data-testid={`button-approve-consent-${school.id}`}
                      >
                        {approvePhotoConsentMutation.isPending || rejectPhotoConsentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        {t('reviews.photoConsent.buttons.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick({ id: school.id, name: school.name })}
                        disabled={approvePhotoConsentMutation.isPending || rejectPhotoConsentMutation.isPending}
                        data-testid={`button-reject-consent-${school.id}`}
                      >
                        {approvePhotoConsentMutation.isPending || rejectPhotoConsentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {t('reviews.photoConsent.buttons.reject')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent data-testid="dialog-approve-consent">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reviews.photoConsent.buttons.approve')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSchool && t('reviews.photoConsent.confirmApprove', { name: selectedSchool.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-approve">
              {t('reviews.photoConsent.buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              className="bg-green-500 hover:bg-green-600"
              data-testid="button-confirm-approve"
            >
              {approvePhotoConsentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('reviews.photoConsent.buttons.approve')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog with Notes */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent data-testid="dialog-reject-consent">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reviews.photoConsent.buttons.reject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSchool && t('reviews.photoConsent.rejectionNotes', { name: selectedSchool.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder={t('reviews.photoConsent.rejectionRequired')}
              rows={4}
              data-testid="input-rejection-notes"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionNotes('');
                setSelectedSchool(null);
              }}
              data-testid="button-cancel-reject"
            >
              {t('reviews.photoConsent.buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={!rejectionNotes.trim()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-reject"
            >
              {rejectPhotoConsentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('reviews.photoConsent.buttons.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
