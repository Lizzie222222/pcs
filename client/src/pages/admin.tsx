import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCountries } from "@/hooks/useCountries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import type { DateRange } from "react-day-picker";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  School, 
  Clock, 
  Users, 
  Trophy,
  CheckCircle,
  XCircle,
  Star,
  Search,
  Filter,
  Download,
  Eye,
  Mail,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Globe,
  FileText,
  Award,
  BookOpen,
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  UserPlus,
  MoreVertical,
  Shield,
  Target,
  TrendingDown,
  Droplets,
  Fish,
  Heart,
  Leaf,
  Factory,
  Trash,
  Upload,
  Image as ImageIcon,
  FileVideo,
  Music,
  Building,
  Check
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import { CaseStudyEditor } from "@/components/admin/CaseStudyEditor";
import AssignTeacherForm from "@/components/admin/AssignTeacherForm";
import UserManagementTab from "@/components/admin/UserManagementTab";
import ResourcesManagement from "@/components/admin/ResourcesManagement";
const AnalyticsContent = lazy(() => import("@/components/admin/AnalyticsContent"));
import EmailManagementSection from "@/components/admin/EmailManagementSection";
import EvidenceGalleryTab from "@/components/admin/EvidenceGalleryTab";
import PrintableFormsTab from "@/components/admin/PrintableFormsTab";
import type { ReductionPromise, Event, EventRegistration, EvidenceWithSchool, CaseStudy } from "@shared/schema";
import { calculateAggregateMetrics } from "@shared/plasticMetrics";
import { format, parseISO } from "date-fns";

interface AdminStats {
  totalSchools: number;
  pendingEvidence: number;
  featuredCaseStudies: number;
  activeUsers: number;
}

interface PendingEvidence {
  id: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  visibility: string;
  submittedAt: string;
  schoolId: string;
  submittedBy: string;
  files: any[];
  videoLinks: string | null;
}

interface SchoolData {
  id: string;
  name: string;
  country: string;
  currentStage: string;
  progressPercentage: number;
  currentRound?: number;
  inspireCompleted?: boolean;
  investigateCompleted?: boolean;
  actCompleted?: boolean;
  studentCount: number;
  createdAt: string;
  primaryContactId: string;
  primaryContactEmail: string | null;
  type?: string;
  address?: string;
  primaryLanguage?: string | null;
}

interface VerificationRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  userId: string;
  userName: string;
  userEmail: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface SchoolTeacher {
  userId: string;
  name: string;
  email: string;
  role: 'head_teacher' | 'teacher';
  isVerified: boolean;
  joinedAt: string;
}

interface SchoolWithTeachers {
  id: string;
  name: string;
  country: string;
  teachers: SchoolTeacher[];
}

