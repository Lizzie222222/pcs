import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Trophy,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Building,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Calendar,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
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

  // Review state
  const [reviewType, setReviewType] = useState<'evidence' | 'audits' | 'photo-consent'>('evidence');
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
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
  const [consentWarningDialogOpen, setConsentWarningDialogOpen] = useState(false);
  const [pendingApprovalEvidence, setPendingApprovalEvidence] = useState<PendingEvidence | null>(null);

  // Evidence query with status filter
  const { data: pendingEvidence, isLoading: evidenceLoading } = useQuery<PendingEvidence[]>({
    queryKey: ['/api/admin/evidence', evidenceStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (evidenceStatusFilter && evidenceStatusFilter !== 'all') {
        params.append('status', evidenceStatusFilter);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setReviewData(null);
      toast({
        title: "Success",
        description: "Evidence review submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit evidence review.",
        variant: "destructive",
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setAuditReviewData(null);
      toast({
        title: "Success",
        description: "Audit review submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit audit review.",
        variant: "destructive",
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setBulkEvidenceDialogOpen(false);
      setBulkAction(null);
      setSelectedEvidence([]);
      toast({
        title: "Success",
        description: "Bulk evidence review completed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete bulk evidence review.",
        variant: "destructive",
      });
    },
  });

  // Bulk evidence delete mutation
  const bulkEvidenceDeleteMutation = useMutation({
    mutationFn: async (evidenceIds: string[]) => {
      await apiRequest('DELETE', '/api/admin/evidence/bulk-delete', {
        evidenceIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setBulkEvidenceDialogOpen(false);
      setBulkAction(null);
      setSelectedEvidence([]);
      toast({
        title: "Success",
        description: "Selected evidence deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete evidence.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for bulk operations
  const toggleEvidenceSelection = (evidenceId: string) => {
    setSelectedEvidence(prev =>
      prev.includes(evidenceId)
        ? prev.filter(id => id !== evidenceId)
        : [...prev, evidenceId]
    );
  };

  const toggleSelectAllEvidence = () => {
    if (selectedEvidence.length === pendingEvidence?.length) {
      setSelectedEvidence([]);
    } else {
      setSelectedEvidence(pendingEvidence?.map(e => e.id) || []);
    }
  };

  // Handle approve click with photo consent check
  const handleApproveClick = (evidence: PendingEvidence) => {
    // Check if school has approved photo consent
    if (evidence.school?.photoConsentStatus !== 'approved') {
      // Show warning dialog
      setPendingApprovalEvidence(evidence);
      setConsentWarningDialogOpen(true);
    } else {
      // Proceed with approval directly
      setReviewData({
        evidenceId: evidence.id,
        action: 'approved',
        notes: ''
      });
    }
  };

  // Confirm approval without photo consent
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
      <div className="space-y-4">
        {/* Sub-tabs for Evidence and Audits */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              reviewType === 'evidence'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setReviewType('evidence')}
            data-testid="subtab-evidence"
          >
            Evidence Review
            {stats && stats.pendingEvidence > 0 && (
              <Badge className="ml-2 bg-red-500 text-white" data-testid="badge-evidence-count">
                {stats.pendingEvidence}
              </Badge>
            )}
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              reviewType === 'audits'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setReviewType('audits')}
            data-testid="subtab-audits"
          >
            Audit Review
            {pendingAudits.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white" data-testid="badge-audits-count">
                {pendingAudits.length}
              </Badge>
            )}
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              reviewType === 'photo-consent'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setReviewType('photo-consent')}
            data-testid="tab-review-photo-consent"
          >
            Photo Consent
            {pendingPhotoConsent.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {pendingPhotoConsent.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Evidence Review Content */}
        {reviewType === 'evidence' && (
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
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mt-4">
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

              {pendingEvidence && pendingEvidence.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedEvidence.length === pendingEvidence.length}
                    onChange={toggleSelectAllEvidence}
                    className="rounded border-gray-300"
                    data-testid="checkbox-select-all-evidence"
                  />
                  <label className="text-sm text-gray-600">
                    Select All ({pendingEvidence.length} items)
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
              ) : pendingEvidence && pendingEvidence.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">All Caught Up!</h3>
                  <p className="text-gray-500">No pending evidence submissions to review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingEvidence?.map((evidence) => (
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
                            {/* Photo Consent Permission Badge */}
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
        )}

        {/* Audit Review Content */}
        {reviewType === 'audits' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Review Queue
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {auditsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-6 bg-gray-200 rounded w-48"></div>
                            <div className="h-6 bg-gray-200 rounded w-20"></div>
                            <div className="h-6 bg-gray-200 rounded w-20"></div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-4 bg-gray-200 rounded w-28"></div>
                          </div>
                          <div className="h-24 bg-gray-200 rounded"></div>
                          <div className="flex gap-2">
                            <div className="h-9 bg-gray-200 rounded w-24"></div>
                            <div className="h-9 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingAudits.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No Pending Audits"
                  description="All audits have been reviewed. Great work!"
                />
              ) : (
                <div className="space-y-4">
                  {pendingAudits.map((audit) => (
                    <div
                      key={audit.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      data-testid={`audit-card-${audit.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-navy text-lg" data-testid={`text-school-name-${audit.id}`}>
                              {audit.school?.name || 'Unknown School'}
                            </h3>
                            <Badge variant="outline" data-testid={`text-school-country-${audit.id}`}>
                              <MapPin className="h-3 w-3 mr-1" />
                              {audit.school?.country || 'Unknown'}
                            </Badge>
                            <Badge className="bg-blue-500 text-white" data-testid={`text-audit-status-${audit.id}`}>
                              {audit.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <span data-testid={`text-submitted-by-${audit.id}`}>
                              Submitted by: {audit.submitter?.firstName || 'Unknown'} {audit.submitter?.lastName || ''}
                            </span>
                            <span data-testid={`text-submitted-at-${audit.id}`}>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(audit.submittedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <Accordion type="single" collapsible className="w-full bg-white rounded-lg border" data-testid={`accordion-audit-${audit.id}`}>
                            <AccordionItem value="part1" className="border-b">
                              <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part1-${audit.id}`}>
                                Part 1: School Information
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part1-${audit.id}`}>
                                {audit.part1Data ? (
                                  <div className="space-y-2 text-sm">
                                    <div><strong>School Name:</strong> {audit.part1Data.schoolName}</div>
                                    {audit.part1Data.studentCount && <div><strong>Number of Students:</strong> {audit.part1Data.studentCount}</div>}
                                    {audit.part1Data.staffCount && <div><strong>Number of Staff:</strong> {audit.part1Data.staffCount}</div>}
                                    <div><strong>Audit Date:</strong> {audit.part1Data.auditDate}</div>
                                    {audit.part1Data.auditTeam && <div><strong>Audit Team Members:</strong> {audit.part1Data.auditTeam}</div>}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No data available</p>
                                )}
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="part2" className="border-b">
                              <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part2-${audit.id}`}>
                                Part 2: Lunchroom & Staffroom
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part2-${audit.id}`}>
                                {audit.part2Data ? (
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2 text-navy">Lunchroom</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Plastic Bottles: {audit.part2Data.lunchroomPlasticBottles || 0}</div>
                                        <div>Plastic Cups: {audit.part2Data.lunchroomPlasticCups || 0}</div>
                                        <div>Plastic Cutlery: {audit.part2Data.lunchroomPlasticCutlery || 0}</div>
                                        <div>Plastic Straws: {audit.part2Data.lunchroomPlasticStraws || 0}</div>
                                        <div>Food Packaging: {audit.part2Data.lunchroomFoodPackaging || 0}</div>
                                        <div>Cling Film: {audit.part2Data.lunchroomClingFilm || 0}</div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2 text-navy">Staffroom</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Plastic Bottles: {audit.part2Data.staffroomPlasticBottles || 0}</div>
                                        <div>Plastic Cups: {audit.part2Data.staffroomPlasticCups || 0}</div>
                                        <div>Food Packaging: {audit.part2Data.staffroomFoodPackaging || 0}</div>
                                      </div>
                                    </div>
                                    {audit.part2Data.lunchroomNotes && (
                                      <div className="text-sm">
                                        <strong>Additional Notes:</strong> {audit.part2Data.lunchroomNotes}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No data available</p>
                                )}
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="part3" className="border-b">
                              <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part3-${audit.id}`}>
                                Part 3: Classrooms & Bathrooms
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part3-${audit.id}`}>
                                {audit.part3Data ? (
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2 text-navy">Classrooms</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Pens & Pencils: {audit.part3Data.classroomPensPencils || 0}</div>
                                        <div>Stationery Items: {audit.part3Data.classroomStationery || 0}</div>
                                        <div>Bottles & Cups: {audit.part3Data.classroomBottles || 0}</div>
                                        <div>Other Items: {audit.part3Data.classroomOther || 0}</div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2 text-navy">Bathrooms</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Soap Dispensers: {audit.part3Data.bathroomSoap || 0}</div>
                                        <div>Other Items: {audit.part3Data.bathroomOther || 0}</div>
                                      </div>
                                    </div>
                                    {audit.part3Data.classroomNotes && (
                                      <div className="text-sm">
                                        <strong>Additional Notes:</strong> {audit.part3Data.classroomNotes}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No data available</p>
                                )}
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="part4">
                              <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part4-${audit.id}`}>
                                Part 4: Waste Management
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part4-${audit.id}`}>
                                {audit.part4Data ? (
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <strong>Has Recycling System:</strong> {audit.part4Data.hasRecyclingSystem ? 'Yes' : 'No'}
                                    </div>
                                    {audit.part4Data.recyclingBinLocations && (
                                      <div>
                                        <strong>Recycling Bin Locations:</strong> {audit.part4Data.recyclingBinLocations}
                                      </div>
                                    )}
                                    <div>
                                      <strong>Plastic Waste Destination:</strong> {audit.part4Data.plasticWasteDestination}
                                    </div>
                                    <div>
                                      <strong>Composts Organic Waste:</strong> {audit.part4Data.compostsOrganicWaste ? 'Yes' : 'No'}
                                    </div>
                                    <div>
                                      <strong>Has Plastic Reduction Policy:</strong> {audit.part4Data.hasPlasticReductionPolicy ? 'Yes' : 'No'}
                                    </div>
                                    {audit.part4Data.reductionPolicyDetails && (
                                      <div>
                                        <strong>Policy Details:</strong> {audit.part4Data.reductionPolicyDetails}
                                      </div>
                                    )}
                                    {audit.part4Data.wasteManagementNotes && (
                                      <div>
                                        <strong>Additional Notes:</strong> {audit.part4Data.wasteManagementNotes}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No data available</p>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>

                          {audit.totalPlasticItems !== undefined && (
                            <div className="mt-4 bg-gray-50 rounded-lg p-3 border">
                              <p className="text-sm font-medium text-gray-700">
                                Total Plastic Items: <span className="text-pcs_blue font-semibold text-lg">{audit.totalPlasticItems}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => setAuditReviewData({
                              auditId: audit.id,
                              action: 'approved',
                              notes: ''
                            })}
                            data-testid={`button-approve-audit-${audit.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setAuditReviewData({
                              auditId: audit.id,
                              action: 'rejected',
                              notes: ''
                            })}
                            data-testid={`button-reject-audit-${audit.id}`}
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
        )}

        {/* Photo Consent Review Content */}
        {reviewType === 'photo-consent' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Photo Consent Review Queue
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {pendingPhotoConsent.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No Pending Photo Consent"
                  description="All photo consent submissions have been reviewed!"
                />
              ) : (
                <div className="space-y-4">
                  {pendingPhotoConsent.map((school) => (
                    <div key={school.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{school.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {school.country}
                            </span>
                            {school.photoConsentUploadedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(school.photoConsentUploadedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {school.photoConsentDocumentUrl && (
                            <div className="mt-2">
                              <a
                                href={school.photoConsentDocumentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-pcs_blue hover:underline text-sm"
                                data-testid={`link-view-consent-${school.id}`}
                              >
                                <Eye className="h-4 w-4" />
                                View Document
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => {
                              if (confirm(`Approve photo consent for ${school.name}?`)) {
                                approvePhotoConsentMutation.mutate({ schoolId: school.id, notes: '' });
                              }
                            }}
                            data-testid={`button-approve-consent-${school.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const notes = prompt(`Rejection notes for ${school.name}:`);
                              if (notes && notes.trim()) {
                                rejectPhotoConsentMutation.mutate({ schoolId: school.id, notes });
                              } else if (notes !== null) {
                                alert('Rejection notes are required');
                              }
                            }}
                            data-testid={`button-reject-consent-${school.id}`}
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
        )}
      </div>

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
                  onChange={(e) => setReviewData(prev => prev ? { ...prev, notes: e.target.value } : null)}
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

      {/* Audit Review Modal */}
      {auditReviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {auditReviewData.action === 'approved' ? 'Approve Audit' : 'Reject Audit'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Notes {auditReviewData.action === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  value={auditReviewData.notes}
                  onChange={(e) => setAuditReviewData(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder={
                    auditReviewData.action === 'approved'
                      ? 'Optional feedback for the school...'
                      : 'Please provide feedback on why this audit was rejected...'
                  }
                  rows={4}
                  data-testid="textarea-audit-review-notes"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAuditReviewData(null)}
                  className="flex-1"
                  data-testid="button-cancel-audit-review"
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${auditReviewData.action === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                  onClick={() => {
                    if (auditReviewData.action === 'rejected' && !auditReviewData.notes.trim()) {
                      toast({
                        title: "Review Notes Required",
                        description: "Please provide feedback when rejecting audit.",
                        variant: "destructive",
                      });
                      return;
                    }
                    reviewAuditMutation.mutate({
                      auditId: auditReviewData.auditId,
                      approved: auditReviewData.action === 'approved',
                      reviewNotes: auditReviewData.notes,
                    });
                  }}
                  disabled={reviewAuditMutation.isPending}
                  data-testid="button-confirm-audit-review"
                >
                  {reviewAuditMutation.isPending ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    onChange={(e) => setBulkAction(prev => prev ? { ...prev, notes: e.target.value } : null)}
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
