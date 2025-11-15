import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, X, Calendar, User } from "lucide-react";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { useTranslation } from "react-i18next";
import type { Evidence } from "@shared/schema";

interface EvidenceDetailModalProps {
  evidence: Evidence | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EvidenceDetailModal({ evidence, isOpen, onClose }: EvidenceDetailModalProps) {
  const { t } = useTranslation('dashboard');

  if (!evidence) return null;

  const getStatusBadge = () => {
    switch (evidence.status) {
      case 'approved':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('progress.status.approved')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {t('progress.status.pending')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <X className="h-3 w-3 mr-1" />
            {t('progress.status.rejected')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const files = evidence.files as any[] || [];

  // Helper to safely format date, handling null/undefined/empty string/invalid dates
  const formatDate = (dateValue: Date | string | null | undefined): string | null => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const submittedDate = formatDate(evidence.submittedAt);
  const reviewedDate = formatDate(evidence.reviewedAt);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="modal-evidence-detail">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-navy mb-2" data-testid="text-evidence-title">
                {evidence.title}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge()}
                <Badge variant="outline" className="text-xs" data-testid="badge-stage">
                  {evidence.stage.charAt(0).toUpperCase() + evidence.stage.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Description */}
          {evidence.description && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap" data-testid="text-description">
                {evidence.description}
              </p>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Uploaded Files</h3>
              <EvidenceFilesGallery files={files} />
            </div>
          )}

          {/* Video Links */}
          {evidence.videoLinks && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Video Links</h3>
              <EvidenceVideoLinks videoLinks={evidence.videoLinks} />
            </div>
          )}

          {/* Submission Info */}
          <div className="border-t pt-4">
            {submittedDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Calendar className="h-4 w-4" />
                <span>Submitted on {submittedDate}</span>
              </div>
            )}
            {reviewedDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Reviewed on {reviewedDate}</span>
              </div>
            )}
            {!submittedDate && !reviewedDate && (
              <p className="text-sm text-gray-500 italic">No date information available</p>
            )}
          </div>

          {/* Rejection Feedback */}
          {evidence.status === 'rejected' && evidence.reviewNotes && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-red-900 mb-1">Feedback from Reviewer</h3>
                  <p className="text-sm text-red-800 whitespace-pre-wrap" data-testid="text-review-notes">
                    {evidence.reviewNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
