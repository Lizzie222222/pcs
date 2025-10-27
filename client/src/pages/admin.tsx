import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { Link, useLocation } from "wouter";
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
  ShieldCheck,
  ShieldAlert,
  Info,
  Copy,
  Table as TableIcon,
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
  Check,
  Bell,
  ExternalLink,
  Languages,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import AssignTeacherForm from "@/components/admin/AssignTeacherForm";
import UserManagementTab from "@/components/admin/UserManagementTab";
import ResourcesManagement from "@/components/admin/ResourcesManagement";
import ResourcePackManagement from "@/components/admin/ResourcePackManagement";
const AnalyticsContent = lazy(() => import("@/components/admin/AnalyticsContent"));
const CaseStudyManagement = lazy(() => import("@/components/admin/CaseStudyManagement"));
import EmailManagementSection from "@/components/admin/EmailManagementSection";
import EvidenceGalleryTab from "@/components/admin/EvidenceGalleryTab";
import PrintableFormsTab from "@/components/admin/PrintableFormsTab";
import DataImport from "@/components/admin/DataImport";
import ReviewsSection from "@/components/admin/reviews/ReviewsSection";
import SchoolsSection from '@/components/admin/schools/SchoolsSection';
import TeamsSection from '@/components/admin/teams/TeamsSection';
import EvidenceRequirementsSection from '@/components/admin/evidence-requirements/EvidenceRequirementsSection';
import EventsSection from '@/components/admin/events/EventsSection';
import type { ReductionPromise, Event, EventRegistration, EvidenceWithSchool, CaseStudy } from "@shared/schema";
import { calculateAggregateMetrics } from "@shared/plasticMetrics";
import { format, parseISO } from "date-fns";
import { BANNER_GRADIENTS, getGradientById } from "@shared/gradients";
import pcsLogoUrl from "@assets/PSC Logo - Blue_1761334524895.png";

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
  school?: {
    id: string;
    name: string;
    country: string;
    photoConsentStatus?: 'pending' | 'approved' | 'rejected' | null;
    photoConsentDocumentUrl?: string | null;
  };
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
  resourceId: string | null;
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

