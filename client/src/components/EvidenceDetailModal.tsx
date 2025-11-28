import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, X, Calendar, Pencil, AlertCircle } from "lucide-react";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { TeacherEvidenceEditDialog } from "@/components/TeacherEvidenceEditDialog";
import { useTranslation } from "react-i18next";
import type { Evidence } from "@shared/schema";

interface EvidenceDetailModalProps {
  evidence: Evidence | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

export function EvidenceDetailModal({ evidence: initialEvidence, isOpen, onClose, canEdit = true }: EvidenceDetailModalProps) {
  const { t } = useTranslation('dashboard');
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Local state to hold evidence data that can be updated in-place
  const [localEvidence, setLocalEvidence] = useState<Evidence | null>(null);
  
  // Update local evidence when initial evidence changes (e.g., modal opens with new evidence)
  useEffect(() => {
    if (isOpen && initialEvidence) {
      setLocalEvidence(initialEvidence);
    }
  }, [isOpen, initialEvidence?.id]);
  
  // Reset local state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLocalEvidence(null);
    }
  }, [isOpen]);

  // Use local evidence for display, with initial evidence as fallback
  const evidence = localEvidence || initialEvidence;
  
  // Callback to update evidence after edits
  const handleEvidenceUpdated = (updatedEvidence: Evidence) => {
    setLocalEvidence(updatedEvidence);
  };

  if (!evidence) return null;

  const isPending = evidence.status === 'pending';
  const showEditButton = canEdit && isPending;

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
      case 'revision_requested':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('progress.status.revision_requested', 'Revision Requested')}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Map file properties to match EvidenceFilesGallery interface
  // Database stores: { originalName, url, size, mimeType, storagePath }
  // Gallery expects: { name, url, size, type }
  const files = (evidence.files as any[] || []).map((file: any) => ({
    name: file.name || file.originalName || 'File',
    url: file.url || file.storagePath || '',
    size: file.size || 0,
    type: file.type || file.mimeType || '',
  }));

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
            {showEditButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                data-testid="button-edit-evidence"
              >
                <Pencil className="h-4 w-4 mr-1" />
                {t('evidence.edit_button', 'Edit')}
              </Button>
            )}
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

          {/* Revision Request Feedback */}
          {evidence.status === 'revision_requested' && evidence.reviewNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-amber-900 mb-1">{t('evidence.revision_feedback', 'Revision Requested')}</h3>
                  <p className="text-sm text-amber-800 whitespace-pre-wrap" data-testid="text-revision-notes">
                    {evidence.reviewNotes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Edit Dialog for pending evidence */}
      <TeacherEvidenceEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        evidence={evidence ? {
          id: evidence.id,
          schoolId: evidence.schoolId,
          title: evidence.title,
          description: evidence.description || '',
          stage: evidence.stage,
          visibility: evidence.visibility || 'private',
          files: evidence.files as any[] || [],
          videoLinks: evidence.videoLinks || null,
          status: evidence.status || 'pending',
        } : null}
        onDeleted={onClose}
        onUpdated={handleEvidenceUpdated}
      />
    </Dialog>
  );
}
