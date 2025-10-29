import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Eye,
  Building,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Loader2,
  UserCog,
} from "lucide-react";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { EvidenceAssignment } from "./EvidenceAssignment";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useTranslation, Trans } from 'react-i18next';
import type { PendingEvidence } from "@/components/admin/shared/types";
import type { User } from "@shared/schema";

interface EvidenceReviewQueueProps {
  activeTab: string;
  evidencePending: PendingEvidence[] | undefined;
  evidenceLoading: boolean;
  reviewData: {
    evidenceId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null;
  setReviewData: (data: {
    evidenceId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null) => void;
  reviewEvidenceMutation: any;
  bulkEvidenceReviewMutation: any;
  bulkEvidenceDeleteMutation: any;
  deleteEvidenceMutation: any;
  bulkEvidenceDialogOpen: boolean;
  setBulkEvidenceDialogOpen: (open: boolean) => void;
  bulkAction: {
    type: 'approve' | 'reject' | 'delete';
    notes?: string;
  } | null;
  setBulkAction: (action: {
    type: 'approve' | 'reject' | 'delete';
    notes?: string;
  } | null) => void;
  selectedEvidence: string[];
  setSelectedEvidence: (ids: string[]) => void;
  evidenceStatusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setEvidenceStatusFilter: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
  evidenceAssigneeFilter: string;
  setEvidenceAssigneeFilter: (filter: string) => void;
  currentUserId?: string;
}

export default function EvidenceReviewQueue({
  activeTab,
  evidencePending,
  evidenceLoading,
  reviewData,
  setReviewData,
  reviewEvidenceMutation,
  bulkEvidenceReviewMutation,
  bulkEvidenceDeleteMutation,
  deleteEvidenceMutation,
  bulkEvidenceDialogOpen,
  setBulkEvidenceDialogOpen,
  bulkAction,
  setBulkAction,
  selectedEvidence,
  setSelectedEvidence,
  evidenceStatusFilter,
  setEvidenceStatusFilter,
  evidenceAssigneeFilter,
  setEvidenceAssigneeFilter,
  currentUserId,
}: EvidenceReviewQueueProps) {
  const { toast } = useToast();
  const { t } = useTranslation('admin');
  const [consentWarningDialogOpen, setConsentWarningDialogOpen] = useState(false);
  const [pendingApprovalEvidence, setPendingApprovalEvidence] = useState<PendingEvidence | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<string | null>(null);

  const { data: admins } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users?role=admin', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch admins');
      return res.json();
    }
  });

  // Helper functions
  const toggleEvidenceSelection = (evidenceId: string) => {
    setSelectedEvidence(
      selectedEvidence.includes(evidenceId)
        ? selectedEvidence.filter(id => id !== evidenceId)
        : [...selectedEvidence, evidenceId]
    );
  };

  const toggleSelectAllEvidence = () => {
    if (selectedEvidence.length === evidencePending?.length) {
      setSelectedEvidence([]);
    } else {
      setSelectedEvidence(evidencePending?.map(e => e.id) || []);
    }
  };

  const handleApproveClick = (evidence: PendingEvidence) => {
    if (evidence.school?.photoConsentStatus !== 'approved') {
      setPendingApprovalEvidence(evidence);
      setConsentWarningDialogOpen(true);
    } else {
      setReviewData({
        evidenceId: evidence.id,
        action: 'approved',
        notes: ''
      });
    }
  };

  const confirmApprovalWithoutConsent = () => {
    if (pendingApprovalEvidence) {
      setReviewData({
        evidenceId: pendingApprovalEvidence.id,
        action: 'approved',
        notes: ''
      });
      setConsentWarningDialogOpen(false);
      setPendingApprovalEvidence(null);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('reviews.evidence.title')}
            </CardTitle>
            {selectedEvidence.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {t('reviews.evidence.selectedCount', { count: selectedEvidence.length })}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setBulkAction({ type: 'approve', notes: '' });
                      setBulkEvidenceDialogOpen(true);
                    }}
                    data-testid="button-bulk-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t('reviews.evidence.buttons.bulkApprove')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setBulkAction({ type: 'reject', notes: '' });
                      setBulkEvidenceDialogOpen(true);
                    }}
                    data-testid="button-bulk-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {t('reviews.evidence.buttons.bulkReject')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setBulkAction({ type: 'delete' });
                      setBulkEvidenceDialogOpen(true);
                    }}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('reviews.evidence.buttons.delete')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg flex-1">
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  evidenceStatusFilter === 'all'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-gray-600 hover:text-navy'
                }`}
                onClick={() => setEvidenceStatusFilter('all')}
                data-testid="filter-evidence-all"
              >
                {t('reviews.evidence.filters.all')}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  evidenceStatusFilter === 'pending'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-gray-600 hover:text-navy'
                }`}
                onClick={() => setEvidenceStatusFilter('pending')}
                data-testid="filter-evidence-pending"
              >
                {t('reviews.evidence.filters.pending')}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  evidenceStatusFilter === 'approved'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-gray-600 hover:text-navy'
                }`}
                onClick={() => setEvidenceStatusFilter('approved')}
                data-testid="filter-evidence-approved"
              >
                {t('reviews.evidence.filters.approved')}
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  evidenceStatusFilter === 'rejected'
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-gray-600 hover:text-navy'
                }`}
                onClick={() => setEvidenceStatusFilter('rejected')}
                data-testid="filter-evidence-rejected"
              >
                {t('reviews.evidence.filters.rejected')}
              </button>
            </div>

            {/* Assignee Filter */}
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-gray-500" />
              <Select
                value={evidenceAssigneeFilter}
                onValueChange={setEvidenceAssigneeFilter}
                data-testid="filter-assignee"
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('reviews.evidence.filters.filterByAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reviews.evidence.filters.allEvidence')}</SelectItem>
                  <SelectItem value="unassigned">{t('reviews.evidence.filters.unassigned')}</SelectItem>
                  {currentUserId && (
                    <SelectItem value="me">{t('reviews.evidence.filters.assignedToMe')}</SelectItem>
                  )}
                  {admins?.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.firstName} {admin.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {evidencePending && evidencePending.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedEvidence.length === evidencePending.length}
                onChange={toggleSelectAllEvidence}
                className="rounded border-gray-300"
                data-testid="checkbox-select-all-evidence"
              />
              <label className="text-sm text-gray-600">
                {t('reviews.evidence.selectAll', { count: evidencePending.length })}
              </label>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {evidenceLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-5 bg-gray-200 rounded w-48"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-28"></div>
                        </div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : evidencePending && evidencePending.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('reviews.evidence.emptyState.title')}</h3>
              <p className="text-gray-500">{t('reviews.evidence.emptyState.description')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evidencePending?.map((evidence) => (
                <div
                  key={evidence.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedEvidence.includes(evidence.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  data-testid={`evidence-${evidence.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={selectedEvidence.includes(evidence.id)}
                        onChange={() => toggleEvidenceSelection(evidence.id)}
                        className="rounded border-gray-300"
                        data-testid={`checkbox-evidence-${evidence.id}`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-navy">{evidence.title}</h3>
                        <Badge className={getStageColor(evidence.stage)}>
                          {evidence.stage}
                        </Badge>
                        <Badge variant="outline" className="bg-yellow text-black">
                          {evidence.status}
                        </Badge>
                        {evidence.visibility === 'public' && (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            {t('reviews.evidence.badges.public')}
                          </Badge>
                        )}
                        {evidence.school?.photoConsentStatus === 'approved' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            {t('reviews.evidence.badges.photoApproved')}
                          </Badge>
                        )}
                        {evidence.school?.photoConsentStatus === 'pending' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            {t('reviews.evidence.badges.photoPending')}
                          </Badge>
                        )}
                        {(!evidence.school?.photoConsentStatus || evidence.school?.photoConsentStatus === 'rejected') && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            <Shield className="h-3 w-3 mr-1" />
                            {t('reviews.evidence.badges.noPhotoConsent')}
                          </Badge>
                        )}
                        {(() => {
                          const submittedDate = new Date(evidence.submittedAt);
                          const now = new Date();
                          const hoursSinceSubmission = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                          return hoursSinceSubmission < 48 ? (
                            <Badge className="bg-pcs_coral text-white animate-pulse" data-testid={`badge-new-evidence-${evidence.id}`}>
                              {t('reviews.evidence.badges.new')}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-gray-600 mb-2">{evidence.description}</p>
                      <EvidenceVideoLinks videoLinks={evidence.videoLinks} />
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        {evidence.school?.name && (
                          <span className="font-medium text-gray-700">
                            <Building className="h-3 w-3 inline mr-1" />
                            {evidence.school.name}
                          </span>
                        )}
                        <span>{t('reviews.evidence.labels.schoolId', { id: evidence.schoolId })}</span>
                        <span>{t('reviews.evidence.labels.submitted', { date: new Date(evidence.submittedAt).toLocaleDateString() })}</span>
                        <span>{t('reviews.evidence.labels.files', { count: evidence.files?.length || 0 })}</span>
                      </div>

                      {/* Assignment Dropdown */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          {t('reviews.evidence.labels.assignedTo')}
                        </label>
                        <EvidenceAssignment
                          evidenceId={evidence.id}
                          currentAssignedTo={evidence.assignedTo}
                        />
                      </div>

                      {evidence.files && evidence.files.length > 0 && (
                        <EvidenceFilesGallery
                          files={evidence.files}
                          className="mt-3"
                        />
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApproveClick(evidence)}
                        data-testid={`button-approve-${evidence.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('reviews.evidence.buttons.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setReviewData({
                          evidenceId: evidence.id,
                          action: 'rejected',
                          notes: ''
                        })}
                        data-testid={`button-reject-${evidence.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('reviews.evidence.buttons.reject')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEvidenceToDelete(evidence.id);
                          setDeleteDialogOpen(true);
                        }}
                        data-testid={`button-delete-${evidence.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('reviews.evidence.buttons.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {reviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {reviewData.action === 'approved' ? t('reviews.evidence.modal.approveTitle') : t('reviews.evidence.modal.rejectTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reviews.evidence.modal.reviewNotes')} {reviewData.action === 'rejected' && <span className="text-red-500">{t('reviews.evidence.modal.required')}</span>}
                </label>
                <Textarea
                  value={reviewData.notes}
                  onChange={(e) => setReviewData(reviewData ? { ...reviewData, notes: e.target.value } : null)}
                  placeholder={
                    reviewData.action === 'approved'
                      ? t('reviews.evidence.modal.feedbackOptional')
                      : t('reviews.evidence.modal.feedbackRequired')
                  }
                  rows={4}
                  data-testid="textarea-review-notes"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setReviewData(null)}
                  className="flex-1"
                  data-testid="button-cancel-review"
                >
                  {t('reviews.evidence.modal.cancel')}
                </Button>
                <Button
                  className={`flex-1 ${reviewData.action === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                  onClick={() => {
                    if (reviewData.action === 'rejected' && !reviewData.notes.trim()) {
                      toast({
                        title: t('reviews.evidence.toasts.reviewNotesRequired'),
                        description: t('reviews.evidence.toasts.feedbackRequired'),
                        variant: "destructive",
                      });
                      return;
                    }
                    reviewEvidenceMutation.mutate({
                      evidenceId: reviewData.evidenceId,
                      status: reviewData.action,
                      reviewNotes: reviewData.notes,
                    });
                  }}
                  disabled={reviewEvidenceMutation.isPending}
                  data-testid="button-confirm-review"
                >
                  {reviewEvidenceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {reviewEvidenceMutation.isPending ? t('reviews.evidence.modal.processing') : t('reviews.evidence.modal.confirm')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Consent Warning Dialog */}
      <AlertDialog open={consentWarningDialogOpen} onOpenChange={setConsentWarningDialogOpen}>
        <AlertDialogContent data-testid="dialog-consent-warning">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {t('reviews.evidence.consentWarning.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="text-base">
                <Trans i18nKey="reviews.evidence.consentWarning.noConsent" ns="admin">
                  This school has <strong>not provided approved photo consent</strong>.
                </Trans>
              </p>
              <p className="text-sm text-gray-600">
                {pendingApprovalEvidence?.school?.photoConsentStatus === 'pending'
                  ? t('reviews.evidence.consentWarning.statusPending')
                  : pendingApprovalEvidence?.school?.photoConsentStatus === 'rejected'
                  ? t('reviews.evidence.consentWarning.statusRejected')
                  : t('reviews.evidence.consentWarning.statusNone')}
              </p>
              <p className="text-sm text-gray-600">
                <Trans i18nKey="reviews.evidence.consentWarning.disclaimer" ns="admin">
                  Approving this evidence means it <strong>will not be eligible</strong> for use in public case studies or promotional materials unless photo consent is later approved.
                </Trans>
              </p>
              <p className="font-medium text-gray-900">
                {t('reviews.evidence.consentWarning.confirmQuestion')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-consent-warning">
              {t('reviews.evidence.consentWarning.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprovalWithoutConsent}
              className="!bg-yellow-600 hover:!bg-yellow-700 !text-white"
              data-testid="button-confirm-consent-warning"
            >
              {t('reviews.evidence.consentWarning.approveAnyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Evidence Operations Dialog */}
      {bulkEvidenceDialogOpen && bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {bulkAction.type === 'approve' ? t('reviews.evidence.bulkDialog.approveTitle') :
               bulkAction.type === 'reject' ? t('reviews.evidence.bulkDialog.rejectTitle') :
               t('reviews.evidence.bulkDialog.deleteTitle')}
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  {t('reviews.evidence.bulkDialog.affectedCount', { count: selectedEvidence.length })}
                </p>
              </div>

              {(bulkAction.type === 'approve' || bulkAction.type === 'reject') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('reviews.evidence.bulkDialog.reviewNotes')} {bulkAction.type === 'reject' && <span className="text-red-500">{t('reviews.evidence.bulkDialog.required')}</span>}
                  </label>
                  <Textarea
                    value={bulkAction.notes || ''}
                    onChange={(e) => setBulkAction(bulkAction ? { ...bulkAction, notes: e.target.value } : null)}
                    placeholder={
                      bulkAction.type === 'approve'
                        ? t('reviews.evidence.bulkDialog.feedbackOptional')
                        : t('reviews.evidence.bulkDialog.feedbackRequired')
                    }
                    rows={4}
                    data-testid="textarea-bulk-review-notes"
                  />
                </div>
              )}

              {bulkAction.type === 'delete' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    {t('reviews.evidence.bulkDialog.deleteWarning')}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkEvidenceDialogOpen(false);
                    setBulkAction(null);
                  }}
                  className="flex-1"
                  data-testid="button-cancel-bulk-operation"
                >
                  {t('reviews.evidence.bulkDialog.cancel')}
                </Button>
                <Button
                  className={`flex-1 ${
                    bulkAction.type === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                    bulkAction.type === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={() => {
                    if (bulkAction.type === 'reject' && !bulkAction.notes?.trim()) {
                      toast({
                        title: t('reviews.evidence.bulkDialog.toasts.reviewNotesRequired'),
                        description: t('reviews.evidence.bulkDialog.toasts.feedbackRequired'),
                        variant: "destructive",
                      });
                      return;
                    }

                    if (bulkAction.type === 'delete') {
                      bulkEvidenceDeleteMutation.mutate(selectedEvidence);
                    } else {
                      bulkEvidenceReviewMutation.mutate({
                        evidenceIds: selectedEvidence,
                        status: bulkAction.type as 'approved' | 'rejected',
                        reviewNotes: bulkAction.notes || '',
                      });
                    }
                  }}
                  disabled={bulkEvidenceReviewMutation.isPending || bulkEvidenceDeleteMutation.isPending}
                  data-testid="button-confirm-bulk-operation"
                >
                  {(bulkEvidenceReviewMutation.isPending || bulkEvidenceDeleteMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {(bulkEvidenceReviewMutation.isPending || bulkEvidenceDeleteMutation.isPending) ? t('reviews.evidence.bulkDialog.processing') : t('reviews.evidence.bulkDialog.confirm')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-evidence">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              {t('reviews.evidence.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('reviews.evidence.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('reviews.evidence.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (evidenceToDelete) {
                  deleteEvidenceMutation.mutate(evidenceToDelete);
                  setDeleteDialogOpen(false);
                  setEvidenceToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteEvidenceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('reviews.evidence.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