// Activity Logs Tab Component
function ActivityLogsTab({ 
  activityPage, 
  setActivityPage, 
  activityLimit, 
  activityFilters, 
  setActivityFilters 
}: {
  activityPage: number;
  setActivityPage: (page: number | ((prev: number) => number)) => void;
  activityLimit: number;
  activityFilters: {
    actionType: string;
    userEmail: string;
    startDate: string;
    endDate: string;
  };
  setActivityFilters: (filters: any) => void;
}) {
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams({
    page: activityPage.toString(),
    limit: activityLimit.toString(),
    ...(activityFilters.actionType !== 'all' && { actionType: activityFilters.actionType }),
    ...(activityFilters.userEmail && { userEmail: activityFilters.userEmail }),
    ...(activityFilters.startDate && { startDate: activityFilters.startDate }),
    ...(activityFilters.endDate && { endDate: activityFilters.endDate }),
  });

  const { data: activityLogsData, isLoading: isLoadingLogs } = useQuery<{
    logs: Array<{
      id: string;
      userId: string;
      actionType: string;
      actionDetails: Record<string, any> | null;
      ipAddress: string | null;
      createdAt: string;
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['/api/admin/activity-logs', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/admin/activity-logs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return response.json();
    },
  });

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatActionDetails = (details: Record<string, any> | null) => {
    if (!details) return '-';
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';
    return entries
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              User Activity Logs
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Track and monitor user activities across the platform
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters Section */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <Select
                value={activityFilters.actionType}
                onValueChange={(value) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, actionType: value }))}
              >
                <SelectTrigger data-testid="select-action-type">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="evidence_submit">Evidence Submit</SelectItem>
                  <SelectItem value="evidence_approve">Evidence Approve</SelectItem>
                  <SelectItem value="evidence_reject">Evidence Reject</SelectItem>
                  <SelectItem value="school_create">School Create</SelectItem>
                  <SelectItem value="school_update">School Update</SelectItem>
                  <SelectItem value="user_create">User Create</SelectItem>
                  <SelectItem value="user_update">User Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Email Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <Input
                placeholder="Search by email..."
                value={activityFilters.userEmail}
                onChange={(e) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, userEmail: e.target.value }))}
                data-testid="input-user-email"
              />
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={activityFilters.startDate}
                onChange={(e) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={activityFilters.endDate}
                onChange={(e) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setActivityPage(1);
                queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] });
              }}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-apply-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActivityFilters({
                  actionType: 'all',
                  userEmail: '',
                  startDate: '',
                  endDate: '',
                });
                setActivityPage(1);
              }}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Activity Logs Table */}
        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-activity-logs">
            <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full mr-3" />
            <span className="text-gray-600">Loading activity logs...</span>
          </div>
        ) : !activityLogsData || activityLogsData.logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Activity Logs"
            description="No user activity logs found matching your filters."
            data-testid="empty-activity-logs"
          />
        ) : (
          <div className="space-y-4">
            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-datetime">
                      Date/Time
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-user">
                      User
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-action">
                      Action Type
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-details">
                      Details
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-ip">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogsData.logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="border-b hover:bg-gray-50"
                      data-testid={`activity-log-row-${log.id}`}
                    >
                      <td className="p-3 text-sm text-gray-700" data-testid={`log-datetime-${log.id}`}>
                        {format(parseISO(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="p-3 text-sm" data-testid={`log-user-${log.id}`}>
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.user.firstName && log.user.lastName
                              ? `${log.user.firstName} ${log.user.lastName}`
                              : log.user.email}
                          </div>
                          {log.user.firstName && log.user.lastName && (
                            <div className="text-xs text-gray-500">{log.user.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3" data-testid={`log-action-${log.id}`}>
                        <Badge variant="outline" className="font-medium">
                          {formatActionType(log.actionType)}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-xs truncate" data-testid={`log-details-${log.id}`}>
                        {formatActionDetails(log.actionDetails)}
                      </td>
                      <td className="p-3 text-sm text-gray-600" data-testid={`log-ip-${log.id}`}>
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-gray-600" data-testid="text-pagination-info">
                Showing {((activityPage - 1) * activityLimit) + 1} to{' '}
                {Math.min(activityPage * activityLimit, activityLogsData.total)} of{' '}
                {activityLogsData.total} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                  disabled={activityPage === 1}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <div className="flex items-center px-4 text-sm text-gray-700" data-testid="text-page-number">
                  Page {activityPage} of {activityLogsData.totalPages}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActivityPage(prev => Math.min(activityLogsData.totalPages, prev + 1))}
                  disabled={activityPage >= activityLogsData.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * @description Main admin panel component orchestrating all administrative functionality including evidence review, school management, case studies, events, and email campaigns. Manages state for multiple tabs and handles admin-only access control with automatic redirects.
 * @param {Object} props - Component props
 * @param {string} props.initialTab - Initial active tab (default: 'overview')
 * @returns {JSX.Element} Admin dashboard with tabbed interface
 * @location client/src/pages/admin.tsx#L731
 * @related server/routes.ts (registerRoutes), shared/schema.ts (users, schools, evidence, caseStudies, events), server/auth.ts (isAuthenticated)
 */
export default function Admin({ initialTab = 'overview' }: { initialTab?: 'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'resource-packs' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'activity' } = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [location] = useLocation();
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'resource-packs' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'media-library' | 'data-import' | 'activity'>(initialTab);
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
  
  // Photo consent state (shared with Reviews)
  const [photoConsentRejectDialogOpen, setPhotoConsentRejectDialogOpen] = useState(false);
  const [photoConsentRejectNotes, setPhotoConsentRejectNotes] = useState('');

  // Activity Logs state
  const [activityFilters, setActivityFilters] = useState({
    actionType: 'all',
    userEmail: '',
    startDate: '',
    endDate: '',
  });
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit] = useState(20);

  // Check for welcomed parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcomed') === 'true') {
      setShowWelcomeBanner(true);
    }
  }, [location]);

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

  // Pending audits query - needed for navigation badge
  const { data: pendingAudits = [] } = useQuery<PendingAudit[]>({
    queryKey: ['/api/admin/audits/pending'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin)),
    retry: false,
  });

  // Fetch pending photo consent - needed for navigation badge
  const { data: pendingPhotoConsent = [] } = useQuery<Array<{
    id: string;
    name: string;
    country: string;
    photoConsentDocumentUrl: string | null;
    photoConsentUploadedAt: Date | null;
    photoConsentStatus: string | null;
  }>>({
    queryKey: ['/api/admin/photo-consent/pending'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin)),
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (statsError && isUnauthorizedError(statsError as Error)) {
      toast({
        title: "Unauthorized",
        description: "Admin session expired. Please log in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 500);
    }
  }, [statsError, toast]);

  // Resources queries (used by EvidenceRequirementsSection and EventsSection)
  const { data: allResources = [], isLoading: resourcesLoading } = useQuery<any[]>({
    queryKey: ['/api/resources'],
  });
  // Photo consent mutations (shared with Reviews and Schools)
  const approvePhotoConsentMutation = useMutation({
    mutationFn: async ({ schoolId, notes }: { schoolId: string; notes: string }) => {
      return await apiRequest('POST', `/api/admin/schools/${schoolId}/photo-consent/approve`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Photo Consent Approved",
        description: "The photo consent document has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photo-consent/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve photo consent document.",
        variant: "destructive",
      });
    },
  });

  const rejectPhotoConsentMutation = useMutation({
    mutationFn: async ({ schoolId, notes }: { schoolId: string; notes: string }) => {
      return await apiRequest('POST', `/api/admin/schools/${schoolId}/photo-consent/reject`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Photo Consent Rejected",
        description: "The photo consent document has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photo-consent/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      setPhotoConsentRejectDialogOpen(false);
      setPhotoConsentRejectNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject photo consent document.",
        variant: "destructive",
      });
    },
  });

  // Export function
  const handleExport = async (type: 'schools' | 'evidence' | 'users') => {
    try {
      let queryParams = new URLSearchParams({ format: exportFormat });
      
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
        {/* Welcome Banner */}
        {showWelcomeBanner && (
          <Alert 
            className="mb-6 bg-gradient-to-r from-pcs_blue via-teal to-pcs_blue text-white border-none shadow-xl relative overflow-hidden"
            data-testid="alert-admin-welcome"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <AlertTitle className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={pcsLogoUrl} 
                    alt="Plastic Clever Schools" 
                    className="h-10 w-auto bg-white rounded-lg p-1"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                      <span className="text-2xl font-bold" data-testid="text-admin-welcome-title">
                        Lucky You!
                      </span>
                      <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowWelcomeBanner(false)}
                  className="hover:bg-white/20 text-white"
                  data-testid="button-dismiss-admin-welcome"
                >
                  <X className="h-5 w-5" />
                </Button>
              </AlertTitle>
              <AlertDescription className="text-white/95 text-lg">
                <div className="flex items-start gap-3 mt-2">
                  <CheckCircle className="h-6 w-6 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">
                      Welcome to the Plastic Clever Schools admin team!
                    </p>
                    <p className="text-white/90">
                      You now have full access to manage the program, review evidence submissions, publish case studies, and help schools on their journey to reduce plastic waste.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

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
                  ['schools', 'teams', 'users', 'activity', 'data-import'].includes(activeTab)
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
                Manage Schools
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('teams')}
                className={activeTab === 'teams' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-teams"
              >
                Manage Teams
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-users"
              >
                User Management
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('activity')}
                className={activeTab === 'activity' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-activity"
              >
                User Activity
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveTab('data-import')}
                className={activeTab === 'data-import' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-data-import"
              >
                Import Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Content - Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  ['resources', 'resource-packs', 'case-studies', 'events', 'media-library'].includes(activeTab)
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
                Manage Resources
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('resource-packs')}
                className={activeTab === 'resource-packs' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-resource-packs"
              >
                Manage Resource Packs
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('case-studies')}
                className={activeTab === 'case-studies' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-case-studies"
              >
                Create Case Studies
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('events')}
                className={activeTab === 'events' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-events"
              >
                Manage Events
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

          {/* Review Queue - Top Level Tab */}
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-md font-medium transition-colors relative ${
              activeTab === 'reviews' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            data-testid="tab-reviews"
          >
            Review Queue
            {((stats && stats.pendingEvidence > 0) || pendingAudits.length > 0 || pendingPhotoConsent.length > 0) && (
              <span 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                data-testid="badge-reviews-count"
              >
                {(stats?.pendingEvidence || 0) + pendingAudits.length + pendingPhotoConsent.length}
              </span>
            )}
          </button>

          {/* Program - Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 relative ${
                  ['evidence-requirements', 'printable-forms'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-program"
              >
                Program
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('evidence-requirements')}
                className={activeTab === 'evidence-requirements' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-evidence-requirements"
              >
                Set Evidence Requirements
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('printable-forms')}
                className={activeTab === 'printable-forms' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-printable-forms"
              >
                Review Printable Forms
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


        {/* Review Queue Tab */}
        {activeTab === 'reviews' && (
          <ReviewsSection 
            activeTab={activeTab} 
            stats={stats}
            approvePhotoConsentMutation={approvePhotoConsentMutation}
            rejectPhotoConsentMutation={rejectPhotoConsentMutation}
          />
        )}

        {/* Schools Tab */}
        {activeTab === 'schools' && (
          <SchoolsSection
            activeTab={activeTab}
            stats={stats}
            approvePhotoConsentMutation={approvePhotoConsentMutation}
            rejectPhotoConsentMutation={rejectPhotoConsentMutation}
            photoConsentRejectDialogOpen={photoConsentRejectDialogOpen}
            setPhotoConsentRejectDialogOpen={setPhotoConsentRejectDialogOpen}
            photoConsentRejectNotes={photoConsentRejectNotes}
            setPhotoConsentRejectNotes={setPhotoConsentRejectNotes}
          />
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && <TeamsSection activeTab={activeTab} />}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <ResourcesManagement />
        )}

        {/* Resource Packs Tab */}
        {activeTab === 'resource-packs' && (
          <ResourcePackManagement />
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <UserManagementTab />
        )}

        {/* Data Import Tab */}
        {activeTab === 'data-import' && (
          <DataImport />
        )}

        {/* User Activity Logs Tab */}
        {activeTab === 'activity' && (
          <ActivityLogsTab
            activityPage={activityPage}
            setActivityPage={setActivityPage}
            activityLimit={activityLimit}
            activityFilters={activityFilters}
            setActivityFilters={setActivityFilters}
          />
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
          <Suspense fallback={<LoadingSpinner message="Loading case studies..." />}>
            <CaseStudyManagement
              user={user}
              schools={schools || []}
              countryOptions={countryOptions.map(opt => opt.value)}
              isActive={activeTab === 'case-studies'}
            />
          </Suspense>
        )}

        {/* Evidence Requirements Tab */}
        {activeTab === 'evidence-requirements' && (
          <EvidenceRequirementsSection 
            allResources={allResources}
            resourcesLoading={resourcesLoading}
          />
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <EventsSection 
            allResources={allResources}
            resourcesLoading={resourcesLoading}
          />
        )}

        {/* Printable Forms Tab */}
        {activeTab === 'printable-forms' && <PrintableFormsTab />}

        {/* Evidence Gallery Tab */}
        {activeTab === 'media-library' && <EvidenceGalleryTab />}
      </div>

    </div>
  );
}
