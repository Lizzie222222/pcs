import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, LoadingSpinner } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Building,
  MapPin,
  Users,
  Mail,
  Globe,
  Target,
  TrendingUp,
  Award,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Image as ImageIcon,
  Eye,
  Filter,
  AlertCircle,
  Edit2,
  Save,
  X,
  Link2,
  Star,
} from "lucide-react";
import type { EvidenceWithSchool, EvidenceRequirement } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface SchoolQuickViewDialogProps {
  school: {
    id: string;
    name: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SchoolUser {
  userId: string;
  role: 'head_teacher' | 'teacher' | 'pending_teacher';
  isVerified: boolean;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface EditingEvidence {
  id: string;
  title: string;
  description: string;
}

interface AssignmentDialog {
  evidenceId: string;
  evidenceName: string;
  evidenceStage: string;
}

export default function SchoolQuickViewDialog({
  school,
  open,
  onOpenChange,
}: SchoolQuickViewDialogProps) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'inspire' | 'investigate' | 'act'>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithSchool | null>(null);
  const [evidenceDetailsOpen, setEvidenceDetailsOpen] = useState(false);
  
  // Edit state
  const [editingEvidence, setEditingEvidence] = useState<EditingEvidence | null>(null);
  const [assignmentDialog, setAssignmentDialog] = useState<AssignmentDialog | null>(null);
  const [assignmentStage, setAssignmentStage] = useState<'inspire' | 'investigate' | 'act'>('inspire');
  const [selectedRequirement, setSelectedRequirement] = useState<string>("");
  const [markAsBonus, setMarkAsBonus] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<any>(null);
  const [statusChangeConfirm, setStatusChangeConfirm] = useState<{ evidenceId: string; newStatus: string } | null>(null);
  const [visibilityWarning, setVisibilityWarning] = useState<{ evidenceId: string; newVisibility: string; message: string } | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ evidenceId: string; requirementId: string; requirementTitle: string; duplicateStatus: string; markAsBonus: boolean } | null>(null);

  // Fetch school details
  const { data: schoolDetails, isLoading: schoolLoading } = useQuery<any>({
    queryKey: [`/api/schools/${school?.id}`],
    enabled: !!school?.id && open,
  });

  // Fetch school users/teachers
  const { data: schoolUsers = [], isLoading: usersLoading } = useQuery<SchoolUser[]>({
    queryKey: [`/api/schools/${school?.id}/team`],
    enabled: !!school?.id && open,
  });

  // Fetch evidence
  const { data: evidenceList = [], isLoading: evidenceLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', { schoolId: school?.id }],
    enabled: !!school?.id && open,
  });

  // Fetch evidence requirements for assignment
  const { data: requirements = [] } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
    enabled: !!assignmentDialog,
  });

  // Get primary contact (head teacher or first teacher)
  const primaryContact = schoolUsers.find(u => u.role === 'head_teacher' && u.isVerified)
    || schoolUsers.find(u => u.role === 'teacher' && u.isVerified)
    || schoolUsers[0];

  // Calculate evidence statistics
  const evidenceStats = {
    total: evidenceList.length,
    approved: evidenceList.filter(e => e.status === 'approved').length,
    pending: evidenceList.filter(e => e.status === 'pending').length,
    rejected: evidenceList.filter(e => e.status === 'rejected').length,
    inspire: evidenceList.filter(e => e.stage === 'inspire').length,
    investigate: evidenceList.filter(e => e.stage === 'investigate').length,
    act: evidenceList.filter(e => e.stage === 'act').length,
  };

  // Filter evidence
  const filteredEvidence = evidenceList.filter(evidence => {
    if (statusFilter !== 'all' && evidence.status !== statusFilter) return false;
    if (stageFilter !== 'all' && evidence.stage !== stageFilter) return false;
    return true;
  });

  // Mutations
  const updateEvidenceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest('PATCH', `/api/admin/evidence/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: [`/api/schools/${school?.id}`] });
      toast({ title: "Evidence updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update evidence", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const checkDuplicateMutation = useMutation({
    mutationFn: async ({ evidenceId, requirementId }: { evidenceId: string; requirementId: string }) => {
      return apiRequest('POST', `/api/admin/evidence/${evidenceId}/check-duplicate`, { requirementId });
    },
  });

  const assignRequirementMutation = useMutation({
    mutationFn: async ({ evidenceId, requirementId }: { evidenceId: string; requirementId: string }) => {
      return apiRequest('PATCH', `/api/admin/evidence/${evidenceId}/assign-requirement`, { evidenceRequirementId: requirementId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: [`/api/schools/${school?.id}`] });
      setAssignmentDialog(null);
      setSelectedRequirement("");
      setDuplicateCheckResult(null);
      setMarkAsBonus(false);
      toast({ title: "Requirement assigned successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to assign requirement", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const markBonusMutation = useMutation({
    mutationFn: async ({ evidenceId, isBonus }: { evidenceId: string; isBonus: boolean }) => {
      return apiRequest('PATCH', `/api/admin/evidence/${evidenceId}/mark-bonus`, { isBonus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: [`/api/schools/${school?.id}`] });
      toast({ title: "Bonus status updated successfully" });
    },
  });

  // Helper functions
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'investigate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'act': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getFileForThumbnail = (evidence: EvidenceWithSchool) => {
    const files = evidence.files as any[] || [];
    
    const imageFile = files.find((f: any) => 
      f.mimeType?.startsWith('image/') || f.type?.startsWith('image/')
    );
    if (imageFile) return { type: 'image', url: imageFile.url };
    
    const pdfFile = files.find((f: any) => 
      f.mimeType?.includes('pdf') || f.type?.includes('pdf')
    );
    if (pdfFile) return { type: 'pdf', url: pdfFile.url };
    
    return null;
  };

  const handleEvidenceClick = (evidence: EvidenceWithSchool) => {
    if (!editMode) {
      setSelectedEvidence(evidence);
      setEvidenceDetailsOpen(true);
    }
  };

  const handleEditEvidence = (evidence: EvidenceWithSchool) => {
    setEditingEvidence({
      id: evidence.id,
      title: evidence.title,
      description: evidence.description || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingEvidence) return;
    
    await updateEvidenceMutation.mutateAsync({
      id: editingEvidence.id,
      updates: {
        title: editingEvidence.title,
        description: editingEvidence.description,
      },
    });
    
    setEditingEvidence(null);
  };

  const handleCancelEdit = () => {
    setEditingEvidence(null);
  };

  const handleStatusChange = async (evidenceId: string, newStatus: string) => {
    // Show confirmation for reject action
    if (newStatus === 'rejected') {
      setStatusChangeConfirm({ evidenceId, newStatus });
      return;
    }
    
    await updateEvidenceMutation.mutateAsync({
      id: evidenceId,
      updates: { status: newStatus },
    });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeConfirm) return;
    
    await updateEvidenceMutation.mutateAsync({
      id: statusChangeConfirm.evidenceId,
      updates: { status: statusChangeConfirm.newStatus },
    });
    
    setStatusChangeConfirm(null);
  };

  const handleVisibilityChange = async (evidence: EvidenceWithSchool, newVisibility: string) => {
    // Validate visibility rules
    const parentalConsent = (evidence.parentalConsentFiles as any[] || []);
    
    if (newVisibility === 'public') {
      if (evidence.status !== 'approved') {
        setVisibilityWarning({
          evidenceId: evidence.id,
          newVisibility,
          message: "Only approved evidence can be set to public. Please approve this evidence first.",
        });
        return;
      }
      
      if (parentalConsent.length === 0) {
        setVisibilityWarning({
          evidenceId: evidence.id,
          newVisibility,
          message: "This evidence lacks parental consent files. Setting to public may violate privacy rules. Continue anyway?",
        });
        return;
      }
    }
    
    await updateEvidenceMutation.mutateAsync({
      id: evidence.id,
      updates: { visibility: newVisibility },
    });
  };

  const confirmVisibilityChange = async () => {
    if (!visibilityWarning) return;
    
    await updateEvidenceMutation.mutateAsync({
      id: visibilityWarning.evidenceId,
      updates: { visibility: visibilityWarning.newVisibility },
    });
    
    setVisibilityWarning(null);
  };

  const handleOpenAssignment = (evidence: EvidenceWithSchool) => {
    setAssignmentDialog({
      evidenceId: evidence.id,
      evidenceName: evidence.title,
      evidenceStage: evidence.stage,
    });
    setAssignmentStage(evidence.stage as 'inspire' | 'investigate' | 'act');
    setSelectedRequirement("");
    setDuplicateCheckResult(null);
    setDuplicateWarning(null);
    setMarkAsBonus(false);
  };

  const handleCloseAssignmentDialog = () => {
    setAssignmentDialog(null);
    setAssignmentStage('inspire');
    setSelectedRequirement("");
    setDuplicateCheckResult(null);
    setDuplicateWarning(null);
    setMarkAsBonus(false);
  };

  const handleRequirementSelect = async (requirementId: string) => {
    setSelectedRequirement(requirementId);
    setDuplicateCheckResult(null);
    setDuplicateWarning(null);
    
    if (!assignmentDialog) return;
    
    // Check for duplicates
    const result = await checkDuplicateMutation.mutateAsync({
      evidenceId: assignmentDialog.evidenceId,
      requirementId,
    });
    
    setDuplicateCheckResult(result);
  };

  const handleAssignRequirement = async () => {
    if (!assignmentDialog || !selectedRequirement) return;
    
    // Check if duplicate exists - if so, show confirmation dialog
    if (duplicateCheckResult?.hasDuplicate) {
      setDuplicateWarning({
        evidenceId: assignmentDialog.evidenceId,
        requirementId: selectedRequirement,
        requirementTitle: duplicateCheckResult.requirementTitle || 'this requirement',
        duplicateStatus: duplicateCheckResult.duplicate?.status || 'existing',
        markAsBonus: markAsBonus,
      });
      return; // Wait for user confirmation
    }
    
    // No duplicate, proceed with assignment
    await confirmAssignRequirement();
  };

  const confirmAssignRequirement = async () => {
    if (!assignmentDialog || !selectedRequirement) return;
    
    const shouldMarkAsBonus = duplicateWarning?.markAsBonus ?? markAsBonus;
    
    if (shouldMarkAsBonus) {
      // Mark as bonus first, then assign
      await markBonusMutation.mutateAsync({
        evidenceId: assignmentDialog.evidenceId,
        isBonus: true,
      });
    }
    
    await assignRequirementMutation.mutateAsync({
      evidenceId: assignmentDialog.evidenceId,
      requirementId: selectedRequirement,
    });
    
    // Close duplicate warning if it was shown
    setDuplicateWarning(null);
  };

  if (!school) return null;

  const isLoading = schoolLoading || usersLoading || evidenceLoading;

  // Filter requirements by selected assignment stage
  const filteredRequirements = assignmentDialog
    ? requirements.filter(r => r.stage === assignmentStage)
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-school-quick-view">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2" data-testid="text-school-name">
                <Building className="h-5 w-5 text-pcs_blue" />
                {school.name}
              </DialogTitle>
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                data-testid="button-toggle-edit-mode"
              >
                {editMode ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Exit Edit Mode
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Mode
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* School Details Section */}
              <Card data-testid="card-school-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building className="h-5 w-5 text-pcs_blue" />
                    School Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Country
                      </label>
                      <p className="text-base mt-1" data-testid="text-country">
                        {schoolDetails?.country || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        School Type
                      </label>
                      <p className="text-base mt-1 capitalize" data-testid="text-type">
                        {schoolDetails?.type?.replace('_', ' ') || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Student Count
                      </label>
                      <p className="text-base mt-1" data-testid="text-student-count">
                        {schoolDetails?.studentCount || 'N/A'}
                      </p>
                    </div>

                    {schoolDetails?.address && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Address
                        </label>
                        <p className="text-base mt-1" data-testid="text-address">
                          {schoolDetails.address}
                        </p>
                      </div>
                    )}

                    {(schoolDetails?.postcode || schoolDetails?.zipCode) && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {schoolDetails?.postcode ? 'Postcode' : 'Zip Code'}
                        </label>
                        <p className="text-base mt-1" data-testid="text-postcode">
                          {schoolDetails?.postcode || schoolDetails?.zipCode}
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Primary Contact
                      </label>
                      <p className="text-base mt-1" data-testid="text-primary-contact">
                        {primaryContact?.user ? (
                          <>
                            {primaryContact.user.firstName} {primaryContact.user.lastName}
                            {' '}({primaryContact.user.email})
                            <Badge className="ml-2 text-xs" variant="outline">
                              {primaryContact.role.replace('_', ' ')}
                            </Badge>
                          </>
                        ) : 'No contact available'}
                      </p>
                    </div>

                    {schoolDetails?.website && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </label>
                        <a
                          href={schoolDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base mt-1 text-pcs_blue hover:underline flex items-center gap-1"
                          data-testid="link-website"
                        >
                          Visit Website
                          <Globe className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Progress Metrics Section */}
              <Card data-testid="card-progress-metrics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-pcs_blue" />
                    Progress Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Current Stage
                      </label>
                      <Badge className={`mt-2 ${getStageBadgeColor(schoolDetails?.currentStage || '')}`} data-testid="badge-current-stage">
                        {schoolDetails?.currentStage || 'N/A'}
                      </Badge>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Progress
                      </label>
                      <p className="text-2xl font-bold text-pcs_blue mt-1" data-testid="text-progress-percentage">
                        {schoolDetails?.progressPercentage || 0}%
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Current Round
                      </label>
                      <p className="text-2xl font-bold mt-1" data-testid="text-current-round">
                        {schoolDetails?.currentRound || 1}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Rounds Completed
                      </label>
                      <p className="text-2xl font-bold mt-1" data-testid="text-rounds-completed">
                        {schoolDetails?.roundsCompleted || 0}
                      </p>
                    </div>

                    <div className="col-span-2 md:col-span-3 lg:col-span-1">
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                        Stage Completion
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={schoolDetails?.inspireCompleted 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                          data-testid="badge-inspire-completed"
                        >
                          {schoolDetails?.inspireCompleted ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          Inspire
                        </Badge>
                        <Badge
                          className={schoolDetails?.investigateCompleted 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                          data-testid="badge-investigate-completed"
                        >
                          {schoolDetails?.investigateCompleted ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          Investigate
                        </Badge>
                        <Badge
                          className={schoolDetails?.actCompleted 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                          data-testid="badge-act-completed"
                        >
                          {schoolDetails?.actCompleted ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          Act
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evidence Statistics Section */}
              <Card data-testid="card-evidence-statistics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-pcs_blue" />
                    Evidence Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                      <p className="text-3xl font-bold text-pcs_blue mt-1" data-testid="text-evidence-total">
                        {evidenceStats.total}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                      <p className="text-3xl font-bold text-green-600 mt-1" data-testid="text-evidence-approved">
                        {evidenceStats.approved}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-1" data-testid="text-evidence-pending">
                        {evidenceStats.pending}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                      <p className="text-3xl font-bold text-red-600 mt-1" data-testid="text-evidence-rejected">
                        {evidenceStats.rejected}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Inspire</p>
                      <p className="text-2xl font-bold mt-1" data-testid="text-evidence-inspire">
                        {evidenceStats.inspire}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Investigate</p>
                      <p className="text-2xl font-bold mt-1" data-testid="text-evidence-investigate">
                        {evidenceStats.investigate}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Act</p>
                      <p className="text-2xl font-bold mt-1" data-testid="text-evidence-act">
                        {evidenceStats.act}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evidence Grid Section */}
              <Card data-testid="card-evidence-grid">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg">
                      <ImageIcon className="h-5 w-5 text-pcs_blue" />
                      Evidence Gallery
                    </div>
                    <div className="flex gap-2">
                      <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                        <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={stageFilter} onValueChange={(value: any) => setStageFilter(value)}>
                        <SelectTrigger className="w-[140px]" data-testid="select-stage-filter">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          <SelectItem value="inspire">Inspire</SelectItem>
                          <SelectItem value="investigate">Investigate</SelectItem>
                          <SelectItem value="act">Act</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredEvidence.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No Evidence Found"
                      description="No evidence matches the selected filters."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredEvidence.map((evidence) => {
                        const thumbnail = getFileForThumbnail(evidence);
                        const isEditing = editingEvidence?.id === evidence.id;
                        
                        return (
                          <Card
                            key={evidence.id}
                            className={`${!editMode ? 'cursor-pointer hover:shadow-lg' : ''} transition-shadow ${editMode ? 'border-pcs_blue border-2' : ''}`}
                            onClick={() => handleEvidenceClick(evidence)}
                            data-testid={`card-evidence-${evidence.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                                {thumbnail?.type === 'image' ? (
                                  <img
                                    src={thumbnail.url}
                                    alt={evidence.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : thumbnail?.type === 'pdf' ? (
                                  <PDFThumbnail url={thumbnail.url} />
                                ) : (
                                  <FileText className="h-12 w-12 text-gray-400" />
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                {isEditing ? (
                                  <>
                                    <Input
                                      value={editingEvidence.title}
                                      onChange={(e) => setEditingEvidence({ ...editingEvidence, title: e.target.value })}
                                      placeholder="Evidence title"
                                      className="mb-2"
                                      data-testid={`input-edit-title-${evidence.id}`}
                                    />
                                    <Textarea
                                      value={editingEvidence.description}
                                      onChange={(e) => setEditingEvidence({ ...editingEvidence, description: e.target.value })}
                                      placeholder="Evidence description"
                                      rows={3}
                                      className="mb-2"
                                      data-testid={`textarea-edit-description-${evidence.id}`}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveEdit();
                                        }}
                                        disabled={updateEvidenceMutation.isPending}
                                        data-testid={`button-save-edit-${evidence.id}`}
                                      >
                                        <Save className="h-4 w-4 mr-1" />
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancelEdit();
                                        }}
                                        data-testid={`button-cancel-edit-${evidence.id}`}
                                      >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-semibold text-sm line-clamp-2" data-testid={`text-evidence-title-${evidence.id}`}>
                                        {evidence.title}
                                      </h4>
                                      {!editMode && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 shrink-0"
                                          data-testid={`button-view-evidence-${evidence.id}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      )}
                                      {editMode && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 shrink-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditEvidence(evidence);
                                          }}
                                          data-testid={`button-edit-evidence-${evidence.id}`}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {evidence.description && typeof evidence.description === 'string' && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                        {evidence.description}
                                      </p>
                                    )}
                                    
                                    <div className="flex flex-wrap gap-2">
                                      <Badge className={getStageBadgeColor(evidence.stage || '')} data-testid={`badge-evidence-stage-${evidence.id}`}>
                                        {evidence.stage || 'N/A'}
                                      </Badge>
                                      
                                      {editMode ? (
                                        <Select
                                          value={evidence.status || 'pending'}
                                          onValueChange={(value) => handleStatusChange(evidence.id, value)}
                                        >
                                          <SelectTrigger className="w-[120px] h-6 text-xs" data-testid={`select-status-${evidence.id}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Badge className={getStatusBadgeColor(evidence.status || '')} data-testid={`badge-evidence-status-${evidence.id}`}>
                                          {evidence.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                          {evidence.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                          {evidence.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                          {evidence.status || 'N/A'}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {editMode && (
                                      <div className="space-y-2 pt-2 border-t">
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor={`visibility-${evidence.id}`} className="text-xs">
                                            Visibility
                                          </Label>
                                          <Select
                                            value={evidence.visibility || 'registered'}
                                            onValueChange={(value) => handleVisibilityChange(evidence, value)}
                                          >
                                            <SelectTrigger className="w-[100px] h-6 text-xs" data-testid={`select-visibility-${evidence.id}`}>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="public">Public</SelectItem>
                                              <SelectItem value="registered">Registered</SelectItem>
                                              <SelectItem value="private">Private</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenAssignment(evidence);
                                          }}
                                          data-testid={`button-assign-requirement-${evidence.id}`}
                                        >
                                          <Link2 className="h-3 w-3 mr-1" />
                                          Assign to Requirement
                                        </Button>
                                      </div>
                                    )}
                                    
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                      {evidence.submittedAt ? new Date(evidence.submittedAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                  </>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Evidence Details Dialog */}
      {selectedEvidence && (
        <Dialog open={evidenceDetailsOpen} onOpenChange={setEvidenceDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-evidence-details">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between" data-testid="text-evidence-detail-title">
                <span>{selectedEvidence.title}</span>
                <div className="flex gap-2">
                  <Badge className={getStageBadgeColor(selectedEvidence.stage || '')}>
                    {selectedEvidence.stage || 'N/A'}
                  </Badge>
                  <Badge className={getStatusBadgeColor(selectedEvidence.status || '')}>
                    {selectedEvidence.status || 'N/A'}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedEvidence.description && typeof selectedEvidence.description === 'string' && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300" data-testid="text-evidence-description">
                    {String(selectedEvidence.description)}
                  </p>
                </div>
              )}

              {Array.isArray(selectedEvidence.files) && selectedEvidence.files.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Files</h3>
                  <EvidenceFilesGallery files={selectedEvidence.files as any[]} />
                </div>
              ) : null}

              {selectedEvidence.videoLinks && typeof selectedEvidence.videoLinks === 'string' && (
                <div>
                  <h3 className="font-semibold mb-2">Video Links</h3>
                  <EvidenceVideoLinks videoLinks={selectedEvidence.videoLinks} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Submitted</label>
                  <p className="text-sm mt-1">
                    {selectedEvidence.submittedAt ? new Date(selectedEvidence.submittedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                {selectedEvidence.visibility && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Visibility</label>
                    <p className="text-sm mt-1 capitalize">
                      {selectedEvidence.visibility}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Assignment Dialog */}
      {assignmentDialog && (
        <Dialog open={!!assignmentDialog} onOpenChange={(open) => !open && handleCloseAssignmentDialog()}>
          <DialogContent className="max-w-lg" data-testid="dialog-assign-requirement">
            <DialogHeader>
              <DialogTitle>Assign to Requirement</DialogTitle>
              <DialogDescription>
                Assign "{assignmentDialog.evidenceName}" to a requirement
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="stage-select">Select Stage</Label>
                <Select value={assignmentStage} onValueChange={(value: 'inspire' | 'investigate' | 'act') => {
                  setAssignmentStage(value);
                  setSelectedRequirement("");
                  setDuplicateCheckResult(null);
                  setDuplicateWarning(null);
                }}>
                  <SelectTrigger id="stage-select" data-testid="select-stage-assignment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspire">Inspire</SelectItem>
                    <SelectItem value="investigate">Investigate</SelectItem>
                    <SelectItem value="act">Act</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="requirement-select">Select Requirement</Label>
                <Select value={selectedRequirement} onValueChange={handleRequirementSelect}>
                  <SelectTrigger id="requirement-select" data-testid="select-requirement-assignment">
                    <SelectValue placeholder="Choose a requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRequirements.map((req) => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {duplicateCheckResult?.hasDuplicate && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    School already has {duplicateCheckResult.duplicate.status} evidence for "{duplicateCheckResult.requirementTitle}".
                    You can mark this as bonus evidence to assign anyway.
                  </AlertDescription>
                </Alert>
              )}
              
              {duplicateCheckResult?.hasDuplicate && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mark-bonus"
                    checked={markAsBonus}
                    onCheckedChange={setMarkAsBonus}
                    data-testid="switch-mark-bonus"
                  />
                  <Label htmlFor="mark-bonus" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Mark as Bonus Evidence
                  </Label>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseAssignmentDialog}
                  data-testid="button-cancel-assignment"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignRequirement}
                  disabled={!selectedRequirement || assignRequirementMutation.isPending}
                  data-testid="button-confirm-assignment"
                >
                  {assignRequirementMutation.isPending ? <LoadingSpinner /> : 'Assign'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Change Confirmation */}
      <AlertDialog open={!!statusChangeConfirm} onOpenChange={(open) => !open && setStatusChangeConfirm(null)}>
        <AlertDialogContent data-testid="dialog-confirm-status-change">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {statusChangeConfirm?.newStatus === 'rejected' ? 'reject' : 'change the status of'} this evidence?
              {statusChangeConfirm?.newStatus === 'rejected' && ' This action will notify the submitter.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-status-change">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              data-testid="button-confirm-status-change"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visibility Warning */}
      <AlertDialog open={!!visibilityWarning} onOpenChange={(open) => !open && setVisibilityWarning(null)}>
        <AlertDialogContent data-testid="dialog-visibility-warning">
          <AlertDialogHeader>
            <AlertDialogTitle>Visibility Change Warning</AlertDialogTitle>
            <AlertDialogDescription>
              {visibilityWarning?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-visibility-change">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmVisibilityChange}
              data-testid="button-confirm-visibility-change"
            >
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Assignment Warning */}
      <AlertDialog open={!!duplicateWarning} onOpenChange={(open) => !open && setDuplicateWarning(null)}>
        <AlertDialogContent data-testid="dialog-duplicate-warning">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Duplicate Evidence Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This school already has <strong>{duplicateWarning?.duplicateStatus}</strong> evidence assigned to <strong>"{duplicateWarning?.requirementTitle}"</strong>.
              </p>
              {duplicateWarning?.markAsBonus ? (
                <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  This will be marked as <strong>bonus evidence</strong> and assigned.
                </p>
              ) : (
                <p className="text-amber-600 dark:text-amber-400">
                  This could create a duplicate assignment. Consider marking it as bonus evidence.
                </p>
              )}
              <p className="text-sm">
                Are you sure you want to proceed with this assignment?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-duplicate-assignment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAssignRequirement}
              className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800"
              data-testid="button-confirm-duplicate-assignment"
            >
              Assign Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