interface PendingAudit {
  id: string;
  schoolId: string;
  submittedBy: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  part1Data: any;
  part2Data: any;
  part3Data: any;
  part4Data: any;
  resultsData?: any;
  totalPlasticItems?: number;
  topProblemPlastics?: any[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  submittedAt: string;
  createdAt: string;
  school: {
    id: string;
    name: string;
    country: string;
  };
  submittedByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface EvidenceRequirement {
  id: string;
  stage: 'inspire' | 'investigate' | 'act';
  title: string;
  description: string;
  orderIndex: number;
  resourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EventWithRegistrations extends Event {
  registrationsCount?: number;
}

interface EventRegistrationWithDetails extends EventRegistration {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  school: {
    id: string;
    name: string;
    country: string;
  } | null;
}

function SchoolTeachersRow({ schoolId, isExpanded }: { schoolId: string; isExpanded: boolean }) {
  const { data: teachers, isLoading, error } = useQuery<SchoolTeacher[]>({
    queryKey: ['/api/admin/schools', schoolId, 'teachers'],
    enabled: isExpanded,
  });

  if (!isExpanded) {
    return null;
  }

  if (isLoading) {
    return (
      <tr data-testid={`expanded-row-${schoolId}`}>
        <td colSpan={10} className="p-0 bg-gray-50">
          <div className="p-4 border-t">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
              <span className="text-gray-600">Loading teachers...</span>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr data-testid={`expanded-row-${schoolId}`}>
        <td colSpan={10} className="p-0 bg-gray-50">
          <div className="p-4 border-t">
            <div className="text-center py-8 text-red-600">
              Failed to load teachers. Please try again.
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr data-testid={`expanded-row-${schoolId}`}>
      <td colSpan={10} className="p-0 bg-gray-50">
        <div className="p-4 border-t">
          {teachers?.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid={`no-teachers-${schoolId}`}>
              No teachers assigned to this school yet.
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Role</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Verification</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers?.map((teacher) => (
                    <tr 
                      key={teacher.userId} 
                      className="border-b hover:bg-gray-50"
                      data-testid={`teacher-row-${schoolId}-${teacher.userId}`}
                    >
                      <td className="p-3 text-sm text-gray-700" data-testid={`teacher-name-${teacher.userId}`}>
                        {teacher.name}
                      </td>
                      <td className="p-3 text-sm text-gray-600" data-testid={`teacher-email-${teacher.userId}`}>
                        {teacher.email}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs" data-testid={`teacher-role-${teacher.userId}`}>
                          {teacher.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                        </Badge>
                      </td>
                      <td className="p-3" data-testid={`teacher-verified-${teacher.userId}`}>
                        {teacher.isVerified ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Verified
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(teacher.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function SchoolTeachersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [removingTeacher, setRemovingTeacher] = useState<{ schoolId: string; userId: string; userName: string } | null>(null);

  const { data: schoolsWithTeachers = [], isLoading } = useQuery<SchoolWithTeachers[]>({
    queryKey: ['/api/admin/school-teachers'],
  });

  const removeTeacherMutation = useMutation({
    mutationFn: async ({ schoolId, userId }: { schoolId: string; userId: string }) => {
      await apiRequest('DELETE', `/api/admin/schools/${schoolId}/teachers/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Teacher Removed",
        description: "Teacher has been successfully removed from the school.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/school-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      setRemovingTeacher(null);
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove teacher. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading teachers..." />;
  }

  if (schoolsWithTeachers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No Teachers Assigned"
        description="No teachers have been assigned to any schools yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      {schoolsWithTeachers.map((school) => (
        <div key={school.id} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSchoolId(expandedSchoolId === school.id ? null : school.id)}
            className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            data-testid={`button-expand-school-${school.id}`}
          >
            <div className="flex items-center gap-3">
              <School className="h-5 w-5 text-gray-600" />
              <div className="text-left">
                <h3 className="font-semibold text-navy">{school.name}</h3>
                <p className="text-sm text-gray-600">{school.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" data-testid={`text-teacher-count-${school.id}`}>
                {school.teachers.length} {school.teachers.length === 1 ? 'teacher' : 'teachers'}
              </Badge>
              <svg
                className={`h-5 w-5 text-gray-600 transition-transform ${expandedSchoolId === school.id ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {expandedSchoolId === school.id && (
            <div className="p-4 border-t">
              {school.teachers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No teachers assigned to this school.</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Name</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Role</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Verified</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Joined</th>
                      <th className="text-left p-2 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.teachers.map((teacher) => (
                      <tr key={teacher.userId} className="border-b hover:bg-gray-50" data-testid={`teacher-row-${teacher.userId}`}>
                        <td className="p-2 text-sm text-gray-700" data-testid={`text-teacher-name-${teacher.userId}`}>
                          {teacher.name}
                        </td>
                        <td className="p-2 text-sm text-gray-600" data-testid={`text-teacher-email-${teacher.userId}`}>
                          {teacher.email}
                        </td>
                        <td className="p-2 text-sm">
                          <Badge variant="outline" data-testid={`text-teacher-role-${teacher.userId}`}>
                            {teacher.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm" data-testid={`text-teacher-verified-${teacher.userId}`}>
                          {teacher.isVerified ? (
                            <Badge className="bg-green-500 text-white">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Not Verified</Badge>
                          )}
                        </td>
                        <td className="p-2 text-sm text-gray-600">
                          {new Date(teacher.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="p-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRemovingTeacher({ 
                              schoolId: school.id, 
                              userId: teacher.userId, 
                              userName: teacher.name 
                            })}
                            data-testid={`button-remove-teacher-${teacher.userId}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Remove Teacher Confirmation Dialog */}
      <AlertDialog open={!!removingTeacher} onOpenChange={(open) => !open && setRemovingTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingTeacher?.userName} from this school? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removingTeacher) {
                  removeTeacherMutation.mutate({
                    schoolId: removingTeacher.schoolId,
                    userId: removingTeacher.userId,
                  });
                }
              }}
              className="bg-coral hover:bg-coral/90"
              data-testid="button-confirm-remove"
            >
              Remove Teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VerificationRequestsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  const { data: verificationRequests = [], isLoading } = useQuery<VerificationRequest[]>({
    queryKey: ['/api/admin/verification-requests'],
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: 'approve' | 'reject'; notes: string }) => {
      await apiRequest('PUT', `/api/admin/verification-requests/${id}/${action}`, { notes });
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Request ${variables.action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `Verification request has been successfully ${variables.action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/school-teachers'] });
      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to process verification request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    updateVerificationMutation.mutate({
      id: selectedRequest.id,
      action: actionType,
      notes,
    });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading verification requests..." />;
  }

  const pendingRequests = verificationRequests.filter(req => req.status === 'pending');

  if (pendingRequests.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="No Pending Requests"
        description="There are no pending verification requests at the moment."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-700">School</th>
              <th className="text-left p-3 font-medium text-gray-700">Requester</th>
              <th className="text-left p-3 font-medium text-gray-700">Email</th>
              <th className="text-left p-3 font-medium text-gray-700">Evidence</th>
              <th className="text-left p-3 font-medium text-gray-700">Request Date</th>
              <th className="text-left p-3 font-medium text-gray-700">Status</th>
              <th className="text-left p-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((request) => (
              <tr key={request.id} className="border-b hover:bg-gray-50" data-testid={`verification-request-${request.id}`}>
                <td className="p-3 font-medium text-navy" data-testid={`text-school-name-${request.id}`}>
                  {request.schoolName}
                </td>
                <td className="p-3 text-gray-700" data-testid={`text-requester-name-${request.id}`}>
                  {request.userName}
                </td>
                <td className="p-3 text-gray-600" data-testid={`text-requester-email-${request.id}`}>
                  {request.userEmail}
                </td>
                <td className="p-3 text-gray-600 max-w-xs truncate" data-testid={`text-evidence-${request.id}`}>
                  {request.evidence}
                </td>
                <td className="p-3 text-gray-600">
                  {new Date(request.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800" data-testid={`text-status-${request.id}`}>
                    {request.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType('approve');
                      }}
                      data-testid={`button-approve-request-${request.id}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="bg-coral hover:bg-coral/90"
                      onClick={() => {
                        setSelectedRequest(request);
                        setActionType('reject');
                      }}
                      data-testid={`button-reject-request-${request.id}`}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setActionType(null);
          setNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Verification Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                You are about to {actionType === 'approve' ? 'approve' : 'reject'} the verification request from:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                <p className="text-sm"><strong>School:</strong> {selectedRequest?.schoolName}</p>
                <p className="text-sm"><strong>Requester:</strong> {selectedRequest?.userName} ({selectedRequest?.userEmail})</p>
                <p className="text-sm"><strong>Evidence:</strong> {selectedRequest?.evidence}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {actionType === 'reject' ? '(required)' : '(optional)'}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === 'approve' 
                  ? 'Add any notes about this approval...' 
                  : 'Please provide a reason for rejection...'}
                rows={3}
                data-testid="textarea-verification-notes"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setActionType(null);
                  setNotes('');
                }}
                data-testid="button-cancel-action"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={updateVerificationMutation.isPending || (actionType === 'reject' && !notes.trim())}
                className={actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-coral hover:bg-coral/90'}
                data-testid="button-confirm-action"
              >
                {updateVerificationMutation.isPending 
                  ? 'Processing...' 
                  : actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin({ initialTab = 'overview' }: { initialTab?: 'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' } = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'media-library'>(initialTab);
  const [reviewType, setReviewType] = useState<'evidence' | 'audits'>('evidence');
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [schoolFilters, setSchoolFilters] = useState({
    search: '',
    country: 'all',
    stage: 'all',
    language: 'all',
  });
  const [caseStudyFilters, setCaseStudyFilters] = useState({
    search: '',
    country: '',
    stage: '',
    featured: '',
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCaseStudy, setEditingCaseStudy] = useState<CaseStudy | null>(null);
  const [deletingCaseStudy, setDeletingCaseStudy] = useState<CaseStudy | null>(null);
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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientType: 'all_teachers',
    subject: '',
    preheader: '',
    title: '',
    preTitle: '',
    messageContent: '',
    template: 'announcement',
    recipients: '',
    autoTranslate: false
  });
  
  // Translation preview state
  const [translations, setTranslations] = useState<Record<string, {
    subject: string;
    preheader: string;
    title: string;
    preTitle: string;
    messageContent: string;
  }>>({});
  const [selectedPreviewLanguages, setSelectedPreviewLanguages] = useState<string[]>([]);
  const [currentViewingLanguage, setCurrentViewingLanguage] = useState<string>('en');
  const [isGeneratingTranslations, setIsGeneratingTranslations] = useState(false);
  
  // Bulk operations state
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [viewingSchool, setViewingSchool] = useState<SchoolData | null>(null);
  const [editingSchoolLanguage, setEditingSchoolLanguage] = useState(false);
  const [schoolLanguageValue, setSchoolLanguageValue] = useState<string>('');
  const [editingProgression, setEditingProgression] = useState(false);
  const [progressionFormData, setProgressionFormData] = useState({
    currentStage: 'inspire' as 'inspire' | 'investigate' | 'act',
    currentRound: 1,
    inspireCompleted: false,
    investigateCompleted: false,
    actCompleted: false,
  });
  const [showAdminEvidenceForm, setShowAdminEvidenceForm] = useState(false);
  const [evidenceFormSchoolId, setEvidenceFormSchoolId] = useState<string | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<SchoolData | null>(null);
  const [bulkEvidenceDialogOpen, setBulkEvidenceDialogOpen] = useState(false);
  const [bulkSchoolDialogOpen, setBulkSchoolDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: 'approve' | 'reject' | 'delete' | 'update';
    notes?: string;
    updates?: Record<string, any>;
  } | null>(null);

  // Expandable schools state
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

  // Evidence Requirements state
  const [activeEvidenceStage, setActiveEvidenceStage] = useState<'inspire' | 'investigate' | 'act'>('inspire');
  const [editingRequirement, setEditingRequirement] = useState<EvidenceRequirement | null>(null);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<EvidenceRequirement | null>(null);
  const [requirementDeleteDialogOpen, setRequirementDeleteDialogOpen] = useState(false);
  const [requirementFormData, setRequirementFormData] = useState({
    title: '',
    description: '',
    resourceUrl: '',
  });

  // Events state
  const [eventFilters, setEventFilters] = useState({
    status: 'all',
    eventType: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [eventDeleteDialogOpen, setEventDeleteDialogOpen] = useState(false);
  const [viewingEventRegistrations, setViewingEventRegistrations] = useState<Event | null>(null);
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<string>('all');
  const [eventFormData, setEventFormData] = useState<{
    title: string;
    description: string;
    eventType: 'workshop' | 'webinar' | 'community_event' | 'training' | 'celebration' | 'other';
    status: 'draft' | 'published' | 'cancelled' | 'completed';
    startDateTime: string;
    endDateTime: string;
    location: string;
    isVirtual: boolean;
    meetingLink: string;
    imageUrl: string;
    capacity: string;
    waitlistEnabled: boolean;
    registrationDeadline: string;
    tags: string;
  }>({
    title: '',
    description: '',
    eventType: 'workshop',
    status: 'draft',
    startDateTime: '',
    endDateTime: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    imageUrl: '',
    capacity: '',
    waitlistEnabled: false,
    registrationDeadline: '',
    tags: '',
  });

  // Event image upload state
  const [uploadedEventImage, setUploadedEventImage] = useState<{ name: string; url: string; } | null>(null);
  const [isUploadingEventImage, setIsUploadingEventImage] = useState(false);
  const eventImageInputRef = useRef<HTMLInputElement>(null);

  // Newsletter state (SendGrid)
  const [announcingEvent, setAnnouncingEvent] = useState<Event | null>(null);
  const [newsletterDialogOpen, setNewsletterDialogOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<'all_teachers' | 'custom'>('all_teachers');
  const [customEmails, setCustomEmails] = useState<string>('');
  const [selectedEventsForDigest, setSelectedEventsForDigest] = useState<Set<string>>(new Set());
  const [digestDialogOpen, setDigestDialogOpen] = useState(false);

  // Page Builder state
  const [currentEventStep, setCurrentEventStep] = useState<1 | 2 | 3>(1);
  const [uploadingPackFiles, setUploadingPackFiles] = useState<Record<number, boolean>>({});
  const [showPageBuilderWarning, setShowPageBuilderWarning] = useState(false);
  const [eventDialogTab, setEventDialogTab] = useState<'details' | 'page-builder'>('details');

  // Page Builder form schema
  const pageBuilderSchema = z.object({
    publicSlug: z.string().optional(),
    youtubeVideos: z.array(z.object({
      title: z.string().min(1, "Title is required"),
      url: z.string().url("Must be a valid URL").refine((url) => {
        return url.includes('youtube.com') || url.includes('youtu.be');
      }, "Must be a valid YouTube URL"),
      description: z.string().optional(),
    })).optional(),
    eventPackFiles: z.array(z.object({
      title: z.string().min(1, "Title is required"),
      fileUrl: z.string().min(1, "File is required"),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      description: z.string().optional(),
    })).optional(),
    testimonials: z.array(z.object({
      quote: z.string().min(1, "Quote is required"),
      author: z.string().min(1, "Author name is required"),
      role: z.string().optional(),
    })).optional(),
  });

  type PageBuilderFormData = z.infer<typeof pageBuilderSchema>;

  // Helper function to generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Page Builder form
  const pageBuilderForm = useForm<PageBuilderFormData>({
    resolver: zodResolver(pageBuilderSchema),
    defaultValues: {
      publicSlug: '',
      youtubeVideos: [],
      eventPackFiles: [],
      testimonials: [],
    },
  });

  const { fields: videoFields, append: appendVideo, remove: removeVideo, move: moveVideo } = useFieldArray({
    control: pageBuilderForm.control,
    name: "youtubeVideos",
  });

  const { fields: packFileFields, append: appendPackFile, remove: removePackFile } = useFieldArray({
    control: pageBuilderForm.control,
    name: "eventPackFiles",
  });

  const { fields: testimonialFields, append: appendTestimonial, remove: removeTestimonial } = useFieldArray({
    control: pageBuilderForm.control,
    name: "testimonials",
  });

  // Reset step and tab when dialog opens/closes
  useEffect(() => {
    if (!eventDialogOpen) {
      setCurrentEventStep(1);
      setShowPageBuilderWarning(false);
      setEventDialogTab('details');
    }
  }, [eventDialogOpen]);

  // Initialize page builder form when editing event
  useEffect(() => {
    if (editingEvent && eventDialogOpen) {
      pageBuilderForm.reset({
        publicSlug: editingEvent.publicSlug || '',
        youtubeVideos: (editingEvent.youtubeVideos as any[]) || [],
        eventPackFiles: (editingEvent.eventPackFiles as any[]) || [],
        testimonials: (editingEvent.testimonials as any[]) || [],
      });
    } else if (!editingEvent && eventDialogOpen) {
      pageBuilderForm.reset({
        publicSlug: '',
        youtubeVideos: [],
        eventPackFiles: [],
        testimonials: [],
      });
    }
  }, [editingEvent, eventDialogOpen]);

  // Redirect if not authenticated or not admin (but only after loading completes)
  useEffect(() => {
    console.log('Admin page - access check:', {
      isLoading,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin } : null,
      hasAdminAccess: user?.role === 'admin' || user?.isAdmin
    });
    
    // Only check access after auth state is fully loaded
    if (isLoading) {
      console.log('Admin page: Still loading auth state, waiting...');
      return;
    }
    
    // Wait for user object to be present (even if authenticated)
    if (isAuthenticated && !user) {
      console.log('Admin page: Authenticated but user object not yet loaded, waiting...');
      return;
    }
    
    // Now check if user has admin access
    if (!isAuthenticated || !(user?.role === 'admin' || user?.isAdmin)) {
      console.log('Admin page: Access denied, redirecting to /');
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
    
    console.log('Admin page: Access granted');
  }, [isAuthenticated, isLoading, user, toast]);

  // Admin stats query
  const { data: stats, error: statsError } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin)),
    retry: false,
  });

  // Evidence query with status filter
  const { data: pendingEvidence, error: evidenceError } = useQuery<PendingEvidence[]>({
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
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'reviews'),
    retry: false,
  });

  // Pending audits query - always enabled so badge shows correct count
  const { data: pendingAudits = [] } = useQuery<PendingAudit[]>({
    queryKey: ['/api/admin/audits/pending'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin)),
    retry: false,
  });

  // Clean filters for API (convert "all" values to empty strings)
  const cleanFilters = (filters: typeof schoolFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
  };

  // Schools query
  const { data: schools, error: schoolsError } = useQuery<SchoolData[]>({
    queryKey: ['/api/admin/schools', cleanFilters(schoolFilters)],
    queryFn: async () => {
      const filters = cleanFilters(schoolFilters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = `/api/admin/schools${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'schools'),
    retry: false,
  });

  // Case studies query
  const { data: caseStudies = [], error: caseStudiesError } = useQuery<any[]>({
    queryKey: ['/api/admin/case-studies', {
      search: caseStudyFilters.search || '',
      country: caseStudyFilters.country || '',
      stage: caseStudyFilters.stage || '',
      language: caseStudyFilters.language || ''
    }],
    queryFn: async () => {
      const filters = cleanFilters(caseStudyFilters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = `/api/admin/case-studies${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'case-studies'),
    retry: false,
  });

  // Reduction promises query for selected school
  const schoolPromisesQuery = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/school', viewingSchool?.id],
    enabled: !!viewingSchool?.id,
    retry: false,
  });

  // Calculate promise metrics
  const promiseMetrics = schoolPromisesQuery.data 
    ? calculateAggregateMetrics(schoolPromisesQuery.data)
    : null;
  
  // Calculate additional metrics needed
  const totalPromises = schoolPromisesQuery.data?.length || 0;
  const totalAnnualReduction = schoolPromisesQuery.data?.reduce((sum, promise) => {
    const frequencyMultipliers: Record<string, number> = {
      week: 52,
      month: 12,
      year: 1,
    };
    const multiplier = frequencyMultipliers[promise.timeframeUnit] || 1;
    return sum + (promise.reductionAmount * multiplier);
  }, 0) || 0;
  const totalAnnualWeightKg = promiseMetrics ? (promiseMetrics.totalGramsReduced / 1000) : 0;

  // Evidence Requirements query
  const { data: evidenceRequirements = [], isLoading: requirementsLoading } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'evidence-requirements'),
    retry: false,
  });

  // Evidence Requirements mutations
  const createRequirementMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; resourceUrl?: string; stage: string; orderIndex: number }) => {
      return await apiRequest('POST', '/api/evidence-requirements', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setRequirementDialogOpen(false);
      setRequirementFormData({ title: '', description: '', resourceUrl: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create evidence requirement.",
        variant: "destructive",
      });
    },
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ title: string; description: string; resourceUrl: string }> }) => {
      return await apiRequest('PATCH', `/api/evidence-requirements/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setRequirementDialogOpen(false);
      setEditingRequirement(null);
      setRequirementFormData({ title: '', description: '', resourceUrl: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update evidence requirement.",
        variant: "destructive",
      });
    },
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/evidence-requirements/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setRequirementDeleteDialogOpen(false);
      setDeletingRequirement(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete evidence requirement. It may be linked to existing evidence.",
        variant: "destructive",
      });
    },
  });

  const reorderRequirementMutation = useMutation({
    mutationFn: async ({ id, newOrderIndex }: { id: string; newOrderIndex: number }) => {
      return await apiRequest('PATCH', `/api/evidence-requirements/${id}`, { orderIndex: newOrderIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to reorder requirements.",
        variant: "destructive",
      });
    },
  });

  // Events queries
  const cleanEventFilters = (filters: typeof eventFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
  };

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventWithRegistrations[]>({
    queryKey: ['/api/admin/events', cleanEventFilters(eventFilters)],
    queryFn: async () => {
      const filters = cleanEventFilters(eventFilters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = `/api/admin/events${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'events'),
    retry: false,
  });

  const { data: eventRegistrations = [], isLoading: registrationsLoading } = useQuery<EventRegistrationWithDetails[]>({
    queryKey: ['/api/admin/events', viewingEventRegistrations?.id, 'registrations', registrationStatusFilter],
    queryFn: async () => {
      if (!viewingEventRegistrations) return [];
      const params = new URLSearchParams();
      if (registrationStatusFilter && registrationStatusFilter !== 'all') {
        params.append('status', registrationStatusFilter);
      }
      const url = `/api/admin/events/${viewingEventRegistrations.id}/registrations${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && viewingEventRegistrations !== null),
    retry: false,
  });

  // Events mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/events', data);
      return await res.json();
    },
    onSuccess: (createdEvent: Event) => {
      toast({
        title: "Success",
        description: "Event created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      
      // Check if this is a virtual event or webinar - keep modal open and switch to Page Builder
      const isVirtualOrWebinar = createdEvent.isVirtual || createdEvent.eventType === 'webinar';
      
      if (isVirtualOrWebinar) {
        // Set the newly created event as the editing event
        setEditingEvent(createdEvent);
        // Update form data with created event details
        setEventFormData({
          title: createdEvent.title,
          description: createdEvent.description || '',
          eventType: createdEvent.eventType,
          status: createdEvent.status || 'draft',
          startDateTime: new Date(createdEvent.startDateTime).toISOString().slice(0, 16),
          endDateTime: new Date(createdEvent.endDateTime).toISOString().slice(0, 16),
          location: createdEvent.location || '',
          isVirtual: createdEvent.isVirtual ?? false,
          meetingLink: createdEvent.meetingLink || '',
          imageUrl: createdEvent.imageUrl || '',
          capacity: createdEvent.capacity?.toString() || '',
          waitlistEnabled: createdEvent.waitlistEnabled ?? false,
          registrationDeadline: createdEvent.registrationDeadline ? new Date(createdEvent.registrationDeadline).toISOString().slice(0, 16) : '',
          tags: createdEvent.tags?.join(', ') || '',
        });
        // Switch to Page Builder tab
        setEventDialogTab('page-builder');
        // Initialize page builder form with event data
        pageBuilderForm.reset({
          publicSlug: createdEvent.publicSlug || generateSlug(createdEvent.title),
          youtubeVideos: (createdEvent.youtubeVideos as any[]) || [],
          eventPackFiles: (createdEvent.eventPackFiles as any[]) || [],
          testimonials: (createdEvent.testimonials as any[]) || [],
        });
        // Keep modal open - do NOT call setEventDialogOpen(false)
      } else {
        // For non-virtual events, close modal as usual
        setEventDialogOpen(false);
        setEventFormData({
          title: '',
          description: '',
          eventType: 'workshop',
          status: 'draft',
          startDateTime: '',
          endDateTime: '',
          location: '',
          isVirtual: false,
          meetingLink: '',
          imageUrl: '',
          capacity: '',
          waitlistEnabled: false,
          registrationDeadline: '',
          tags: '',
        });
        setUploadedEventImage(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/admin/events/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      setEventDialogOpen(false);
      setEditingEvent(null);
      setEventFormData({
        title: '',
        description: '',
        eventType: 'workshop',
        status: 'draft',
        startDateTime: '',
        endDateTime: '',
        location: '',
        isVirtual: false,
        meetingLink: '',
        imageUrl: '',
        capacity: '',
        waitlistEnabled: false,
        registrationDeadline: '',
        tags: '',
      });
      setUploadedEventImage(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      setEventDeleteDialogOpen(false);
      setDeletingEvent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event.",
        variant: "destructive",
      });
    },
  });

  const updateEventPageContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PageBuilderFormData }) => {
      return await apiRequest('PATCH', `/api/admin/events/${id}/page-content`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event page content updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event page content.",
        variant: "destructive",
      });
    },
  });

  // Event image upload handler
  const handleEventImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, or WEBP).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingEventImage(true);

    try {
      // Get upload URL
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      // Upload file to storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Set ACL policy to PUBLIC for event images
      const aclResponse = await apiRequest('PUT', '/api/evidence-files', {
        fileURL: uploadURL.split('?')[0],
        visibility: 'public',
        filename: file.name,
      });
      const { objectPath } = await aclResponse.json();

      // Update state
      setUploadedEventImage({ name: file.name, url: objectPath });
      setEventFormData({ ...eventFormData, imageUrl: objectPath });

      toast({
        title: "Success",
        description: "Image uploaded successfully.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingEventImage(false);
      if (eventImageInputRef.current) {
        eventImageInputRef.current.value = '';
      }
    }
  };

  const removeEventImage = () => {
    setUploadedEventImage(null);
    setEventFormData({ ...eventFormData, imageUrl: '' });
  };

  // PDF file upload handler for event pack files
  const handlePackFileUpload = async (file: File, index: number): Promise<{ fileUrl: string; fileName: string; fileSize: number } | null> => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "PDF must be less than 20MB.",
        variant: "destructive",
      });
      return null;
    }

    setUploadingPackFiles(prev => ({ ...prev, [index]: true }));

    try {
      // Get upload URL
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      // Upload file to storage
      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Set ACL policy to PUBLIC for event pack files
      const aclResponse = await apiRequest('PUT', '/api/evidence-files', {
        fileURL: uploadURL.split('?')[0],
        visibility: 'public',
        filename: file.name,
      });
      const { objectPath } = await aclResponse.json();

      toast({
        title: "Success",
        description: "PDF uploaded successfully.",
      });

      return { fileUrl: objectPath, fileName: file.name, fileSize: file.size };
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingPackFiles(prev => ({ ...prev, [index]: false }));
    }
  };

  // Teacher emails query for SendGrid
  const { data: teacherEmailsData } = useQuery<{ emails: string[]; count: number }>({
    queryKey: ['/api/admin/teachers/emails'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && (newsletterDialogOpen || digestDialogOpen)),
    retry: false,
  });

  // Event analytics query
  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    totalEvents: number;
    eventsByStatus: {
      draft: number;
      published: number;
      completed: number;
      cancelled: number;
    };
    totalRegistrations: number;
    averageRegistrationsPerEvent: number;
    registrationConversionRate: number;
    eventsByType: Array<{
      type: string;
      count: number;
    }>;
    topEvents: Array<{
      id: string;
      title: string;
      registrations: number;
      capacity: number | null;
    }>;
    registrationsTrend: Array<{
      date: string;
      count: number;
    }>;
    upcomingEventsCount: number;
    pastEventsCount: number;
  }>({
    queryKey: ['/api/admin/events/analytics'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'events'),
  });

  // Send event announcement mutation (SendGrid)
  const sendAnnouncementMutation = useMutation({
    mutationFn: async ({ eventId, recipientType, customEmails }: { 
      eventId: string; 
      recipientType: 'all_teachers' | 'custom';
      customEmails?: string[];
    }) => {
      return await apiRequest('POST', `/api/admin/events/${eventId}/announce`, { 
        recipientType,
        customEmails: customEmails || []
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Event announcement sent to ${data.recipientCount} recipient(s) successfully.`,
      });
      setNewsletterDialogOpen(false);
      setAnnouncingEvent(null);
      setRecipientType('all_teachers');
      setCustomEmails('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send event announcement.",
        variant: "destructive",
      });
    },
  });

  // Send event digest mutation (SendGrid)
  const sendDigestMutation = useMutation({
    mutationFn: async ({ eventIds, recipientType, customEmails }: { 
      eventIds: string[]; 
      recipientType: 'all_teachers' | 'custom';
      customEmails?: string[];
    }) => {
      return await apiRequest('POST', '/api/admin/events/digest', { 
        eventIds, 
        recipientType,
        customEmails: customEmails || []
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Event digest sent to ${data.recipientCount} recipient(s) successfully.`,
      });
      setDigestDialogOpen(false);
      setSelectedEventsForDigest(new Set());
      setRecipientType('all_teachers');
      setCustomEmails('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send event digest.",
        variant: "destructive",
      });
    },
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/events/registrations/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Registration updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events', viewingEventRegistrations?.id, 'registrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update registration.",
        variant: "destructive",
      });
    },
  });

  // Handle unauthorized errors
  useEffect(() => {
    const errors = [statsError, evidenceError, schoolsError, caseStudiesError].filter(Boolean);
    for (const error of errors) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "Admin session expired. Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 500);
        break;
      }
    }
  }, [statsError, evidenceError, schoolsError, toast]);

  // Evidence review mutation
  const reviewEvidenceMutation = useMutation({
    mutationFn: async ({ evidenceId, status, reviewNotes }: {
      evidenceId: string;
      status: 'approved' | 'rejected';
      reviewNotes: string;
    }) => {
      await apiRequest('PUT', `/api/admin/evidence/${evidenceId}/review`, {
        status,
        reviewNotes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Evidence Reviewed",
        description: "Evidence has been successfully reviewed and email notification sent.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setReviewData(null);
    },
    onError: (error) => {
      toast({
        title: "Review Failed",
        description: "Failed to review evidence. Please try again.",
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
      await apiRequest('PUT', `/api/admin/audits/${auditId}/review`, {
        approved,
        reviewNotes,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Audit Reviewed",
        description: `Audit has been successfully ${variables.approved ? 'approved' : 'rejected'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/audits/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setAuditReviewData(null);
    },
    onError: (error) => {
      toast({
        title: "Review Failed",
        description: "Failed to review audit. Please try again.",
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
      await apiRequest('POST', '/api/admin/evidence/bulk-review', {
        evidenceIds,
        status,
        reviewNotes,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Bulk Review Complete",
        description: `${variables.evidenceIds.length} evidence submissions have been ${variables.status} and email notifications sent.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedEvidence([]);
      setBulkEvidenceDialogOpen(false);
      setBulkAction(null);
    },
    onError: (error) => {
      toast({
        title: "Bulk Review Failed",
        description: "Failed to perform bulk review. Please try again.",
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
    onSuccess: (_, evidenceIds) => {
      toast({
        title: "Bulk Delete Complete",
        description: `${evidenceIds.length} evidence submissions have been deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedEvidence([]);
      setBulkEvidenceDialogOpen(false);
      setBulkAction(null);
    },
    onError: (error) => {
      toast({
        title: "Bulk Delete Failed",
        description: "Failed to delete evidence submissions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk school update mutation
  const bulkSchoolUpdateMutation = useMutation({
    mutationFn: async ({ schoolIds, updates }: {
      schoolIds: string[];
      updates: Record<string, any>;
    }) => {
      await apiRequest('POST', '/api/admin/schools/bulk-update', {
        schoolIds,
        updates,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Bulk Update Complete",
        description: `${variables.schoolIds.length} schools have been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedSchools([]);
      setBulkSchoolDialogOpen(false);
      setBulkAction(null);
    },
    onError: (error) => {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update schools. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk school delete mutation
  const bulkSchoolDeleteMutation = useMutation({
    mutationFn: async (schoolIds: string[]) => {
      await apiRequest('DELETE', '/api/admin/schools/bulk-delete', {
        schoolIds,
      });
    },
    onSuccess: (_, schoolIds) => {
      toast({
        title: "Bulk Delete Complete",
        description: `${schoolIds.length} schools have been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedSchools([]);
      setBulkSchoolDialogOpen(false);
      setBulkAction(null);
    },
    onError: (error) => {
      toast({
        title: "Bulk Delete Failed",
        description: "Failed to delete schools. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Individual school delete mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      await apiRequest('DELETE', `/api/admin/schools/${schoolId}`);
    },
    onSuccess: (_, schoolId) => {
      toast({
        title: "School Deleted",
        description: "The school has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/school-progress'] });
      setDeletingSchool(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete school. Please try again.",
        variant: "destructive",
      });
      setDeletingSchool(null);
    },
  });

  // Update school language mutation
  const updateSchoolLanguageMutation = useMutation({
    mutationFn: async ({ schoolId, primaryLanguage }: { schoolId: string; primaryLanguage: string }) => {
      return await apiRequest('PUT', `/api/admin/schools/${schoolId}`, { primaryLanguage });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Language Updated",
        description: "School preferred language has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      // Update the viewingSchool state to reflect the change immediately
      if (viewingSchool) {
        setViewingSchool({
          ...viewingSchool,
          primaryLanguage: variables.primaryLanguage
        });
      }
      setEditingSchoolLanguage(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update school language. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update school progression mutation
  const updateSchoolProgressionMutation = useMutation({
    mutationFn: async ({ schoolId, updates }: { 
      schoolId: string; 
      updates: {
        currentStage?: 'inspire' | 'investigate' | 'act';
        currentRound?: number;
        inspireCompleted?: boolean;
        investigateCompleted?: boolean;
        actCompleted?: boolean;
      }
    }) => {
      return await apiRequest('PUT', `/api/admin/schools/${schoolId}/progression`, updates);
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Progression Updated",
        description: "School progression has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/school-progress'] });
      // Update the viewingSchool state to reflect the change immediately
      const responseData = data as any;
      if (viewingSchool && responseData.school) {
        setViewingSchool({
          ...viewingSchool,
          ...responseData.school
        });
      }
      setEditingProgression(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update school progression. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Case study mutations
  const createCaseStudyMutation = useMutation({
    mutationFn: async (caseStudy: any) => {
      // Transform to insert schema - remove id and auto-generated fields
      const { id, createdAt, updatedAt, schoolName, schoolCountry, ...insertData } = caseStudy;
      return await apiRequest('POST', '/api/admin/case-studies', insertData);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Created",
        description: "Case study has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setEditorOpen(false);
      setEditingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCaseStudyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Remove id and auto-generated/computed fields before sending update
      const { id, createdAt, updatedAt, schoolName, schoolCountry, ...updates } = data;
      return await apiRequest('PUT', `/api/admin/case-studies/${id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Updated",
        description: "Case study has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setEditorOpen(false);
      setEditingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCaseStudyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/case-studies/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Deleted",
        description: "Case study has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setDeletingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCaseStudyFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      await apiRequest('PUT', `/api/admin/case-studies/${id}/featured`, { featured });
    },
    onSuccess: () => {
      toast({
        title: "Case Study Updated",
        description: "Case study featured status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update case study. Please try again.",
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

  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchools(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const toggleSelectAllSchools = () => {
    if (selectedSchools.length === schools?.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools?.map(s => s.id) || []);
    }
  };

  // Export function with filtering support
  const handleExport = async (type: 'schools' | 'evidence' | 'users') => {
    try {
      let queryParams = new URLSearchParams({ format: exportFormat });
      
      // Add current filters to export
      if (type === 'schools') {
        const filters = cleanFilters(schoolFilters);
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '') {
            queryParams.append(key, value);
          }
        });
      }
      
      const response = await fetch(`/api/admin/export/${type}?${queryParams.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = exportFormat === 'excel' ? 'xlsx' : 'csv';
      link.download = `${type}_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setExportDialogOpen(false);
      toast({
        title: "Export Successful",
        description: `${type} data has been exported as ${exportFormat.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Send bulk email function
  const handleSendBulkEmail = async () => {
    try {
      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...emailForm,
          recipients: emailForm.recipientType === 'custom' ? 
            emailForm.recipients.split(/[,\n]/).map(email => email.trim()).filter(Boolean) : 
            undefined,
          filters: emailForm.recipientType === 'schools' ? cleanFilters(schoolFilters) : undefined,
          editedTranslations: Object.keys(translations).length > 0 ? translations : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send emails');
      }

      const result = await response.json();
      
      setEmailForm({
        recipientType: 'all_teachers',
        subject: '',
        preheader: '',
        title: '',
        preTitle: '',
        messageContent: '',
        template: 'announcement',
        recipients: '',
        autoTranslate: false
      });
      
      // Reset translation state
      setTranslations({});
      setSelectedPreviewLanguages([]);
      setCurrentViewingLanguage('en');
      
      toast({
        title: "Emails Sent Successfully",
        description: `${result.results.sent} emails sent successfully${result.results.failed > 0 ? `, ${result.results.failed} failed` : ''}.`,
      });
      
      return result;
    } catch (error) {
      toast({
        title: "Failed to Send Emails",
        description: "There was an error sending the bulk emails. Please try again.",
        variant: "destructive",
      });
      throw error;
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

  // Toggle school expansion
  const toggleSchoolExpansion = (schoolId: string) => {
    const newExpandedSchools = new Set(expandedSchools);
    
    if (expandedSchools.has(schoolId)) {
      newExpandedSchools.delete(schoolId);
    } else {
      newExpandedSchools.add(schoolId);
    }
    
    setExpandedSchools(newExpandedSchools);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !(user?.role === 'admin' || user?.role === 'partner' || user?.isAdmin)) {
    return null; // Will redirect in useEffect
  }

  const isPartner = user?.role === 'partner';

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-navy" data-testid="text-admin-title">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage schools, review evidence, and monitor program progress
                </p>
              </div>
              <div className="flex gap-4">
                {!isPartner && (
                  <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-export-data">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export Data</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-3">Choose format and data to export:</p>
                        <Select value={exportFormat} onValueChange={(value: 'csv' | 'excel') => setExportFormat(value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV Format</SelectItem>
                            <SelectItem value="excel">Excel Format (.xlsx)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3">
                        <Button 
                          onClick={() => handleExport('schools')} 
                          className="justify-start"
                          data-testid="button-export-schools"
                        >
                          <School className="h-4 w-4 mr-2" />
                          Export Schools Data
                          {activeTab === 'schools' && <span className="text-xs ml-2">(with current filters)</span>}
                        </Button>
                        <Button 
                          onClick={() => handleExport('evidence')} 
                          className="justify-start"
                          data-testid="button-export-evidence"
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          Export Evidence Data
                        </Button>
                        <Button 
                          onClick={() => handleExport('users')} 
                          className="justify-start"
                          data-testid="button-export-users"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Export Users Data
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs - Two Tier Structure */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8">
          {/* Dashboard - No dropdown */}
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-dashboard"
          >
            Dashboard
          </button>

          {/* Schools - Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  ['schools', 'teams', 'users'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-schools"
              >
                Schools
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('schools')}
                className={activeTab === 'schools' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-schools"
              >
                Schools
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('teams')}
                className={activeTab === 'teams' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-teams"
              >
                Teams
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-users"
              >
                User Management
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Content - Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  ['resources', 'case-studies', 'events', 'media-library'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-content"
              >
                Content
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('resources')}
                className={activeTab === 'resources' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-resources"
              >
                Resources
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('case-studies')}
                className={activeTab === 'case-studies' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-case-studies"
              >
                Case Studies
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('events')}
                className={activeTab === 'events' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-events"
              >
                Events
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('media-library')}
                className={activeTab === 'media-library' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-evidence-gallery"
              >
                Evidence Gallery
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Program - Dropdown with badge */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 relative ${
                  ['evidence-requirements', 'reviews', 'printable-forms'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-program"
              >
                Program
                <ChevronDown className="h-4 w-4" />
                {((stats && stats.pendingEvidence > 0) || pendingAudits.length > 0) && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    data-testid="badge-pending-reviews-count"
                  >
                    {(stats?.pendingEvidence || 0) + pendingAudits.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('evidence-requirements')}
                className={activeTab === 'evidence-requirements' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-evidence-requirements"
              >
                Evidence Requirements
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('reviews')}
                className={`${activeTab === 'reviews' ? 'bg-gray-100 font-medium' : ''} relative`}
                data-testid="tab-program-review-queue"
              >
                Review Queue
                {((stats && stats.pendingEvidence > 0) || pendingAudits.length > 0) && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {(stats?.pendingEvidence || 0) + pendingAudits.length}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('printable-forms')}
                className={activeTab === 'printable-forms' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-printable-forms"
              >
                Printable Forms
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Communications - No dropdown */}
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'email-test' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('email-test')}
            data-testid="tab-communications"
          >
            Communications
          </button>
        </div>

        {/* Overview Tab (Analytics Content) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
              </div>
            }>
              <AnalyticsContent />
            </Suspense>
          </div>
        )}

        {/* Review Queue Tab - Merged Evidence Review and Audit Reviews */}
        {activeTab === 'reviews' && (
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
              {pendingEvidence && pendingEvidence.length === 0 ? (
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
                            onClick={() => setReviewData({
                              evidenceId: evidence.id,
                              action: 'approved',
                              notes: ''
                            })}
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
                          <Button 
                            size="sm" 
                            className="bg-pcs_blue hover:bg-pcs_blue/90"
                            data-testid={`button-feature-${evidence.id}`}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Feature
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
              {pendingAudits.length === 0 ? (
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
                              {audit.school.name}
                            </h3>
                            <Badge variant="outline" data-testid={`text-school-country-${audit.id}`}>
                              <MapPin className="h-3 w-3 mr-1" />
                              {audit.school.country}
                            </Badge>
                            <Badge className="bg-blue-500 text-white" data-testid={`text-audit-status-${audit.id}`}>
                              {audit.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                            <span data-testid={`text-submitted-by-${audit.id}`}>
                              Submitted by: {audit.submittedByUser.firstName} {audit.submittedByUser.lastName}
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
                                        <div>Display Materials: {audit.part3Data.classroomDisplayMaterials || 0}</div>
                                        <div>Toys/Equipment: {audit.part3Data.classroomToys || 0}</div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2 text-navy">Bathrooms</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>Soap Bottles: {audit.part3Data.bathroomSoapBottles || 0}</div>
                                        <div>Bin Liners: {audit.part3Data.bathroomBinLiners || 0}</div>
                                        <div>Cups/Dispensers: {audit.part3Data.bathroomCupsPaper || 0}</div>
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
                            
                            <AccordionItem value="part4" className="border-none">
                              <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part4-${audit.id}`}>
                                Part 4: Waste Management Practices
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part4-${audit.id}`}>
                                {audit.part4Data ? (
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <strong>Has Recycling Bins:</strong> {audit.part4Data.hasRecyclingBins ? 'Yes' : 'No'}
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
          </div>
        )}

        {/* Schools Tab */}
        {activeTab === 'schools' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  School Management
                </CardTitle>
                {selectedSchools.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {selectedSchools.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-pcs_blue hover:bg-blue-600"
                        onClick={() => {
                          setBulkAction({ 
                            type: 'update', 
                            updates: { currentStage: 'act' } 
                          });
                          setBulkSchoolDialogOpen(true);
                        }}
                        data-testid="button-bulk-update-schools"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Bulk Update
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setBulkAction({ type: 'delete' });
                          setBulkSchoolDialogOpen(true);
                        }}
                        data-testid="button-bulk-delete-schools"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Schools
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search schools..."
                      value={schoolFilters.search}
                      onChange={(e) => setSchoolFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10 w-64"
                      data-testid="input-search-schools"
                    />
                  </div>
                  <Select 
                    value={schoolFilters.country} 
                    onValueChange={(value) => setSchoolFilters(prev => ({ ...prev, country: value }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {schools && schools.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    checked={selectedSchools.length === schools.length}
                    onChange={toggleSelectAllSchools}
                    className="rounded border-gray-300"
                    data-testid="checkbox-select-all-schools"
                  />
                  <label className="text-sm text-gray-600">
                    Select All ({schools.length} schools)
                  </label>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold text-navy w-12"></th>
                      <th className="text-left p-3 font-semibold text-navy w-12">Select</th>
                      <th className="text-left p-3 font-semibold text-navy">School Name</th>
                      <th className="text-left p-3 font-semibold text-navy">Country</th>
                      <th className="text-left p-3 font-semibold text-navy">Stage</th>
                      <th className="text-left p-3 font-semibold text-navy">Progress</th>
                      <th className="text-left p-3 font-semibold text-navy">Students</th>
                      <th className="text-left p-3 font-semibold text-navy">Primary Contact</th>
                      <th className="text-left p-3 font-semibold text-navy">Joined</th>
                      <th className="text-left p-3 font-semibold text-navy">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools?.map((school) => (
                      <>
                        <tr 
                          key={school.id} 
                          className={`border-b transition-colors ${
                            selectedSchools.includes(school.id) 
                              ? 'bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`} 
                          data-testid={`school-row-${school.id}`}
                        >
                          <td className="p-3">
                            <button
                              onClick={() => toggleSchoolExpansion(school.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              data-testid={`button-expand-${school.id}`}
                              aria-label={expandedSchools.has(school.id) ? "Collapse" : "Expand"}
                            >
                              {expandedSchools.has(school.id) ? (
                                <ChevronUp className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school.id)}
                              onChange={() => toggleSchoolSelection(school.id)}
                              className="rounded border-gray-300"
                              data-testid={`checkbox-school-${school.id}`}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-navy">{school.name}</div>
                          </td>
                          <td className="p-3 text-gray-600">{school.country}</td>
                          <td className="p-3">
                            <Badge className={getStageColor(school.currentStage)}>
                              {school.currentStage}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                                <div 
                                  className="bg-teal h-2 rounded-full transition-all"
                                  style={{ width: `${school.progressPercentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">{school.progressPercentage}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">{school.studentCount}</td>
                          <td className="p-3 text-gray-600" data-testid={`text-primary-contact-${school.id}`}>
                            {school.primaryContactEmail || 'N/A'}
                          </td>
                          <td className="p-3 text-gray-600">
                            {new Date(school.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setViewingSchool(school)}
                                data-testid={`button-view-${school.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => setDeletingSchool(school)}
                                data-testid={`button-delete-${school.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        <SchoolTeachersRow 
                          schoolId={school.id} 
                          isExpanded={expandedSchools.has(school.id)} 
                        />
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {/* Section A: Assign Teacher to School */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assign Teacher to School
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AssignTeacherForm />
              </CardContent>
            </Card>

            {/* Section B: School Teacher Lists */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  School Teachers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SchoolTeachersList />
              </CardContent>
            </Card>

            {/* Section C: Verification Requests Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Verification Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VerificationRequestsList />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <ResourcesManagement />
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <UserManagementTab />
        )}

        {/* Email Management Tab */}
        {activeTab === 'email-test' && (
          <div className="space-y-6">
            <EmailManagementSection 
              emailForm={emailForm}
              setEmailForm={setEmailForm}
              handleSendBulkEmail={handleSendBulkEmail}
              schoolFilters={schoolFilters}
              setSchoolFilters={setSchoolFilters}
              countryOptions={countryOptions}
              translations={translations}
              setTranslations={setTranslations}
              selectedPreviewLanguages={selectedPreviewLanguages}
              setSelectedPreviewLanguages={setSelectedPreviewLanguages}
              currentViewingLanguage={currentViewingLanguage}
              setCurrentViewingLanguage={setCurrentViewingLanguage}
              isGeneratingTranslations={isGeneratingTranslations}
              setIsGeneratingTranslations={setIsGeneratingTranslations}
            />
          </div>
        )}

        {/* Case Studies Tab */}
        {activeTab === 'case-studies' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Case Studies Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                  <Input
                    placeholder="Search case studies..."
                    value={caseStudyFilters.search}
                    onChange={(e) => setCaseStudyFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="max-w-sm"
                    data-testid="input-case-study-search"
                  />
                  <Select
                    value={caseStudyFilters.stage}
                    onValueChange={(value) => setCaseStudyFilters(prev => ({ ...prev, stage: value }))}
                  >
                    <SelectTrigger className="w-[180px]" data-testid="select-case-study-stage">
                      <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="inspire">Inspire</SelectItem>
                      <SelectItem value="investigate">Investigate</SelectItem>
                      <SelectItem value="act">Act</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={caseStudyFilters.featured}
                    onValueChange={(value) => setCaseStudyFilters(prev => ({ ...prev, featured: value }))}
                  >
                    <SelectTrigger className="w-[180px]" data-testid="select-case-study-featured">
                      <SelectValue placeholder="Featured Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Featured</SelectItem>
                      <SelectItem value="false">Not Featured</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setEditingCaseStudy(null);
                      setEditorOpen(true);
                    }}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-create-case-study"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Case Study
                  </Button>
                </div>

                {/* Case Studies List */}
                <div className="space-y-4">
                  {caseStudies?.map((caseStudy: any) => (
                    <Card key={caseStudy.id} className="border-l-4 border-l-pcs_blue">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-navy" data-testid={`case-study-title-${caseStudy.id}`}>
                                {caseStudy.title}
                              </h3>
                              <Badge 
                                className={caseStudy.stage === 'inspire' ? 'bg-pcs_blue text-white' :
                                         caseStudy.stage === 'investigate' ? 'bg-teal text-white' :
                                         'bg-coral text-white'}
                                data-testid={`case-study-stage-${caseStudy.id}`}
                              >
                                {caseStudy.stage.charAt(0).toUpperCase() + caseStudy.stage.slice(1)}
                              </Badge>
                              {caseStudy.featured && (
                                <Badge className="bg-yellow-500 text-white" data-testid={`case-study-featured-${caseStudy.id}`}>
                                  <Star className="h-3 w-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-2" data-testid={`case-study-description-${caseStudy.id}`}>
                              {caseStudy.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span data-testid={`case-study-school-${caseStudy.id}`}>
                                <School className="h-4 w-4 inline mr-1" />
                                {caseStudy.schoolName}
                              </span>
                              <span data-testid={`case-study-country-${caseStudy.id}`}>
                                <MapPin className="h-4 w-4 inline mr-1" />
                                {caseStudy.schoolCountry}
                              </span>
                              <span data-testid={`case-study-date-${caseStudy.id}`}>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {new Date(caseStudy.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/case-study/${caseStudy.id}`, '_blank')}
                                data-testid={`button-preview-${caseStudy.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCaseStudy(caseStudy as CaseStudy);
                                  setEditorOpen(true);
                                }}
                                data-testid={`button-edit-${caseStudy.id}`}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={caseStudy.featured ? "default" : "outline"}
                                onClick={() => updateCaseStudyFeaturedMutation.mutate({
                                  id: caseStudy.id,
                                  featured: !caseStudy.featured
                                })}
                                disabled={updateCaseStudyFeaturedMutation.isPending}
                                data-testid={`button-toggle-featured-${caseStudy.id}`}
                                className="flex-1"
                              >
                                <Star className="h-4 w-4 mr-1" />
                                {caseStudy.featured ? 'Unfeature' : 'Feature'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeletingCaseStudy(caseStudy as CaseStudy)}
                                data-testid={`button-delete-${caseStudy.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {caseStudies?.length === 0 && (
                    <div className="text-center py-8 text-gray-500" data-testid="no-case-studies">
                      No case studies found. Create one from approved evidence submissions.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Evidence Requirements Tab */}
        {activeTab === 'evidence-requirements' && (
          <div className="space-y-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-navy" data-testid="text-page-title">
                  Evidence Requirements Management
                </CardTitle>
                <p className="text-gray-600 mt-2" data-testid="text-page-description">
                  Configure required evidence for each program stage
                </p>
              </CardHeader>
            </Card>

            <Tabs value={activeEvidenceStage} onValueChange={(value) => setActiveEvidenceStage(value as any)}>
              <div className="bg-gray-100 p-1 rounded-lg w-fit mb-6">
                <button
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeEvidenceStage === 'inspire'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-gray-600 hover:text-navy'
                  }`}
                  onClick={() => setActiveEvidenceStage('inspire')}
                  data-testid="tab-inspire"
                >
                  Inspire
                </button>
                <button
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeEvidenceStage === 'investigate'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-gray-600 hover:text-navy'
                  }`}
                  onClick={() => setActiveEvidenceStage('investigate')}
                  data-testid="tab-investigate"
                >
                  Investigate
                </button>
                <button
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    activeEvidenceStage === 'act'
                      ? 'bg-white text-navy shadow-sm'
                      : 'text-gray-600 hover:text-navy'
                  }`}
                  onClick={() => setActiveEvidenceStage('act')}
                  data-testid="tab-act"
                >
                  Act
                </button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {activeEvidenceStage.charAt(0).toUpperCase() + activeEvidenceStage.slice(1)} Stage Requirements
                    </CardTitle>
                    <Button
                      onClick={() => {
                        setEditingRequirement(null);
                        setRequirementFormData({ title: '', description: '', resourceUrl: '' });
                        setRequirementDialogOpen(true);
                      }}
                      className="bg-pcs_blue hover:bg-pcs_blue/90"
                      data-testid={`button-add-${activeEvidenceStage}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {requirementsLoading ? (
                    <div className="py-8">
                      <LoadingSpinner message="Loading requirements..." />
                    </div>
                  ) : evidenceRequirements.filter(req => req.stage === activeEvidenceStage).length === 0 ? (
                    <EmptyState
                      title="No requirements yet"
                      description="Add your first evidence requirement for this stage"
                      icon={Plus}
                    />
                  ) : (
                    <div className="space-y-3">
                      {evidenceRequirements
                        .filter(req => req.stage === activeEvidenceStage)
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((requirement, index, arr) => (
                          <Card key={requirement.id} data-testid={`requirement-card-${requirement.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col gap-1 pt-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const prevReq = arr[index - 1];
                                          if (prevReq) {
                                            reorderRequirementMutation.mutate({ id: requirement.id, newOrderIndex: prevReq.orderIndex });
                                            reorderRequirementMutation.mutate({ id: prevReq.id, newOrderIndex: requirement.orderIndex });
                                          }
                                        }}
                                        disabled={index === 0}
                                        className="h-6 w-6 p-0"
                                        data-testid={`button-move-up-${requirement.id}`}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const nextReq = arr[index + 1];
                                          if (nextReq) {
                                            reorderRequirementMutation.mutate({ id: requirement.id, newOrderIndex: nextReq.orderIndex });
                                            reorderRequirementMutation.mutate({ id: nextReq.id, newOrderIndex: requirement.orderIndex });
                                          }
                                        }}
                                        disabled={index === arr.length - 1}
                                        className="h-6 w-6 p-0"
                                        data-testid={`button-move-down-${requirement.id}`}
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-gray-500">
                                          #{requirement.orderIndex + 1}
                                        </span>
                                        <h3 className="text-base font-semibold text-gray-900" data-testid={`text-title-${requirement.id}`}>
                                          {requirement.title}
                                        </h3>
                                      </div>
                                      <p className="text-sm text-gray-600 whitespace-pre-wrap" data-testid={`text-description-${requirement.id}`}>
                                        {requirement.description}
                                      </p>
                                      {requirement.resourceUrl && (
                                        <a
                                          href={requirement.resourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                          data-testid={`link-resource-${requirement.id}`}
                                        >
                                          <BookOpen className="h-3 w-3" />
                                          Helpful Resource Link
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingRequirement(requirement);
                                      setRequirementFormData({
                                        title: requirement.title,
                                        description: requirement.description,
                                        resourceUrl: requirement.resourceUrl || '',
                                      });
                                      setRequirementDialogOpen(true);
                                    }}
                                    data-testid={`button-edit-${requirement.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setDeletingRequirement(requirement);
                                      setRequirementDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`button-delete-${requirement.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Tabs>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-navy" data-testid="text-page-title">
                  Events Management
                </CardTitle>
                <p className="text-gray-600 mt-2" data-testid="text-page-description">
                  Manage events and registrations for the Plastic Clever Schools community
                </p>
              </CardHeader>
            </Card>

            {/* Analytics Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-pcs_blue" />
                  Event Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="py-8">
                    <LoadingSpinner message="Loading analytics..." />
                  </div>
                ) : !analytics ? (
                  <EmptyState
                    title="No analytics available"
                    description="Analytics data will appear here once events are created"
                    icon={BarChart3}
                  />
                ) : (
                    <div className="space-y-6">
                      {/* Key Metrics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-pcs_blue" />
                              Total Events
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-pcs_blue" data-testid="metric-total-events">
                              {analytics.totalEvents}
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Draft:</span>
                                <span className="font-medium" data-testid="metric-draft-events">{analytics.eventsByStatus.draft}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Published:</span>
                                <span className="font-medium" data-testid="metric-published-events">{analytics.eventsByStatus.published}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Completed:</span>
                                <span className="font-medium" data-testid="metric-completed-events">{analytics.eventsByStatus.completed}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cancelled:</span>
                                <span className="font-medium" data-testid="metric-cancelled-events">{analytics.eventsByStatus.cancelled}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                              <Users className="h-4 w-4 text-pcs_teal" />
                              Total Registrations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-pcs_teal" data-testid="metric-total-registrations">
                              {analytics.totalRegistrations}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              {analytics.registrationConversionRate.toFixed(1)}% conversion rate
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-pcs_yellow" />
                              Avg. Registrations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-pcs_yellow" data-testid="metric-avg-registrations">
                              {analytics.averageRegistrationsPerEvent.toFixed(1)}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">per event</p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              Event Timeline
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Upcoming:</span>
                                <span className="text-2xl font-bold text-purple-600" data-testid="metric-upcoming-events">
                                  {analytics.upcomingEventsCount}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Past:</span>
                                <span className="text-2xl font-bold text-gray-500" data-testid="metric-past-events">
                                  {analytics.pastEventsCount}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Events by Type */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Events by Type</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {analytics.eventsByType.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.eventsByType}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="type" 
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1)}
                                  />
                                  <YAxis />
                                  <Tooltip 
                                    formatter={(value) => [value, 'Events']}
                                    labelFormatter={(label) => label.replace('_', ' ').charAt(0).toUpperCase() + label.replace('_', ' ').slice(1)}
                                  />
                                  <Bar dataKey="count" fill="#0B3D5D" />
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-[300px] flex items-center justify-center text-gray-500">
                                No data available
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Top 5 Most Popular Events */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Top 5 Most Popular Events</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {analytics.topEvents.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.topEvents} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis type="number" />
                                  <YAxis 
                                    dataKey="title" 
                                    type="category" 
                                    width={150}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                                  />
                                  <Tooltip 
                                    formatter={(value, name, props) => {
                                      if (name === 'registrations') {
                                        const capacity = props.payload.capacity;
                                        return [
                                          capacity ? `${value} / ${capacity}` : value, 
                                          'Registrations'
                                        ];
                                      }
                                      return [value, name];
                                    }}
                                  />
                                  <Bar dataKey="registrations" fill="#019ADE" />
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-[300px] flex items-center justify-center text-gray-500">
                                No data available
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Registrations Trend (Last 30 Days) */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Registrations Trend (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {analytics.registrationsTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={analytics.registrationsTrend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 12 }}
                                  tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getMonth() + 1}/${date.getDate()}`;
                                  }}
                                />
                                <YAxis />
                                <Tooltip 
                                  formatter={(value) => [value, 'Registrations']}
                                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="count" 
                                  stroke="#02BBB4" 
                                  strokeWidth={2}
                                  name="Daily Registrations"
                                  dot={{ fill: '#02BBB4' }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-[300px] flex items-center justify-center text-gray-500">
                              No registration data in the last 30 days
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Events</CardTitle>
                  <Button
                    onClick={() => {
                      setEditingEvent(null);
                      setEventFormData({
                        title: '',
                        description: '',
                        eventType: 'workshop',
                        status: 'draft',
                        startDateTime: '',
                        endDateTime: '',
                        location: '',
                        isVirtual: false,
                        meetingLink: '',
                        imageUrl: '',
                        capacity: '',
                        waitlistEnabled: false,
                        registrationDeadline: '',
                        tags: '',
                      });
                      setUploadedEventImage(null);
                      setEventDialogOpen(true);
                    }}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-create-event"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={eventFilters.status}
                      onChange={(e) => setEventFilters({ ...eventFilters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-testid="select-status-filter"
                    >
                      <option value="all">All Statuses</option>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={eventFilters.eventType}
                      onChange={(e) => setEventFilters({ ...eventFilters, eventType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-testid="select-type-filter"
                    >
                      <option value="all">All Types</option>
                      <option value="workshop">Workshop</option>
                      <option value="webinar">Webinar</option>
                      <option value="community_event">Community Event</option>
                      <option value="training">Training</option>
                      <option value="celebration">Celebration</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={eventFilters.dateFrom}
                      onChange={(e) => setEventFilters({ ...eventFilters, dateFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-testid="input-date-from"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={eventFilters.dateTo}
                      onChange={(e) => setEventFilters({ ...eventFilters, dateTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="py-8">
                    <LoadingSpinner message="Loading events..." />
                  </div>
                ) : events.length === 0 ? (
                  <EmptyState
                    title="No events yet"
                    description="Create your first event to get started"
                    icon={Calendar}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-events">
                      <thead>
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registrations</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((event) => (
                          <tr key={event.id} className="border-b hover:bg-gray-50" data-testid={`row-event-${event.id}`}>
                            <td className="px-4 py-3 text-sm text-gray-900" data-testid={`text-title-${event.id}`}>{event.title}</td>
                            <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-type-${event.id}`}>
                              {event.eventType.replace('_', ' ').charAt(0).toUpperCase() + event.eventType.replace('_', ' ').slice(1)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-date-${event.id}`}>
                              {format(new Date(event.startDateTime), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-3 text-sm" data-testid={`text-status-${event.id}`}>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                event.status === 'published' ? 'bg-green-100 text-green-700' :
                                event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-registrations-${event.id}`}>
                              {event.registrationsCount || 0}
                              {event.capacity && ` / ${event.capacity}`}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingEvent(event);
                                    setEventFormData({
                                      title: event.title,
                                      description: event.description || '',
                                      eventType: event.eventType,
                                      status: event.status || 'draft',
                                      startDateTime: new Date(event.startDateTime).toISOString().slice(0, 16),
                                      endDateTime: new Date(event.endDateTime).toISOString().slice(0, 16),
                                      location: event.location || '',
                                      isVirtual: event.isVirtual ?? false,
                                      meetingLink: event.meetingLink || '',
                                      imageUrl: event.imageUrl || '',
                                      capacity: event.capacity?.toString() || '',
                                      waitlistEnabled: event.waitlistEnabled ?? false,
                                      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
                                      tags: event.tags?.join(', ') || '',
                                    });
                                    // Set uploaded image if event has an image
                                    if (event.imageUrl) {
                                      setUploadedEventImage({ name: 'Event image', url: event.imageUrl });
                                    } else {
                                      setUploadedEventImage(null);
                                    }
                                    setEventDialogOpen(true);
                                  }}
                                  data-testid={`button-edit-${event.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setViewingEventRegistrations(event);
                                    setRegistrationStatusFilter('all');
                                  }}
                                  data-testid={`button-view-registrations-${event.id}`}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingEvent(event);
                                    setEventDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`button-delete-${event.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {event.status === 'published' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAnnouncingEvent(event);
                                      setNewsletterDialogOpen(true);
                                    }}
                                    className="text-pcs_blue hover:text-pcs_blue/80 hover:bg-pcs_blue/10"
                                    data-testid={`button-send-newsletter-${event.id}`}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Printable Forms Tab */}
        {activeTab === 'printable-forms' && <PrintableFormsTab />}

        {/* Evidence Gallery Tab */}
        {activeTab === 'media-library' && <EvidenceGalleryTab />}
      </div>

      {/* Create/Edit Event Dialog - Multi-Step Wizard */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-event-dialog-title">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={eventDialogTab} onValueChange={(value) => setEventDialogTab(value as 'details' | 'page-builder')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details" data-testid="tab-trigger-details">
                Event Details
              </TabsTrigger>
              <TabsTrigger value="page-builder" data-testid="tab-trigger-page-builder" className="relative">
                Page Builder
                {(eventFormData.isVirtual || eventFormData.eventType === 'webinar') && (
                  <Badge className="ml-2 bg-amber-500 hover:bg-amber-600 text-white" data-testid="page-builder-badge">
                    Important
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" data-testid="tab-content-details">
              <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-event-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={eventFormData.description}
                onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                rows={4}
                data-testid="textarea-event-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={eventFormData.eventType}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-event-type"
                >
                  <option value="workshop">Workshop</option>
                  <option value="webinar">Webinar</option>
                  <option value="community_event">Community Event</option>
                  <option value="training">Training</option>
                  <option value="celebration">Celebration</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={eventFormData.status}
                  onChange={(e) => setEventFormData({ ...eventFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-event-status"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.startDateTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, startDateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="input-start-datetime"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.endDateTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, endDateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="input-end-datetime"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-event-location"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={eventFormData.isVirtual}
                onChange={(e) => setEventFormData({ ...eventFormData, isVirtual: e.target.checked })}
                className="h-4 w-4"
                data-testid="checkbox-is-virtual"
              />
              <label className="text-sm font-medium text-gray-700">
                Is Virtual Event
              </label>
            </div>
            {(eventFormData.isVirtual || eventFormData.eventType === 'webinar') && (
              <div className="p-4 bg-blue-50 border-l-4 border-pcs_blue rounded-md" data-testid="virtual-event-notice">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📺</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-pcs_blue mb-1">
                      This is a virtual event!
                    </p>
                    <p className="text-sm text-gray-700">
                      Don't forget to configure your Event Page with live stream links after saving.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {eventFormData.isVirtual && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={eventFormData.meetingLink}
                  onChange={(e) => setEventFormData({ ...eventFormData, meetingLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://..."
                  data-testid="input-meeting-link"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image
              </label>
              
              {/* Hidden file input */}
              <input
                ref={eventImageInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleEventImageUpload}
                className="hidden"
                data-testid="input-event-image-file"
              />

              {!uploadedEventImage && !eventFormData.imageUrl ? (
                /* Upload button */
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => eventImageInputRef.current?.click()}
                  disabled={isUploadingEventImage}
                  className="w-full border-dashed border-2 h-32 flex flex-col items-center justify-center gap-2"
                  data-testid="button-upload-event-image"
                >
                  {isUploadingEventImage ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Click to upload event image</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WEBP (max 10MB)</span>
                    </>
                  )}
                </Button>
              ) : (
                /* Image preview */
                <div className="relative border border-gray-300 rounded-md overflow-hidden">
                  <img
                    src={`/api/objects${eventFormData.imageUrl}`}
                    alt="Event preview"
                    className="w-full h-48 object-cover"
                    data-testid="image-event-preview"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => eventImageInputRef.current?.click()}
                      className="bg-white/90 hover:bg-white"
                      data-testid="button-change-event-image"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={removeEventImage}
                      className="bg-red-600/90 hover:bg-red-600"
                      data-testid="button-remove-event-image"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
                    <p className="text-xs truncate" data-testid="text-image-filename">
                      {uploadedEventImage?.name || 'Event image'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (optional)
              </label>
              <input
                type="number"
                value={eventFormData.capacity}
                onChange={(e) => setEventFormData({ ...eventFormData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Leave empty for unlimited"
                data-testid="input-capacity"
              />
            </div>
            {eventFormData.capacity && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventFormData.waitlistEnabled}
                  onChange={(e) => setEventFormData({ ...eventFormData, waitlistEnabled: e.target.checked })}
                  className="h-4 w-4"
                  data-testid="checkbox-waitlist"
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable Waitlist
                </label>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={eventFormData.registrationDeadline}
                onChange={(e) => setEventFormData({ ...eventFormData, registrationDeadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-registration-deadline"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={eventFormData.tags}
                onChange={(e) => setEventFormData({ ...eventFormData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. plastic-free, sustainability, workshop"
                data-testid="input-tags"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEventDialogOpen(false)}
              data-testid="button-cancel-event-details"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!eventFormData.title || !eventFormData.description || !eventFormData.startDateTime || !eventFormData.endDateTime) {
                  toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                  });
                  return;
                }
                
                const eventData = {
                  title: eventFormData.title,
                  description: eventFormData.description,
                  eventType: eventFormData.eventType,
                  status: eventFormData.status,
                  startDateTime: eventFormData.startDateTime,
                  endDateTime: eventFormData.endDateTime,
                  location: eventFormData.location || null,
                  isVirtual: eventFormData.isVirtual,
                  meetingLink: eventFormData.meetingLink || null,
                  imageUrl: eventFormData.imageUrl || null,
                  capacity: eventFormData.capacity ? parseInt(eventFormData.capacity) : null,
                  waitlistEnabled: eventFormData.waitlistEnabled,
                  registrationDeadline: eventFormData.registrationDeadline || null,
                  tags: eventFormData.tags ? eventFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                };

                if (editingEvent) {
                  updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
                } else {
                  createEventMutation.mutate(eventData);
                }
              }}
              disabled={createEventMutation.isPending || updateEventMutation.isPending}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-save-event"
            >
              {createEventMutation.isPending || updateEventMutation.isPending 
                ? 'Saving...' 
                : (eventFormData.isVirtual || eventFormData.eventType === 'webinar') 
                  ? 'Save & Configure Event Page →' 
                  : 'Save Event'
              }
            </Button>
          </div>
            </TabsContent>

            <TabsContent value="page-builder" className="mt-4" data-testid="tab-content-page-builder">
              {!editingEvent ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Please save the event details first before configuring the page builder.</p>
                </div>
              ) : (
                <>
                  {(eventFormData.isVirtual || eventFormData.eventType === 'webinar') && (
                    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md" data-testid="page-builder-banner">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">⚠️</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800 mb-2">
                            IMPORTANT: Virtual events require Page Builder setup for attendees to access live streams!
                          </p>
                          <p className="text-sm text-gray-700 mb-3">
                            Without configuring this page, attendees won't be able to access your event content or live stream links. Use the sections below to add YouTube videos, download files, and testimonials.
                          </p>
                          <div className="bg-white border border-amber-200 rounded p-3">
                            <p className="text-xs font-medium text-gray-600 mb-1">Example - What attendees will see without setup:</p>
                            <p className="text-xs text-gray-500 italic">"Event page content not configured yet. Please check back later."</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <Form {...pageBuilderForm}>
                  <form onSubmit={pageBuilderForm.handleSubmit((data) => {
                    updateEventPageContentMutation.mutate({ id: editingEvent.id, data });
                  })} className="space-y-6">
                    
                    {/* Public Slug Section */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">Public Event Page</h3>
                      <FormField
                        control={pageBuilderForm.control}
                        name="publicSlug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Slug</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="international-day-of-action"
                                  data-testid="input-public-slug"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  if (eventFormData.title) {
                                    const slug = generateSlug(eventFormData.title);
                                    pageBuilderForm.setValue('publicSlug', slug);
                                  }
                                }}
                                data-testid="button-generate-slug"
                              >
                                Auto-generate
                              </Button>
                            </div>
                            {field.value && (
                              <FormDescription data-testid="text-slug-preview">
                                Preview: <a href={`/events/${field.value}`} target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">/events/{field.value}</a>
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* YouTube Videos Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">YouTube Videos</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendVideo({ title: '', url: '', description: '' })}
                          data-testid="button-add-video"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Video
                        </Button>
                      </div>
                      
                      {videoFields.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No videos added yet. Click "Add Video" to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {videoFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md space-y-3" data-testid={`video-item-${index}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Video {index + 1}</span>
                                <div className="flex gap-2">
                                  {index > 0 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveVideo(index, index - 1)}
                                      data-testid={`button-move-up-video-${index}`}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {index < videoFields.length - 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveVideo(index, index + 1)}
                                      data-testid={`button-move-down-video-${index}`}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeVideo(index)}
                                    data-testid={`button-remove-video-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`youtubeVideos.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid={`input-video-title-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`youtubeVideos.${index}.url`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>YouTube URL *</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://www.youtube.com/watch?v=..." data-testid={`input-video-url-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`youtubeVideos.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid={`textarea-video-description-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Event Pack Files Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Event Pack Files</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendPackFile({ title: '', fileUrl: '', fileName: '', fileSize: 0, description: '' })}
                          data-testid="button-add-pack-file"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add File
                        </Button>
                      </div>
                      
                      {packFileFields.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No files added yet. Click "Add File" to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {packFileFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md space-y-3" data-testid={`pack-file-item-${index}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">File {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePackFile(index)}
                                  data-testid={`button-remove-pack-file-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`eventPackFiles.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid={`input-pack-file-title-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`eventPackFiles.${index}.fileUrl`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>PDF File *</FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        {!field.value ? (
                                          <div>
                                            <input
                                              type="file"
                                              accept="application/pdf"
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const result = await handlePackFileUpload(file, index);
                                                  if (result) {
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileUrl`, result.fileUrl);
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileName`, result.fileName);
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileSize`, result.fileSize);
                                                  }
                                                }
                                                e.target.value = '';
                                              }}
                                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pcs_blue file:text-white hover:file:bg-pcs_blue/90"
                                              data-testid={`input-pack-file-upload-${index}`}
                                              disabled={uploadingPackFiles[index]}
                                            />
                                            {uploadingPackFiles[index] && (
                                              <p className="text-sm text-gray-600">Uploading...</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-5 w-5 text-gray-600" />
                                              <div>
                                                <p className="text-sm font-medium text-gray-900" data-testid={`text-pack-file-name-${index}`}>
                                                  {pageBuilderForm.watch(`eventPackFiles.${index}.fileName`) || 'File uploaded'}
                                                </p>
                                                {pageBuilderForm.watch(`eventPackFiles.${index}.fileSize`) && (
                                                  <p className="text-xs text-gray-500" data-testid={`text-pack-file-size-${index}`}>
                                                    {((pageBuilderForm.watch(`eventPackFiles.${index}.fileSize`) || 0) / 1024 / 1024).toFixed(2)} MB
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(`/api/objects${field.value}`, '_blank')}
                                                data-testid={`button-download-pack-file-${index}`}
                                              >
                                                <Download className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  pageBuilderForm.setValue(`eventPackFiles.${index}.fileUrl`, '');
                                                  pageBuilderForm.setValue(`eventPackFiles.${index}.fileName`, '');
                                                  pageBuilderForm.setValue(`eventPackFiles.${index}.fileSize`, 0);
                                                }}
                                                data-testid={`button-remove-uploaded-file-${index}`}
                                              >
                                                <Trash className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`eventPackFiles.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid={`textarea-pack-file-description-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Testimonials Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Testimonials</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendTestimonial({ quote: '', author: '', role: '' })}
                          data-testid="button-add-testimonial"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Testimonial
                        </Button>
                      </div>
                      
                      {testimonialFields.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No testimonials added yet. Click "Add Testimonial" to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {testimonialFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md space-y-3" data-testid={`testimonial-item-${index}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Testimonial {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTestimonial(index)}
                                  data-testid={`button-remove-testimonial-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`testimonials.${index}.quote`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quote *</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={3} data-testid={`textarea-testimonial-quote-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`testimonials.${index}.author`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Author Name *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid={`input-testimonial-author-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`testimonials.${index}.role`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Role/Title (optional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g. Teacher, School Principal" data-testid={`input-testimonial-role-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEventDialogOpen(false)}
                        data-testid="button-cancel-page-builder"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateEventPageContentMutation.isPending}
                        className="bg-pcs_blue hover:bg-pcs_blue/90"
                        data-testid="button-save-page-content"
                      >
                        {updateEventPageContentMutation.isPending ? 'Saving...' : 'Save Page Content'}
                      </Button>
                    </div>
                  </form>
                </Form>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Event Dialog */}
      <Dialog open={eventDeleteDialogOpen} onOpenChange={setEventDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-event-title">Delete Event</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete "{deletingEvent?.title}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEventDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deletingEvent) {
                  deleteEventMutation.mutate(deletingEvent.id);
                }
              }}
              disabled={deleteEventMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Registrations Dialog */}
      <Dialog open={viewingEventRegistrations !== null} onOpenChange={(open) => !open && setViewingEventRegistrations(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-registrations-title">
              Registrations for {viewingEventRegistrations?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Status:
                </label>
                <select
                  value={registrationStatusFilter}
                  onChange={(e) => setRegistrationStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-registration-status-filter"
                >
                  <option value="all">All</option>
                  <option value="registered">Registered</option>
                  <option value="attended">Attended</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="waitlisted">Waitlisted</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const headers = ['Name', 'Email', 'School', 'Country', 'Status', 'Registered Date'];
                  const rows = eventRegistrations.map(reg => [
                    `${reg.user.firstName} ${reg.user.lastName}`,
                    reg.user.email,
                    reg.school?.name || 'N/A',
                    reg.school?.country || 'N/A',
                    reg.status,
                    reg.registeredAt ? format(new Date(reg.registeredAt), 'MMM d, yyyy h:mm a') : 'N/A'
                  ]);
                  
                  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${viewingEventRegistrations?.title.replace(/\s+/g, '_')}_registrations.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            
            {registrationsLoading ? (
              <div className="py-8">
                <LoadingSpinner message="Loading registrations..." />
              </div>
            ) : eventRegistrations.length === 0 ? (
              <EmptyState
                title="No registrations yet"
                description="This event has no registrations"
                icon={Users}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-registrations">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registered</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegistrations.map((registration) => (
                      <tr key={registration.id} className="border-b hover:bg-gray-50" data-testid={`row-registration-${registration.id}`}>
                        <td className="px-4 py-3 text-sm text-gray-900" data-testid={`text-name-${registration.id}`}>
                          {registration.user.firstName} {registration.user.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-email-${registration.id}`}>
                          {registration.user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-school-${registration.id}`}>
                          {registration.school?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm" data-testid={`text-status-${registration.id}`}>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            registration.status === 'attended' ? 'bg-green-100 text-green-700' :
                            registration.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                            registration.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {registration.status ? registration.status.charAt(0).toUpperCase() + registration.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-date-${registration.id}`}>
                          {registration.registeredAt ? format(new Date(registration.registeredAt), 'MMM d, yyyy') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {registration.status === 'registered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateRegistrationMutation.mutate({ id: registration.id, status: 'attended' });
                              }}
                              disabled={updateRegistrationMutation.isPending}
                              data-testid={`button-mark-attended-${registration.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Attended
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Newsletter Announcement Dialog (SendGrid) */}
      <Dialog open={newsletterDialogOpen} onOpenChange={setNewsletterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-newsletter-title">
              Send Event Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Send "{announcingEvent?.title}" via email to teachers.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Type
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as 'all_teachers' | 'custom')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-recipient-type"
              >
                <option value="all_teachers">All Teachers ({teacherEmailsData?.count || 0} teachers)</option>
                <option value="custom">Custom Email List</option>
              </select>
            </div>

            {recipientType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Addresses
                  <span className="text-xs text-gray-500 ml-2">(comma-separated)</span>
                </label>
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                  placeholder="email1@example.com, email2@example.com"
                  data-testid="input-custom-emails"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewsletterDialogOpen(false);
                setAnnouncingEvent(null);
                setRecipientType('all_teachers');
                setCustomEmails('');
              }}
              data-testid="button-cancel-newsletter"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (announcingEvent) {
                  const emails = recipientType === 'custom' 
                    ? customEmails.split(',').map(e => e.trim()).filter(Boolean)
                    : [];
                  sendAnnouncementMutation.mutate({
                    eventId: announcingEvent.id,
                    recipientType,
                    customEmails: emails,
                  });
                }
              }}
              disabled={
                !announcingEvent || 
                (recipientType === 'custom' && !customEmails.trim()) ||
                sendAnnouncementMutation.isPending
              }
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-confirm-newsletter"
            >
              {sendAnnouncementMutation.isPending ? 'Sending...' : 'Send Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Bulk School Operations Dialog */}
      {bulkSchoolDialogOpen && bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {bulkAction.type === 'update' ? 'Bulk Update Schools' : 'Bulk Delete Schools'}
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  This action will affect <strong>{selectedSchools.length}</strong> schools.
                </p>
              </div>
              
              {bulkAction.type === 'update' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Current Stage
                  </label>
                  <select
                    value={bulkAction.updates?.currentStage || 'inspire'}
                    onChange={(e) => setBulkAction(prev => prev ? { 
                      ...prev, 
                      updates: { ...prev.updates, currentStage: e.target.value } 
                    } : null)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    data-testid="select-bulk-stage"
                  >
                    <option value="inspire">Inspire</option>
                    <option value="investigate">Investigate</option>
                    <option value="act">Act</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    All selected schools will be moved to this program stage.
                  </p>
                </div>
              )}

              {bulkAction.type === 'delete' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> This action cannot be undone. All selected schools and their associated data will be permanently deleted.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkSchoolDialogOpen(false);
                    setBulkAction(null);
                  }}
                  className="flex-1"
                  data-testid="button-cancel-bulk-school-operation"
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${
                    bulkAction.type === 'update' ? 'bg-pcs_blue hover:bg-blue-600' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={() => {
                    if (bulkAction.type === 'delete') {
                      bulkSchoolDeleteMutation.mutate(selectedSchools);
                    } else {
                      bulkSchoolUpdateMutation.mutate({
                        schoolIds: selectedSchools,
                        updates: bulkAction.updates || {},
                      });
                    }
                  }}
                  disabled={bulkSchoolUpdateMutation.isPending || bulkSchoolDeleteMutation.isPending}
                  data-testid="button-confirm-bulk-school-operation"
                >
                  {(bulkSchoolUpdateMutation.isPending || bulkSchoolDeleteMutation.isPending) ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Study Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0" data-testid="dialog-case-study-editor">
          <CaseStudyEditor
            caseStudy={editingCaseStudy || undefined}
            onSave={(data) => {
              if (editingCaseStudy) {
                updateCaseStudyMutation.mutate({ ...data, id: editingCaseStudy.id });
              } else {
                createCaseStudyMutation.mutate({ ...data, createdBy: user?.id || '' });
              }
            }}
            onCancel={() => {
              setEditorOpen(false);
              setEditingCaseStudy(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Case Study Confirmation */}
      <AlertDialog open={!!deletingCaseStudy} onOpenChange={() => setDeletingCaseStudy(null)}>
        <AlertDialogContent data-testid="dialog-delete-case-study">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case Study</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCaseStudy?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCaseStudy && deleteCaseStudyMutation.mutate(deletingCaseStudy.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* School Detail Dialog */}
      {viewingSchool && (
        <Dialog open={!!viewingSchool} onOpenChange={() => {
          setViewingSchool(null);
          setEditingSchoolLanguage(false);
          setSchoolLanguageValue('');
        }}>
          <DialogContent className="max-w-2xl" data-testid={`dialog-school-detail-${viewingSchool.id}`}>
            <DialogHeader>
              <DialogTitle className="text-2xl" data-testid={`text-school-name-${viewingSchool.id}`}>
                {viewingSchool.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Country</label>
                  <p className="text-base" data-testid={`text-country-${viewingSchool.id}`}>
                    {viewingSchool.country}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">School Type</label>
                  <p className="text-base capitalize" data-testid={`text-type-${viewingSchool.id}`}>
                    {viewingSchool.type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    Preferred Language
                    {!editingSchoolLanguage && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 px-2"
                        onClick={() => {
                          setEditingSchoolLanguage(true);
                          setSchoolLanguageValue(viewingSchool.primaryLanguage || 'en');
                        }}
                        data-testid={`button-edit-language-${viewingSchool.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </label>
                  {editingSchoolLanguage ? (
                    <div className="flex gap-2 items-center">
                      <Select 
                        value={schoolLanguageValue} 
                        onValueChange={setSchoolLanguageValue}
                      >
                        <SelectTrigger className="h-9" data-testid={`select-language-${viewingSchool.id}`}>
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
                          <SelectItem value="ru">Russian</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                          <SelectItem value="ko">Korean</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="id">Indonesian</SelectItem>
                          <SelectItem value="el">Greek</SelectItem>
                          <SelectItem value="cy">Welsh</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          updateSchoolLanguageMutation.mutate({
                            schoolId: viewingSchool.id,
                            primaryLanguage: schoolLanguageValue
                          });
                        }}
                        disabled={updateSchoolLanguageMutation.isPending}
                        data-testid={`button-save-language-${viewingSchool.id}`}
                      >
                        {updateSchoolLanguageMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingSchoolLanguage(false);
                          setSchoolLanguageValue('');
                        }}
                        data-testid={`button-cancel-language-${viewingSchool.id}`}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <p className="text-base" data-testid={`text-language-${viewingSchool.id}`}>
                      {viewingSchool.primaryLanguage ? (() => {
                        const langMap: Record<string, string> = {
                          'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
                          'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch', 'ru': 'Russian',
                          'zh': 'Chinese', 'ko': 'Korean', 'ar': 'Arabic', 'id': 'Indonesian',
                          'el': 'Greek', 'cy': 'Welsh'
                        };
                        return langMap[viewingSchool.primaryLanguage] || viewingSchool.primaryLanguage;
                      })() : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Stage</label>
                  <Badge 
                    className={getStageColor(viewingSchool.currentStage)}
                    data-testid={`badge-stage-${viewingSchool.id}`}
                  >
                    {viewingSchool.currentStage}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Progress</label>
                  <div className="flex items-center gap-2 mt-1" data-testid={`progress-${viewingSchool.id}`}>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal h-2 rounded-full transition-all"
                        style={{ width: `${viewingSchool.progressPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{viewingSchool.progressPercentage}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Round</label>
                  <p className="text-base" data-testid={`text-round-${viewingSchool.id}`}>
                    {viewingSchool.currentRound || 1}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Student Count</label>
                  <p className="text-base" data-testid={`text-students-${viewingSchool.id}`}>
                    {viewingSchool.studentCount || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Joined</label>
                  <p className="text-base" data-testid={`text-joined-${viewingSchool.id}`}>
                    {new Date(viewingSchool.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {viewingSchool.address && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-base" data-testid={`text-address-${viewingSchool.id}`}>
                    {viewingSchool.address}
                  </p>
                </div>
              )}

              {/* Manage Progression Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-pcs_blue" />
                      Manage Progression
                    </div>
                    {!editingProgression && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingProgression(true);
                          setProgressionFormData({
                            currentStage: viewingSchool.currentStage as 'inspire' | 'investigate' | 'act',
                            currentRound: viewingSchool.currentRound || 1,
                            inspireCompleted: viewingSchool.inspireCompleted || false,
                            investigateCompleted: viewingSchool.investigateCompleted || false,
                            actCompleted: viewingSchool.actCompleted || false,
                          });
                        }}
                        data-testid={`button-edit-progression-${viewingSchool.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Progression
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingProgression ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Current Stage</label>
                          <Select
                            value={progressionFormData.currentStage}
                            onValueChange={(value) => 
                              setProgressionFormData({
                                ...progressionFormData,
                                currentStage: value as 'inspire' | 'investigate' | 'act'
                              })
                            }
                          >
                            <SelectTrigger data-testid={`select-stage-${viewingSchool.id}`}>
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
                          <label className="text-sm font-medium text-gray-700">Current Round</label>
                          <Input
                            type="number"
                            min="1"
                            value={progressionFormData.currentRound}
                            onChange={(e) => 
                              setProgressionFormData({
                                ...progressionFormData,
                                currentRound: parseInt(e.target.value) || 1
                              })
                            }
                            data-testid={`input-round-${viewingSchool.id}`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Stage Completion</label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={progressionFormData.inspireCompleted}
                              onCheckedChange={(checked) => 
                                setProgressionFormData({
                                  ...progressionFormData,
                                  inspireCompleted: checked as boolean
                                })
                              }
                              data-testid={`checkbox-inspire-${viewingSchool.id}`}
                            />
                            <span className="text-sm">Inspire Completed</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={progressionFormData.investigateCompleted}
                              onCheckedChange={(checked) => 
                                setProgressionFormData({
                                  ...progressionFormData,
                                  investigateCompleted: checked as boolean
                                })
                              }
                              data-testid={`checkbox-investigate-${viewingSchool.id}`}
                            />
                            <span className="text-sm">Investigate Completed</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={progressionFormData.actCompleted}
                              onCheckedChange={(checked) => 
                                setProgressionFormData({
                                  ...progressionFormData,
                                  actCompleted: checked as boolean
                                })
                              }
                              data-testid={`checkbox-act-${viewingSchool.id}`}
                            />
                            <span className="text-sm">Act Completed</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => setEditingProgression(false)}
                          data-testid={`button-cancel-progression-${viewingSchool.id}`}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => {
                            updateSchoolProgressionMutation.mutate({
                              schoolId: viewingSchool.id,
                              updates: progressionFormData
                            });
                          }}
                          disabled={updateSchoolProgressionMutation.isPending}
                          className="bg-pcs_blue hover:bg-pcs_blue/90"
                          data-testid={`button-save-progression-${viewingSchool.id}`}
                        >
                          {updateSchoolProgressionMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <p>Use this section to manually set the school's progression stage, round, and completion status. This allows you to override the automatic progression based on evidence submission.</p>
                      <div className="mt-3 space-y-1">
                        <p><strong>Current Stage:</strong> {viewingSchool.currentStage}</p>
                        <p><strong>Current Round:</strong> {viewingSchool.currentRound || 1}</p>
                        <p><strong>Stage Completion:</strong></p>
                        <ul className="ml-4 list-disc">
                          <li>Inspire: {viewingSchool.inspireCompleted ? '✓ Completed' : '○ Not completed'}</li>
                          <li>Investigate: {viewingSchool.investigateCompleted ? '✓ Completed' : '○ Not completed'}</li>
                          <li>Act: {viewingSchool.actCompleted ? '✓ Completed' : '○ Not completed'}</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reduction Promises Impact Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-pcs_blue" />
                    Action Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schoolPromisesQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
                      <span className="text-gray-600">Loading promises data...</span>
                    </div>
                  ) : schoolPromisesQuery.error ? (
                    <div className="text-center py-8 text-red-600">
                      Failed to load promises data. Please try again.
                    </div>
                  ) : totalPromises === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      This school hasn't made any reduction promises yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Total Promises</label>
                          <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-promises-total">
                            {totalPromises}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Items Reduced (annual)</label>
                          <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-items-reduced">
                            {totalAnnualReduction.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Weight Reduced (kg/year)</label>
                          <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-weight-reduced">
                            {totalAnnualWeightKg.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Ocean Impact Section */}
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-teal" />
                          Ocean Impact
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Ocean Bottles Prevented</label>
                            <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-ocean-bottles">
                              <TrendingDown className="h-4 w-4" />
                              {promiseMetrics?.funMetrics.oceanPlasticBottles.toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Fish Saved</label>
                            <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-fish-saved">
                              <Fish className="h-4 w-4" />
                              {promiseMetrics?.funMetrics.fishSaved.toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Sea Turtles Saved</label>
                            <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-sea-turtles">
                              <Heart className="h-4 w-4" />
                              {promiseMetrics?.funMetrics.seaTurtles.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Environmental Impact Section */}
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-600" />
                          Environmental Impact
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600">CO₂ Prevented (kg)</label>
                            <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-co2-prevented">
                              <Factory className="h-4 w-4" />
                              {promiseMetrics?.seriousMetrics.co2Prevented.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Oil Saved (liters)</label>
                            <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-oil-saved">
                              <Droplets className="h-4 w-4" />
                              {promiseMetrics?.seriousMetrics.oilSaved.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600">Waste Prevented (tons)</label>
                            <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-waste-prevented">
                              <Trash className="h-4 w-4" />
                              {promiseMetrics?.seriousMetrics.tons.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between pt-4">
                <Button
                  onClick={() => {
                    const schoolId = viewingSchool.id;
                    setViewingSchool(null); // Close school dialog first
                    setTimeout(() => {
                      // Open evidence form after dialog closes
                      setEvidenceFormSchoolId(schoolId);
                      setShowAdminEvidenceForm(true);
                    }, 100);
                  }}
                  className="bg-teal hover:bg-teal/90"
                  data-testid="button-submit-evidence-for-school"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Evidence for This School
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setViewingSchool(null)}
                  data-testid="button-close-school-detail"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Admin Evidence Submission Form */}
      {showAdminEvidenceForm && evidenceFormSchoolId && (
        <EvidenceSubmissionForm
          onClose={() => {
            setShowAdminEvidenceForm(false);
            setEvidenceFormSchoolId(null);
          }}
          schoolId={evidenceFormSchoolId}
          isAdminOrPartner={true}
        />
      )}

      {/* Delete School Confirmation Dialog */}
      <AlertDialog open={!!deletingSchool} onOpenChange={(open) => !open && setDeletingSchool(null)}>
        <AlertDialogContent data-testid="dialog-delete-school-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingSchool?.name}</strong>? This action cannot be undone and will permanently remove the school and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-school">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSchool && deleteSchoolMutation.mutate(deletingSchool.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteSchoolMutation.isPending}
              data-testid="button-confirm-delete-school"
            >
              {deleteSchoolMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Evidence Requirement Add/Edit Dialog */}
      <Dialog open={requirementDialogOpen} onOpenChange={setRequirementDialogOpen}>
        <DialogContent data-testid="dialog-edit-requirement">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                value={requirementFormData.title}
                onChange={(e) => setRequirementFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter requirement title"
                data-testid="input-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <Textarea
                value={requirementFormData.description}
                onChange={(e) => setRequirementFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter requirement description"
                rows={4}
                data-testid="input-description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Helpful Resource Link
              </label>
              <Input
                value={requirementFormData.resourceUrl}
                onChange={(e) => setRequirementFormData(prev => ({ ...prev, resourceUrl: e.target.value }))}
                type="url"
                placeholder="https://example.com/resource"
                data-testid="input-resource-url"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRequirementDialogOpen(false);
                  setEditingRequirement(null);
                  setRequirementFormData({ title: '', description: '', resourceUrl: '' });
                }}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-pcs_blue hover:bg-pcs_blue/90 flex-1"
                disabled={!requirementFormData.title.trim() || !requirementFormData.description.trim() || createRequirementMutation.isPending || updateRequirementMutation.isPending}
                onClick={() => {
                  if (editingRequirement) {
                    updateRequirementMutation.mutate({
                      id: editingRequirement.id,
                      data: {
                        title: requirementFormData.title,
                        description: requirementFormData.description,
                        resourceUrl: requirementFormData.resourceUrl || undefined,
                      },
                    });
                  } else {
                    const stageRequirements = evidenceRequirements.filter(req => req.stage === activeEvidenceStage);
                    const maxOrder = stageRequirements.length > 0
                      ? Math.max(...stageRequirements.map(r => r.orderIndex))
                      : -1;
                    
                    createRequirementMutation.mutate({
                      title: requirementFormData.title,
                      description: requirementFormData.description,
                      resourceUrl: requirementFormData.resourceUrl || undefined,
                      stage: activeEvidenceStage,
                      orderIndex: maxOrder + 1,
                    });
                  }
                }}
                data-testid="button-save"
              >
                {createRequirementMutation.isPending || updateRequirementMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Requirement Delete Confirmation Dialog */}
      <AlertDialog open={requirementDeleteDialogOpen} onOpenChange={setRequirementDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this requirement? This cannot be undone.
              {deletingRequirement && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <p className="font-semibold">{deletingRequirement.title}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRequirement && deleteRequirementMutation.mutate(deletingRequirement.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteRequirementMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRequirementMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
