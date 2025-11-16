import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, LoadingSpinner } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
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
} from "lucide-react";
import type { EvidenceWithSchool } from "@shared/schema";

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

export default function SchoolQuickViewDialog({
  school,
  open,
  onOpenChange,
}: SchoolQuickViewDialogProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'inspire' | 'investigate' | 'act'>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithSchool | null>(null);
  const [evidenceDetailsOpen, setEvidenceDetailsOpen] = useState(false);

  // Fetch school details
  const { data: schoolDetails, isLoading: schoolLoading } = useQuery<any>({
    queryKey: [`/api/schools/${school?.id}`],
    queryFn: async () => {
      if (!school?.id) return null;
      const response = await fetch(`/api/schools/${school.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch school details');
      return response.json();
    },
    enabled: !!school?.id && open,
  });

  // Fetch school users/teachers
  const { data: schoolUsers = [], isLoading: usersLoading } = useQuery<SchoolUser[]>({
    queryKey: [`/api/schools/${school?.id}/team`],
    queryFn: async () => {
      if (!school?.id) return [];
      const response = await fetch(`/api/schools/${school.id}/team`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch school team');
      return response.json();
    },
    enabled: !!school?.id && open,
  });

  // Fetch evidence
  const { data: evidenceList = [], isLoading: evidenceLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', { schoolId: school?.id }],
    queryFn: async () => {
      if (!school?.id) return [];
      const params = new URLSearchParams({ schoolId: school.id });
      const response = await fetch(`/api/admin/evidence?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    enabled: !!school?.id && open,
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
    setSelectedEvidence(evidence);
    setEvidenceDetailsOpen(true);
  };

  if (!school) return null;

  const isLoading = schoolLoading || usersLoading || evidenceLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-school-quick-view">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-school-name">
              <Building className="h-5 w-5 text-pcs_blue" />
              {school.name}
            </DialogTitle>
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
                        return (
                          <Card
                            key={evidence.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow"
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
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-sm line-clamp-2" data-testid={`text-evidence-title-${evidence.id}`}>
                                    {evidence.title}
                                  </h4>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 shrink-0"
                                    data-testid={`button-view-evidence-${evidence.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
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
                                  <Badge className={getStatusBadgeColor(evidence.status || '')} data-testid={`badge-evidence-status-${evidence.id}`}>
                                    {evidence.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {evidence.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                    {evidence.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                    {evidence.status || 'N/A'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {evidence.submittedAt ? new Date(evidence.submittedAt).toLocaleDateString() : 'N/A'}
                                </p>
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
    </>
  );
}
