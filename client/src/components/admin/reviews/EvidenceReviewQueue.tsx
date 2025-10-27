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
  const [consentWarningDialogOpen, setConsentWarningDialogOpen] = useState(false);
  const [pendingApprovalEvidence, setPendingApprovalEvidence] = useState<PendingEvidence | null>(null);

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
              Evidence Review Queue
            </CardTitle>
            {selectedEvidence.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedEvidence.length} selected
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
                    Bulk Approve
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
                    Bulk Reject
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
                    Delete
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
                All
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
                Pending
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
                Approved
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
                Rejected
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
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Evidence</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {currentUserId && (
                    <SelectItem value="me">Assigned to Me</SelectItem>
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
                Select All ({evidencePending.length} items)
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
              <h3 className="text-lg font-semibold text-gray-600 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No pending evidence submissions to review.</p>
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
                            Public
                          </Badge>
                        )}
                        {evidence.school?.photoConsentStatus === 'approved' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Photo Approved
                          </Badge>
                        )}
                        {evidence.school?.photoConsentStatus === 'pending' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            <ShieldAlert className="h-3 w-3 mr-1" />
                            Photo Pending
                          </Badge>
                        )}
                        {(!evidence.school?.photoConsentStatus || evidence.school?.photoConsentStatus === 'rejected') && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            <Shield className="h-3 w-3 mr-1" />
                            No Photo Consent
                          </Badge>
                        )}
                        {(() => {
                          const submittedDate = new Date(evidence.submittedAt);
                          const now = new Date();
                          const hoursSinceSubmission = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
                          return hoursSinceSubmission < 48 ? (
                            <Badge className="bg-pcs_coral text-white animate-pulse" data-testid={`badge-new-evidence-${evidence.id}`}>
                              NEW
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
                        <span>School ID: {evidence.schoolId}</span>
                        <span>Submitted: {new Date(evidence.submittedAt).toLocaleDateString()}</span>
                        <span>Files: {evidence.files?.length || 0}</span>
                      </div>

                      {/* Assignment Dropdown */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Assigned To:
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
                        Approve
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
                        Reject
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
              {reviewData.action === 'approved' ? 'Approve Evidence' : 'Reject Evidence'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes {reviewData.action === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  value={reviewData.notes}
                  onChange={(e) => setReviewData(reviewData ? { ...reviewData, notes: e.target.value } : null)}
                  placeholder={
                    reviewData.action === 'approved'
                      ? 'Optional feedback for the school...'
                      : 'Please provide feedback on why this evidence was rejected...'
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
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${reviewData.action === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                  onClick={() => {
                    if (reviewData.action === 'rejected' && !reviewData.notes.trim()) {
                      toast({
                        title: "Review Notes Required",
                        description: "Please provide feedback when rejecting evidence.",
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
                  {reviewEvidenceMutation.isPending ? 'Processing...' : 'Confirm'}
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
              Approve Without Photo Consent? 📸
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="text-base">
                This school has <strong>not provided approved photo consent</strong>.
              </p>
              <p className="text-sm text-gray-600">
                {pendingApprovalEvidence?.school?.photoConsentStatus === 'pending'
                  ? 'Their photo consent document is currently under review.'
                  : pendingApprovalEvidence?.school?.photoConsentStatus === 'rejected'
                  ? 'Their photo consent document was rejected.'
                  : 'No photo consent document has been uploaded.'}
              </p>
              <p className="text-sm text-gray-600">
                Approving this evidence means it <strong>will not be eligible</strong> for use in public case studies or promotional materials unless photo consent is later approved.
              </p>
              <p className="font-medium text-gray-900">
                Are you sure you want to approve this submission?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-consent-warning">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprovalWithoutConsent}
              className="!bg-yellow-600 hover:!bg-yellow-700 !text-white"
              data-testid="button-confirm-consent-warning"
            >
              Yes, Approve Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Evidence Operations Dialog */}
      {bulkEvidenceDialogOpen && bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {bulkAction.type === 'approve' ? 'Bulk Approve Evidence' :
               bulkAction.type === 'reject' ? 'Bulk Reject Evidence' :
               'Bulk Delete Evidence'}
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  This action will affect <strong>{selectedEvidence.length}</strong> evidence submissions.
                </p>
              </div>

              {(bulkAction.type === 'approve' || bulkAction.type === 'reject') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes {bulkAction.type === 'reject' && <span className="text-red-500">*</span>}
                  </label>
                  <Textarea
                    value={bulkAction.notes || ''}
                    onChange={(e) => setBulkAction(bulkAction ? { ...bulkAction, notes: e.target.value } : null)}
                    placeholder={
                      bulkAction.type === 'approve'
                        ? 'Optional feedback for all schools...'
                        : 'Please provide feedback on why these evidence submissions were rejected...'
                    }
                    rows={4}
                    data-testid="textarea-bulk-review-notes"
                  />
                </div>
              )}

              {bulkAction.type === 'delete' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> This action cannot be undone. All selected evidence submissions will be permanently deleted.
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
                  Cancel
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
                        title: "Review Notes Required",
                        description: "Please provide feedback when rejecting evidence submissions.",
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
                  {(bulkEvidenceReviewMutation.isPending || bulkEvidenceDeleteMutation.isPending) ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
