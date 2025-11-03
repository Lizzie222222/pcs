import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
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
  ArrowLeft,
  School,
  Users,
  FileText,
  BarChart3,
  Settings,
  MapPin,
  Globe,
  Mail,
  Calendar,
  Target,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  ExternalLink,
  Loader2,
  TrendingUp,
  Award,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ReductionPromise } from "@shared/schema";
import { calculateAggregateMetrics } from "@shared/plasticMetrics";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { UploadEvidenceDialog } from "@/components/admin/UploadEvidenceDialog";
import { EditEvidenceDialog } from "@/components/admin/EditEvidenceDialog";
import { UploadPhotoConsentDialog } from "@/components/admin/UploadPhotoConsentDialog";
import { UploadAuditDialog } from "@/components/admin/UploadAuditDialog";

// Helper function to calculate current round progress percentage
function getCurrentRoundProgress(progressPercentage: number, currentRound?: number, roundsCompleted?: number): number {
  // If no valid progress data, return 0
  if (progressPercentage === undefined || progressPercentage === null) return 0;
  
  // If school has completed the current round, show 100%
  if (currentRound && roundsCompleted && roundsCompleted >= currentRound) {
    return 100;
  }
  
  // Calculate progress within current round (0-100)
  const currentProgress = progressPercentage % 100;
  
  // Return current progress (0 for fresh start of new round)
  return currentProgress;
}

interface SchoolData {
  id: string;
  name: string;
  country: string;
  currentStage: string;
  progressPercentage: number;
  currentRound?: number;
  roundsCompleted?: number;
  inspireCompleted?: boolean;
  investigateCompleted?: boolean;
  actCompleted?: boolean;
  studentCount: number;
  createdAt: string;
  primaryContactId: string;
  primaryContactEmail: string | null;
  primaryContactFirstName?: string | null;
  primaryContactLastName?: string | null;
  type?: string;
  address?: string;
  primaryLanguage?: string | null;
  photoConsentStatus?: string | null;
  photoConsentDocumentUrl?: string | null;
  photoConsentUploadedAt?: string | null;
  photoConsentApprovedAt?: string | null;
  photoConsentReviewNotes?: string | null;
}

interface SchoolTeacher {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  legacyEvidenceCount?: number;
}

interface Evidence {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  visibility: string;
  submittedAt: string;
  submittedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  files: any[];
  videoLinks: string | null;
}

