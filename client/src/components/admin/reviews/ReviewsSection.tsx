import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import ReviewsFilters from "./ReviewsFilters";
import EvidenceReviewQueue from "./EvidenceReviewQueue";
import AuditReviewQueue from "./AuditReviewQueue";
import PhotoConsentQueue from "./PhotoConsentQueue";
import type { AdminStats, PendingEvidence, PendingAudit } from "@/components/admin/shared/types";

interface ReviewsSectionProps {
  activeTab: string;
  stats: AdminStats | undefined;
  approvePhotoConsentMutation: any;
  rejectPhotoConsentMutation: any;
}

export default function ReviewsSection({ 
  activeTab, 
  stats,
  approvePhotoConsentMutation,
  rejectPhotoConsentMutation 
}: ReviewsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  // Review state
  const [reviewType, setReviewType] = useState<'evidence' | 'audits' | 'photo-consent'>('evidence');
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [evidenceAssigneeFilter, setEvidenceAssigneeFilter] = useState<string>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [reviewData, setReviewData] = useState<{
    evidenceId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null>(null);
  const [auditReviewData, setAuditReviewData] = useState<{
    auditId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null>(null);
  const [bulkEvidenceDialogOpen, setBulkEvidenceDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: 'approve' | 'reject' | 'delete';
    notes?: string;
  } | null>(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
  });

  // Evidence query with status and assignee filter
  const { data: pendingEvidence, isLoading: evidenceLoading } = useQuery<PendingEvidence[]>({
    queryKey: ['/api/admin/evidence', evidenceStatusFilter, evidenceAssigneeFilter, currentUser?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (evidenceStatusFilter && evidenceStatusFilter !== 'all') {
        params.append('status', evidenceStatusFilter);
      }
      if (evidenceAssigneeFilter && evidenceAssigneeFilter !== 'all') {
        if (evidenceAssigneeFilter === 'me' && currentUser?.id) {
          params.append('assignedTo', currentUser.id);
        } else if (evidenceAssigneeFilter === 'unassigned') {
          params.append('assignedTo', 'null');
        } else {
          params.append('assignedTo', evidenceAssigneeFilter);
        }
      }
      const url = `/api/admin/evidence${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: activeTab === 'reviews',
    retry: false,
  });

  // Pending audits query
  const { data: pendingAudits = [], isLoading: auditsLoading } = useQuery<PendingAudit[]>({
    queryKey: ['/api/admin/audits/pending'],
    enabled: true,
    retry: false,
  });

  // Fetch pending photo consent
  const { data: pendingPhotoConsent = [] } = useQuery<Array<{
    id: string;
    name: string;
    country: string;
    photoConsentDocumentUrl: string | null;
    photoConsentUploadedAt: Date | null;
    photoConsentStatus: string | null;
  }>>({
    queryKey: ['/api/admin/photo-consent/pending'],
    enabled: true,
    retry: false,
  });

  // Evidence review mutation
  const reviewEvidenceMutation = useMutation({
    mutationFn: async ({ evidenceId, status, reviewNotes }: {
      evidenceId: string;
      status: 'approved' | 'rejected';
      reviewNotes: string;
    }) => {
      return await apiRequest('PATCH', `/api/admin/evidence/${evidenceId}/review`, {
        status,
        reviewNotes,
      });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/evidence'] });
      
      // Snapshot the previous value for rollback
      const previousEvidence = queryClient.getQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter]);
      
      // Optimistically update cache - remove approved/rejected evidence from pending list
      queryClient.setQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter], (old = []) => {
        return old.filter(e => e.id !== variables.evidenceId);
      });
      
      // Return context with snapshot for potential rollback
      return { previousEvidence };
    },
    onSuccess: () => {
      setReviewData(null);
      toast({
        title: t('reviews.toasts.success'),
        description: t('reviews.toasts.evidenceReviewSuccess'),
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousEvidence) {
        queryClient.setQueryData(['/api/admin/evidence', evidenceStatusFilter], context.previousEvidence);
      }
      toast({
        title: t('reviews.toasts.reviewFailed'),
        description: error.message || t('reviews.toasts.evidenceReviewFailed'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
    },
  });

  // Audit review mutation
  const reviewAuditMutation = useMutation({
    mutationFn: async ({ auditId, approved, reviewNotes }: {
      auditId: string;
      approved: boolean;
      reviewNotes: string;
    }) => {
      return await apiRequest('PATCH', `/api/admin/audits/${auditId}/review`, {
        approved,
        reviewNotes,
      });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/audits/pending'] });
      
      // Snapshot the previous value for rollback
      const previousAudits = queryClient.getQueryData<PendingAudit[]>(['/api/admin/audits/pending']);
      
      // Optimistically remove reviewed audit from pending list
      queryClient.setQueryData<PendingAudit[]>(['/api/admin/audits/pending'], (old = []) => {
        return old.filter(a => a.id !== variables.auditId);
      });
      
      // Return context with snapshot for potential rollback
      return { previousAudits };
    },
    onSuccess: (_, variables) => {
      setAuditReviewData(null);
      toast({
        title: t('reviews.toasts.auditReviewed'),
        description: variables.approved ? t('reviews.toasts.auditApproved') : t('reviews.toasts.auditRejected'),
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousAudits) {
        queryClient.setQueryData(['/api/admin/audits/pending'], context.previousAudits);
      }
      toast({
        title: t('reviews.toasts.reviewFailed'),
        description: error.message || t('reviews.toasts.auditReviewFailed'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/audits/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
    },
  });

  // Bulk evidence review mutation
  const bulkEvidenceReviewMutation = useMutation({
    mutationFn: async ({ evidenceIds, status, reviewNotes }: {
      evidenceIds: string[];
      status: 'approved' | 'rejected';
      reviewNotes: string;
    }) => {
      return await apiRequest('POST', '/api/admin/evidence/bulk-review', {
        evidenceIds,
        status,
        reviewNotes,
      });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/evidence'] });
      
      // Snapshot the previous value for rollback
      const previousEvidence = queryClient.getQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter]);
      
      // Optimistically update cache - remove all selected evidence from pending list
      queryClient.setQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter], (old = []) => {
        return old.filter(e => !variables.evidenceIds.includes(e.id));
      });
      
      // Return context with snapshot for potential rollback
      return { previousEvidence };
    },
    onSuccess: () => {
      setBulkEvidenceDialogOpen(false);
      setBulkAction(null);
      setSelectedEvidence([]);
      toast({
        title: t('reviews.toasts.success'),
        description: t('reviews.toasts.bulkReviewSuccess'),
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousEvidence) {
        queryClient.setQueryData(['/api/admin/evidence', evidenceStatusFilter], context.previousEvidence);
      }
      toast({
        title: t('reviews.toasts.reviewFailed'),
        description: error.message || t('reviews.toasts.bulkReviewFailed'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
    },
  });

  // Bulk evidence delete mutation
  const bulkEvidenceDeleteMutation = useMutation({
    mutationFn: async (evidenceIds: string[]) => {
      await apiRequest('DELETE', '/api/admin/evidence/bulk-delete', {
        evidenceIds,
      });
    },
    onMutate: async (evidenceIds) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/evidence'] });
      
      // Snapshot the previous value for rollback
      const previousEvidence = queryClient.getQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter]);
      
      // Optimistically update cache - remove all deleted evidence from list
      queryClient.setQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter], (old = []) => {
        return old.filter(e => !evidenceIds.includes(e.id));
      });
      
      // Return context with snapshot for potential rollback
      return { previousEvidence };
    },
    onSuccess: () => {
      setBulkEvidenceDialogOpen(false);
      setBulkAction(null);
      setSelectedEvidence([]);
      toast({
        title: t('reviews.toasts.success'),
        description: t('reviews.toasts.bulkDeleteSuccess'),
      });
    },
    onError: (error: any, evidenceIds, context) => {
      // Rollback on error
      if (context?.previousEvidence) {
        queryClient.setQueryData(['/api/admin/evidence', evidenceStatusFilter], context.previousEvidence);
      }
      toast({
        title: t('reviews.toasts.reviewFailed'),
        description: error.message || t('reviews.toasts.bulkDeleteFailed'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
    },
  });

  // Individual evidence delete mutation
  const deleteEvidenceMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      await apiRequest('DELETE', `/api/admin/evidence/${evidenceId}`);
    },
    onMutate: async (evidenceId) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/evidence'] });
      
      // Snapshot the previous value for rollback
      const previousEvidence = queryClient.getQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter]);
      
      // Optimistically update cache - remove deleted evidence from list
      queryClient.setQueryData<PendingEvidence[]>(['/api/admin/evidence', evidenceStatusFilter], (old = []) => {
        return old.filter(e => e.id !== evidenceId);
      });
      
      // Return context with snapshot for potential rollback
      return { previousEvidence };
    },
    onSuccess: () => {
      toast({
        title: t('reviews.toasts.success'),
        description: t('reviews.toasts.evidenceDeleted'),
      });
    },
    onError: (error: any, evidenceId, context) => {
      // Rollback on error
      if (context?.previousEvidence) {
        queryClient.setQueryData(['/api/admin/evidence', evidenceStatusFilter], context.previousEvidence);
      }
      toast({
        title: t('reviews.toasts.deleteFailed'),
        description: error.message || t('reviews.toasts.evidenceDeleteFailed'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Sub-tabs for Evidence, Audits, and Photo Consent */}
      <ReviewsFilters
        reviewTab={reviewType}
        setReviewTab={setReviewType}
        evidenceCount={stats?.pendingEvidence || 0}
        auditsCount={pendingAudits.length}
        photoConsentCount={pendingPhotoConsent.length}
      />

      {/* Evidence Review Content */}
      {reviewType === 'evidence' && (
        <EvidenceReviewQueue
          activeTab={activeTab}
          evidencePending={pendingEvidence}
          evidenceLoading={evidenceLoading}
          reviewData={reviewData}
          setReviewData={setReviewData}
          reviewEvidenceMutation={reviewEvidenceMutation}
          bulkEvidenceReviewMutation={bulkEvidenceReviewMutation}
          bulkEvidenceDeleteMutation={bulkEvidenceDeleteMutation}
          deleteEvidenceMutation={deleteEvidenceMutation}
          bulkEvidenceDialogOpen={bulkEvidenceDialogOpen}
          setBulkEvidenceDialogOpen={setBulkEvidenceDialogOpen}
          bulkAction={bulkAction}
          setBulkAction={setBulkAction}
          selectedEvidence={selectedEvidence}
          setSelectedEvidence={setSelectedEvidence}
          evidenceStatusFilter={evidenceStatusFilter}
          setEvidenceStatusFilter={setEvidenceStatusFilter}
          evidenceAssigneeFilter={evidenceAssigneeFilter}
          setEvidenceAssigneeFilter={setEvidenceAssigneeFilter}
          currentUserId={currentUser?.id}
        />
      )}

      {/* Audit Review Content */}
      {reviewType === 'audits' && (
        <AuditReviewQueue
          activeTab={activeTab}
          auditsPending={pendingAudits}
          auditsLoading={auditsLoading}
          auditReviewData={auditReviewData}
          setAuditReviewData={setAuditReviewData}
          reviewAuditMutation={reviewAuditMutation}
        />
      )}

      {/* Photo Consent Review Content */}
      {reviewType === 'photo-consent' && (
        <PhotoConsentQueue
          activeTab={activeTab}
          photoConsentPending={pendingPhotoConsent}
          photoConsentLoading={false}
          approvePhotoConsentMutation={approvePhotoConsentMutation}
          rejectPhotoConsentMutation={rejectPhotoConsentMutation}
        />
      )}
    </div>
  );
}