export default function SchoolProfile() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [photoConsentDialogOpen, setPhotoConsentDialogOpen] = useState(false);
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  
  // School data query
  const { data: school, isLoading: schoolLoading } = useQuery<SchoolData>({
    queryKey: ['/api/admin/schools', id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/schools/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch school');
      return response.json();
    },
    enabled: !!id,
  });

  // Teachers query
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<SchoolTeacher[]>({
    queryKey: ['/api/admin/schools', id, 'teachers'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/schools/${id}/teachers`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch teachers');
      return response.json();
    },
    enabled: !!id && activeTab === 'teachers',
  });

  // Evidence query
  const { data: evidence = [], isLoading: evidenceLoading } = useQuery<Evidence[]>({
    queryKey: ['/api/admin/schools', id, 'evidence'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/schools/${id}/evidence`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    enabled: !!id && activeTab === 'evidence',
  });

  // Reduction promises query
  const { data: reductionPromises = [] } = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/school', id],
    enabled: !!id && activeTab === 'analytics',
  });

  // Photo consent status query
  const { data: photoConsentStatus } = useQuery<{
    status: string | null;
    documentUrl: string | null;
    uploadedAt: Date | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    reviewedBy: string | null;
    reviewNotes: string | null;
  } | null>({
    queryKey: ['/api/schools', id, 'photo-consent'],
    queryFn: async () => {
      const response = await fetch(`/api/schools/${id}/photo-consent`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch photo consent');
      return response.json();
    },
    enabled: !!id && activeTab === 'settings',
  });

  if (schoolLoading) {
    return <LoadingSpinner size="xl" message="Loading school profile..." fullScreen />;
  }

  if (!school) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={School}
          title="School Not Found"
          description="The school you're looking for doesn't exist or you don't have permission to view it."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32">
      {/* Header - Sticky positioned below navigation and banner */}
      <div className="bg-white border-b shadow-sm sticky top-32 z-10 mb-6">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/admin?tab=schools')}
                data-testid="button-back-to-schools"
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Schools
              </Button>
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold text-navy" data-testid="text-school-name">
                  {school.name}
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <MapPin className="h-3 w-3" />
                  {school.country}
                  {school.type && <span className="capitalize">• {school.type}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPhotoConsentDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-700 hover:bg-green-50"
                data-testid="button-upload-photo-consent"
              >
                <Upload className="h-4 w-4 mr-2" />
                Photo Consent
              </Button>
              <Button
                onClick={() => setAuditDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-purple-600 text-purple-700 hover:bg-purple-50"
                data-testid="button-upload-audit"
              >
                <Upload className="h-4 w-4 mr-2" />
                Audit
              </Button>
              <Badge className={
                school.currentStage === 'inspire' ? 'bg-pcs_blue text-white' :
                school.currentStage === 'investigate' ? 'bg-teal text-white' :
                'bg-coral text-white'
              } data-testid="badge-current-stage">
                <span className="capitalize">{school.currentStage}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tabs Navigation - Sticky positioned below header (nav 64px + banner 48px + header ~96px = ~208px) */}
          <div className="bg-white rounded-lg shadow-sm border p-1.5 sticky top-52 z-10">
            <TabsList className="bg-transparent w-full grid grid-cols-5 gap-1">
              <TabsTrigger 
                value="overview" 
                className="gap-2 data-[state=active]:bg-pcs_blue data-[state=active]:text-white" 
                data-testid="tab-overview"
              >
                <School className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="teachers" 
                className="gap-2 data-[state=active]:bg-pcs_blue data-[state=active]:text-white" 
                data-testid="tab-teachers"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Teachers</span>
              </TabsTrigger>
              <TabsTrigger 
                value="evidence" 
                className="gap-2 data-[state=active]:bg-pcs_blue data-[state=active]:text-white" 
                data-testid="tab-evidence"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Evidence</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="gap-2 data-[state=active]:bg-pcs_blue data-[state=active]:text-white" 
                data-testid="tab-analytics"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="gap-2 data-[state=active]:bg-pcs_blue data-[state=active]:text-white" 
                data-testid="tab-settings"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab school={school} />
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <TeachersTab
              schoolId={id!}
              teachers={teachers}
              isLoading={teachersLoading}
            />
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence">
            <EvidenceTab
              schoolId={id!}
              evidence={evidence}
              isLoading={evidenceLoading}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsTab
              school={school}
              reductionPromises={reductionPromises}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SettingsTab
              school={school}
              photoConsentStatus={photoConsentStatus}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialogs */}
      <UploadPhotoConsentDialog
        open={photoConsentDialogOpen}
        onOpenChange={setPhotoConsentDialogOpen}
        schoolId={id!}
      />

      <UploadAuditDialog
        open={auditDialogOpen}
        onOpenChange={setAuditDialogOpen}
        schoolId={id!}
      />
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ school }: { school: SchoolData }) {
  const { t } = useTranslation('admin');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Basic Information */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-pcs_blue" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">School Name</label>
            <p className="text-base" data-testid="text-overview-name">{school.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Country</label>
            <p className="text-base" data-testid="text-overview-country">{school.country}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">School Type</label>
            <p className="text-base capitalize" data-testid="text-overview-type">
              {school.type || 'Not specified'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Student Count</label>
            <p className="text-base" data-testid="text-overview-students">
              {school.studentCount || 'Not specified'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Primary Language</label>
            <p className="text-base" data-testid="text-overview-language">
              {school.primaryLanguage || 'English'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Joined</label>
            <p className="text-base" data-testid="text-overview-joined">
              {new Date(school.createdAt).toLocaleDateString()}
            </p>
          </div>
          {school.address && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-600">Address</label>
              <p className="text-base" data-testid="text-overview-address">{school.address}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-pcs_blue" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Current Stage</label>
            <p className="text-lg font-semibold capitalize" data-testid="text-stats-stage">
              {school.currentStage}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Current Round Progress</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pcs_blue h-2 rounded-full transition-all"
                  style={{ width: `${school.progressPercentage % 100 || (school.roundsCompleted && school.roundsCompleted > 0 ? 100 : 0)}%` }}
                />
              </div>
              <span className="text-sm font-medium" data-testid="text-stats-progress">
                {school.progressPercentage % 100 || (school.roundsCompleted && school.roundsCompleted > 0 ? 100 : 0)}%
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Current Round</label>
            <p className="text-lg font-semibold" data-testid="text-stats-round">
              Round {school.currentRound || 1}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Stage Completion</label>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                {school.inspireCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span>Inspire</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {school.investigateCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span>Investigate</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {school.actCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span>Act</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-pcs_blue" />
            Primary Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          {school.primaryContactEmail ? (
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium" data-testid="text-contact-name">
                  {school.primaryContactFirstName && school.primaryContactLastName
                    ? `${school.primaryContactFirstName} ${school.primaryContactLastName}`
                    : 'Unknown'}
                </p>
                <p className="text-sm text-gray-600" data-testid="text-contact-email">
                  {school.primaryContactEmail}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No primary contact set</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Teachers Tab Component
function TeachersTab({ schoolId, teachers, isLoading }: {
  schoolId: string;
  teachers: SchoolTeacher[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <LoadingSpinner message="Loading teachers..." />;
  }

  if (teachers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Teachers"
        description="No teachers have been added to this school yet."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5 text-pcs_blue" />
            Teachers ({teachers.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-semibold text-navy">Name</th>
                <th className="text-left p-3 font-semibold text-navy">Email</th>
                <th className="text-left p-3 font-semibold text-navy">Role</th>
                <th className="text-left p-3 font-semibold text-navy">Status</th>
                <th className="text-left p-3 font-semibold text-navy">Legacy Evidence</th>
                <th className="text-left p-3 font-semibold text-navy">Joined</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.userId} className="border-b hover:bg-gray-50">
                  <td className="p-3" data-testid={`text-teacher-name-${teacher.userId}`}>
                    {teacher.firstName && teacher.lastName
                      ? `${teacher.firstName} ${teacher.lastName}`
                      : 'Unknown'}
                  </td>
                  <td className="p-3" data-testid={`text-teacher-email-${teacher.userId}`}>
                    {teacher.email}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize">
                      {teacher.role}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {teacher.isVerified ? (
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-gray-600" data-testid={`text-legacy-evidence-${teacher.userId}`}>
                    {teacher.legacyEvidenceCount ? `${teacher.legacyEvidenceCount} submissions` : '0 submissions'}
                  </td>
                  <td className="p-3 text-gray-600">
                    {new Date(teacher.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Evidence Tab Component
function EvidenceTab({ schoolId, evidence, isLoading }: {
  schoolId: string;
  evidence: Evidence[];
  isLoading: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);

  const filteredEvidence = evidence.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterStage !== 'all' && e.stage !== filterStage) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading evidence..." />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-pcs_blue" />
              <CardTitle>Evidence Submissions ({evidence.length})</CardTitle>
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-pcs_blue hover:bg-navy"
              data-testid="button-upload-evidence"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Evidence
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-stage">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="inspire">Inspire</SelectItem>
                <SelectItem value="investigate">Investigate</SelectItem>
                <SelectItem value="act">Act</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvidence.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Evidence"
              description="No evidence submissions match the selected filters."
            />
          ) : (
            <div className="space-y-4">
              {filteredEvidence.map((ev) => (
                <Card key={ev.id} className="border-2" data-testid={`evidence-card-${ev.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg" data-testid={`text-evidence-title-${ev.id}`}>
                            {ev.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 ${
                              ev.visibility === 'public' 
                                ? 'border-green-600 text-green-700 bg-green-50' 
                                : 'border-blue-600 text-blue-700 bg-blue-50'
                            }`}
                            data-testid={`badge-visibility-${ev.id}`}
                          >
                            {ev.visibility === 'public' ? (
                              <><Eye className="h-3 w-3" /> Public</>
                            ) : (
                              <><EyeOff className="h-3 w-3" /> Private</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={
                            ev.stage === 'inspire' ? 'bg-pcs_blue' :
                            ev.stage === 'investigate' ? 'bg-teal' :
                            'bg-coral'
                          }>
                            {ev.stage}
                          </Badge>
                          <Badge className={
                            ev.status === 'approved' ? 'bg-green-600' :
                            ev.status === 'rejected' ? 'bg-red-600' :
                            'bg-yellow-600'
                          }>
                            {ev.status}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(ev.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEvidence(ev)}
                        data-testid={`button-edit-${ev.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  {ev.files && ev.files.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Files ({ev.files.length})</h4>
                        <EvidenceFilesGallery files={ev.files} />
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadEvidenceDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        schoolId={schoolId}
      />

      <EditEvidenceDialog
        open={!!editingEvidence}
        onOpenChange={(open) => !open && setEditingEvidence(null)}
        evidence={editingEvidence}
      />
    </>
  );
}

// Analytics Tab Component
function AnalyticsTab({ school, reductionPromises }: {
  school: SchoolData;
  reductionPromises: ReductionPromise[];
}) {
  const promiseMetrics = reductionPromises.length > 0
    ? calculateAggregateMetrics(reductionPromises)
    : null;

  const totalPromises = reductionPromises.length;
  const totalAnnualReduction = reductionPromises.reduce((sum, promise) => {
    const frequencyMultipliers: Record<string, number> = {
      week: 52,
      month: 12,
      year: 1,
    };
    const multiplier = frequencyMultipliers[promise.timeframeUnit] || 1;
    return sum + (promise.reductionAmount * multiplier);
  }, 0);
  const totalAnnualWeightKg = promiseMetrics ? (promiseMetrics.totalGramsReduced / 1000) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pcs_blue" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Current Round Progress</span>
              <span className="font-medium" data-testid="text-current-round-progress">
                {school.progressPercentage % 100 || (school.roundsCompleted && school.roundsCompleted > 0 ? 100 : 0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-pcs_blue h-3 rounded-full transition-all"
                style={{ width: `${school.progressPercentage % 100 || (school.roundsCompleted && school.roundsCompleted > 0 ? 100 : 0)}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Round Status</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: school.roundsCompleted || 0 }).map((_, i) => (
                <Badge key={`completed-${i}`} className="bg-green-600 text-white" data-testid={`badge-completed-round-${i + 1}`}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Round {i + 1}
                </Badge>
              ))}
              <Badge className="bg-teal text-white" data-testid="badge-current-round">
                Round {school.currentRound || 1}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Stage</p>
            <p className="text-2xl font-bold capitalize">{school.currentStage}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reduction Promises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-pcs_blue" />
            Reduction Promises
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Total Promises</p>
            <p className="text-3xl font-bold text-pcs_blue">{totalPromises}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Annual Items Reduced</p>
            <p className="text-2xl font-bold">{totalAnnualReduction.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Annual Weight (kg)</p>
            <p className="text-2xl font-bold">{totalAnnualWeightKg.toFixed(2)} kg</p>
          </div>
        </CardContent>
      </Card>

      {/* Stage Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-pcs_blue" />
            Stage Completion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Inspire</span>
            {school.inspireCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Investigate</span>
            {school.investigateCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Act</span>
            {school.actCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ school, photoConsentStatus }: {
  school: SchoolData;
  photoConsentStatus: any;
}) {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingLanguage, setEditingLanguage] = useState(false);
  const [languageValue, setLanguageValue] = useState(school.primaryLanguage || 'en');
  const [editingProgression, setEditingProgression] = useState(false);
  const [progressionData, setProgressionData] = useState({
    currentStage: school.currentStage as 'inspire' | 'investigate' | 'act',
    currentRound: school.currentRound || 1,
    inspireCompleted: school.inspireCompleted || false,
    investigateCompleted: school.investigateCompleted || false,
    actCompleted: school.actCompleted || false,
  });

  const updateLanguageMutation = useMutation({
    mutationFn: async (primaryLanguage: string) => {
      return await apiRequest('PUT', `/api/admin/schools/${school.id}`, { primaryLanguage });
    },
    onSuccess: () => {
      toast({
        title: "Language Updated",
        description: "School language preference has been updated successfully.",
      });
      setEditingLanguage(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update language preference.",
        variant: "destructive",
      });
    },
  });

  const updateProgressionMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest('PUT', `/api/admin/schools/${school.id}/progression`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Progression Updated",
        description: "School progression has been updated successfully.",
      });
      setEditingProgression(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update progression.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-pcs_blue" />
            Language Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingLanguage ? (
            <div className="flex gap-2 items-center">
              <Select value={languageValue} onValueChange={setLanguageValue}>
                <SelectTrigger className="flex-1" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="el">Greek</SelectItem>
                  <SelectItem value="id">Indonesian</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => updateLanguageMutation.mutate(languageValue)}
                disabled={updateLanguageMutation.isPending}
                data-testid="button-save-language"
              >
                {updateLanguageMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingLanguage(false)}
                data-testid="button-cancel-language"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Primary Language</p>
                <p className="text-base font-medium">{school.primaryLanguage || 'English'}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingLanguage(true);
                  setLanguageValue(school.primaryLanguage || 'en');
                }}
                data-testid="button-edit-language"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progression Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-pcs_blue" />
            Progression Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingProgression ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Stage</label>
                  <Select
                    value={progressionData.currentStage}
                    onValueChange={(value) =>
                      setProgressionData({
                        ...progressionData,
                        currentStage: value as 'inspire' | 'investigate' | 'act'
                      })
                    }
                  >
                    <SelectTrigger data-testid="select-stage">
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
                  <label className="text-sm font-medium">Current Round</label>
                  <Input
                    type="number"
                    min="1"
                    value={progressionData.currentRound}
                    onChange={(e) =>
                      setProgressionData({
                        ...progressionData,
                        currentRound: parseInt(e.target.value) || 1
                      })
                    }
                    data-testid="input-round"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Stage Completion</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={progressionData.inspireCompleted}
                      onCheckedChange={(checked) =>
                        setProgressionData({
                          ...progressionData,
                          inspireCompleted: checked as boolean
                        })
                      }
                      data-testid="checkbox-inspire"
                    />
                    <span className="text-sm">Inspire</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={progressionData.investigateCompleted}
                      onCheckedChange={(checked) =>
                        setProgressionData({
                          ...progressionData,
                          investigateCompleted: checked as boolean
                        })
                      }
                      data-testid="checkbox-investigate"
                    />
                    <span className="text-sm">Investigate</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={progressionData.actCompleted}
                      onCheckedChange={(checked) =>
                        setProgressionData({
                          ...progressionData,
                          actCompleted: checked as boolean
                        })
                      }
                      data-testid="checkbox-act"
                    />
                    <span className="text-sm">Act</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingProgression(false)}
                  data-testid="button-cancel-progression"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateProgressionMutation.mutate(progressionData)}
                  disabled={updateProgressionMutation.isPending}
                  className="bg-pcs_blue hover:bg-pcs_blue/90"
                  data-testid="button-save-progression"
                >
                  {updateProgressionMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Stage</p>
                  <p className="text-base font-medium capitalize">{school.currentStage}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingProgression(true);
                    setProgressionData({
                      currentStage: school.currentStage as 'inspire' | 'investigate' | 'act',
                      currentRound: school.currentRound || 1,
                      inspireCompleted: school.inspireCompleted || false,
                      investigateCompleted: school.investigateCompleted || false,
                      actCompleted: school.actCompleted || false,
                    });
                  }}
                  data-testid="button-edit-progression"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-gray-600">Current Round</p>
                  <p className="text-base font-medium">Round {school.currentRound || 1}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stage Completion</p>
                  <div className="flex gap-2 mt-1">
                    {school.inspireCompleted && <Badge className="bg-green-600">Inspire</Badge>}
                    {school.investigateCompleted && <Badge className="bg-green-600">Investigate</Badge>}
                    {school.actCompleted && <Badge className="bg-green-600">Act</Badge>}
                    {!school.inspireCompleted && !school.investigateCompleted && !school.actCompleted && (
                      <span className="text-sm text-gray-500">None completed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Consent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-pcs_blue" />
            Photo Consent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photoConsentStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={
                  photoConsentStatus.status === 'approved' ? 'bg-green-600' :
                  photoConsentStatus.status === 'rejected' ? 'bg-red-600' :
                  'bg-yellow-600'
                }>
                  {photoConsentStatus.status || 'Not uploaded'}
                </Badge>
              </div>
              {photoConsentStatus.documentUrl && (
                <div>
                  <span className="text-sm text-gray-600">Document</span>
                  <a
                    href={photoConsentStatus.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pcs_blue hover:underline flex items-center gap-1 text-sm"
                  >
                    View Document
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {photoConsentStatus.uploadedAt && (
                <div>
                  <span className="text-sm text-gray-600">Uploaded</span>
                  <p className="text-sm">{new Date(photoConsentStatus.uploadedAt).toLocaleDateString()}</p>
                </div>
              )}
              {photoConsentStatus.reviewNotes && (
                <div>
                  <span className="text-sm text-gray-600">Review Notes</span>
                  <p className="text-sm">{photoConsentStatus.reviewNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No photo consent information available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
