import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountries } from "@/hooks/useCountries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  ChevronUp
} from "lucide-react";

import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";

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
}

interface SchoolData {
  id: string;
  name: string;
  country: string;
  currentStage: string;
  progressPercentage: number;
  studentCount: number;
  createdAt: string;
  primaryContactId: string;
  primaryContactEmail: string | null;
}

// Analytics interfaces
interface AnalyticsOverview {
  totalSchools: number;
  totalUsers: number;
  totalEvidence: number;
  completedAwards: number;
  pendingEvidence: number;
  averageProgress: number;
  studentsImpacted: number;
  countriesReached: number;
}

interface SchoolProgressAnalytics {
  stageDistribution: Array<{ stage: string; count: number }>;
  progressRanges: Array<{ range: string; count: number }>;
  completionRates: Array<{ metric: string; rate: number }>;
  monthlyRegistrations: Array<{ month: string; count: number }>;
  schoolsByCountry: Array<{ country: string; count: number; students: number }>;
}

interface EvidenceAnalytics {
  submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
  stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
  reviewTurnaround: Array<{ range: string; count: number }>;
  topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
}

interface UserEngagementAnalytics {
  registrationTrends: Array<{ month: string; teachers: number; admins: number }>;
  roleDistribution: Array<{ role: string; count: number }>;
  activeUsers: Array<{ period: string; active: number }>;
  schoolEngagement: Array<{ schoolName: string; users: number; evidence: number; lastActivity: Date }>;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string | null;
  language: string | null;
  country: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  downloadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

interface UserWithSchools {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isAdmin: boolean;
    createdAt: string;
  };
  schools: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

// Color palette for charts
const ANALYTICS_COLORS = ['#0B3D5D', '#019ADE', '#02BBB4', '#FFC557', '#FF595A', '#6B7280', '#10B981', '#8B5CF6'];

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

function AssignTeacherForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSchool, setSelectedSchool] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState<'head_teacher' | 'teacher'>('teacher');

  const { data: schools = [], isLoading } = useQuery<SchoolData[]>({
    queryKey: ['/api/admin/schools'],
  });

  const assignTeacherMutation = useMutation({
    mutationFn: async ({ schoolId, userEmail, role }: { schoolId: string; userEmail: string; role: string }) => {
      await apiRequest('POST', `/api/admin/schools/${schoolId}/assign-teacher`, {
        userEmail,
        role,
      });
    },
    onSuccess: () => {
      toast({
        title: "Teacher Assigned",
        description: "Teacher has been successfully assigned to the school.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/school-teachers'] });
      setSelectedSchool('');
      setUserEmail('');
      setRole('teacher');
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign teacher. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool || !userEmail) {
      toast({
        title: "Missing Information",
        description: "Please select a school and enter a user email.",
        variant: "destructive",
      });
      return;
    }
    assignTeacherMutation.mutate({ schoolId: selectedSchool, userEmail, role });
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading schools..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School *
          </label>
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger data-testid="select-school">
              <SelectValue placeholder="Select school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Email *
          </label>
          <Input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="teacher@example.com"
            data-testid="input-user-email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role *
          </label>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="head_teacher"
                checked={role === 'head_teacher'}
                onChange={(e) => setRole(e.target.value as 'head_teacher' | 'teacher')}
                className="text-pcs_blue"
                data-testid="radio-head-teacher"
              />
              <span className="text-sm">Head Teacher</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="teacher"
                checked={role === 'teacher'}
                onChange={(e) => setRole(e.target.value as 'head_teacher' | 'teacher')}
                className="text-pcs_blue"
                data-testid="radio-teacher"
              />
              <span className="text-sm">Teacher</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={assignTeacherMutation.isPending || !selectedSchool || !userEmail}
          className="bg-pcs_blue hover:bg-blue-600"
          data-testid="button-assign-teacher"
        >
          {assignTeacherMutation.isPending ? 'Assigning...' : 'Assign Teacher'}
        </Button>
      </div>
    </form>
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

function UserManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-schools' | 'without-schools'>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  const { data: usersWithSchools = [], isLoading } = useQuery<UserWithSchools[]>({
    queryKey: ['/api/admin/users'],
  });

  const filteredUsers = usersWithSchools.filter((item) => {
    const user = item.user;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());

    if (filterStatus === 'with-schools') {
      return matchesSearch && item.schools.length > 0;
    } else if (filterStatus === 'without-schools') {
      return matchesSearch && item.schools.length === 0;
    }
    return matchesSearch;
  });

  const handleAssignToSchool = (userEmail: string) => {
    setSelectedUserEmail(userEmail);
    setAssignDialogOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                data-testid="input-user-search"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-all"
              >
                All Users
              </Button>
              <Button
                variant={filterStatus === 'with-schools' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('with-schools')}
                className={filterStatus === 'with-schools' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-with-schools"
              >
                With Schools
              </Button>
              <Button
                variant={filterStatus === 'without-schools' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('without-schools')}
                className={filterStatus === 'without-schools' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-without-schools"
              >
                Without Schools
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing <strong>{filteredUsers.length}</strong> of <strong>{usersWithSchools.length}</strong> users
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Users Found"
              description={
                searchQuery
                  ? "No users match your search criteria."
                  : filterStatus === 'without-schools'
                  ? "All users are assigned to at least one school."
                  : "No users found in the system."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">School Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const user = item.user;
                    const schoolCount = item.schools.length;
                    return (
                      <tr 
                        key={user.id} 
                        className="border-b border-gray-200 hover:bg-gray-50"
                        data-testid={`user-row-${user.id}`}
                      >
                        <td className="p-3 text-sm" data-testid={`text-user-name-${user.id}`}>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.isAdmin && (
                            <Badge className="mt-1 bg-purple-500 text-white text-xs">Admin</Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600" data-testid={`text-user-email-${user.id}`}>
                          {user.email}
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline" data-testid={`text-user-role-${user.id}`}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm" data-testid={`text-user-school-status-${user.id}`}>
                          {schoolCount === 0 ? (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              No School
                            </Badge>
                          ) : schoolCount === 1 ? (
                            <Badge className="bg-green-500 text-white">
                              1 School
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500 text-white">
                              {schoolCount} Schools
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex gap-2">
                            {schoolCount === 0 ? (
                              <Button
                                size="sm"
                                onClick={() => handleAssignToSchool(user.email || '')}
                                className="bg-pcs_blue hover:bg-pcs_blue/90"
                                data-testid={`button-assign-to-school-${user.id}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Assign to School
                              </Button>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-view-schools-${user.id}`}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Schools
                                  </Button>
                                </DialogTrigger>
                                <DialogContent data-testid={`dialog-user-schools-${user.id}`}>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Schools for {user.firstName} {user.lastName}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3">
                                    {item.schools.map((school) => (
                                      <div 
                                        key={school.id} 
                                        className="p-3 border rounded-lg flex items-center justify-between"
                                        data-testid={`school-item-${school.id}`}
                                      >
                                        <div>
                                          <div className="font-medium">{school.name}</div>
                                          <div className="text-sm text-gray-600">
                                            Role: {school.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                                          </div>
                                        </div>
                                        <School className="h-5 w-5 text-gray-400" />
                                      </div>
                                    ))}
                                    <Button
                                      onClick={() => handleAssignToSchool(user.email || '')}
                                      variant="outline"
                                      className="w-full mt-2"
                                      data-testid={`button-assign-another-school-${user.id}`}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Assign to Another School
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-assign-teacher">
            <DialogHeader>
              <DialogTitle>Assign User to School</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <AssignTeacherForm />
              {selectedUserEmail && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Pre-filled email:</strong> {selectedUserEmail}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Enter this email in the form above to assign this user to a school.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ResourcesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceFilters, setResourceFilters] = useState({
    search: '',
    stage: 'all',
    country: 'all',
    language: 'all',
    isActive: 'all',
  });

  // Fetch resources with filters
  const { data: resources = [], isLoading, refetch } = useQuery<Resource[]>({
    queryKey: ['/api/resources', resourceFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...resourceFilters,
        limit: '100',
        offset: '0',
      });
      // Remove empty values and 'all' values (which mean no filter)
      Object.keys(resourceFilters).forEach(key => {
        const value = resourceFilters[key as keyof typeof resourceFilters];
        if (!value || value === 'all') {
          params.delete(key);
        }
      });
      
      const response = await fetch(`/api/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete resource');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource Deleted",
        description: "The resource has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setResourceFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading resources..." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Resource Management
            </CardTitle>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-add-resource"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resources..."
                value={resourceFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
                data-testid="input-search-resources"
              />
            </div>
            <Select 
              value={resourceFilters.stage} 
              onValueChange={(value) => handleFilterChange('stage', value)}
            >
              <SelectTrigger data-testid="select-stage-filter">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="inspire">Inspire</SelectItem>
                <SelectItem value="investigate">Investigate</SelectItem>
                <SelectItem value="act">Act</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.country} 
              onValueChange={(value) => handleFilterChange('country', value)}
            >
              <SelectTrigger data-testid="select-country-filter">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countryOptions.map((country) => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.language} 
              onValueChange={(value) => handleFilterChange('language', value)}
            >
              <SelectTrigger data-testid="select-language-filter">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="German">German</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.isActive} 
              onValueChange={(value) => handleFilterChange('isActive', value)}
            >
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resources Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-700">Title</th>
                  <th className="text-left p-3 font-medium text-gray-700">Stage</th>
                  <th className="text-left p-3 font-medium text-gray-700">Country</th>
                  <th className="text-left p-3 font-medium text-gray-700">Language</th>
                  <th className="text-left p-3 font-medium text-gray-700">File Size</th>
                  <th className="text-left p-3 font-medium text-gray-700">Downloads</th>
                  <th className="text-left p-3 font-medium text-gray-700">Status</th>
                  <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-navy">{resource.title}</div>
                      {resource.description && (
                        <div className="text-sm text-gray-600 truncate max-w-xs">
                          {resource.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge className={getStageColor(resource.stage)}>
                        {resource.stage}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-600">{resource.country || 'Global'}</td>
                    <td className="p-3 text-gray-600">{resource.language || 'English'}</td>
                    <td className="p-3 text-gray-600">{formatFileSize(resource.fileSize) || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{resource.downloadCount || 0}</td>
                    <td className="p-3">
                      <Badge variant={resource.isActive ? 'default' : 'secondary'}>
                        {resource.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingResource(resource)}
                          data-testid={`button-edit-${resource.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this resource?')) {
                              deleteResourceMutation.mutate(resource.id);
                            }
                          }}
                          data-testid={`button-delete-${resource.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {resources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No resources found. Add your first resource to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Resource Form */}
      {showAddForm && (
        <ResourceForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            refetch();
          }}
        />
      )}

      {/* Edit Resource Form */}
      {editingResource && (
        <ResourceForm
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSuccess={() => {
            setEditingResource(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function ResourceForm({ resource, onClose, onSuccess }: {
  resource?: Resource;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { data: countryOptions = [] } = useCountries();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    description: resource?.description || '',
    stage: resource?.stage || 'inspire',
    ageRange: resource?.ageRange || '',
    language: resource?.language || 'English',
    country: resource?.country || 'global',
    fileUrl: resource?.fileUrl || '',
    fileType: resource?.fileType || '',
    fileSize: resource?.fileSize || 0,
    isActive: resource?.isActive ?? true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For demo purposes, we'll create a mock file URL
    // In a real implementation, you'd upload to object storage
    const mockFileUrl = `https://storage.example.com/resources/${file.name}`;
    
    setFormData(prev => ({
      ...prev,
      fileUrl: mockFileUrl,
      fileType: file.type,
      fileSize: file.size,
    }));

    toast({
      title: "File Selected",
      description: `${file.name} has been selected for upload.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const endpoint = resource ? `/api/resources/${resource.id}` : '/api/resources';
      const method = resource ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        country: formData.country === 'global' ? null : formData.country,
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('Failed to save resource');
      }

      toast({
        title: resource ? "Resource Updated" : "Resource Created",
        description: `The resource has been successfully ${resource ? 'updated' : 'created'}.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save resource. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy">
              {resource ? 'Edit Resource' : 'Add New Resource'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-resource-form"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter resource title"
                required
                data-testid="input-resource-title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter resource description"
                rows={3}
                data-testid="textarea-resource-description"
              />
            </div>

            {/* Stage and Age Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program Stage *
                </label>
                <Select 
                  value={formData.stage} 
                  onValueChange={(value) => handleInputChange('stage', value)}
                >
                  <SelectTrigger data-testid="select-resource-stage">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Range
                </label>
                <Input
                  value={formData.ageRange}
                  onChange={(e) => handleInputChange('ageRange', e.target.value)}
                  placeholder="e.g., 8-12 years"
                  data-testid="input-resource-age-range"
                />
              </div>
            </div>

            {/* Language and Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <Select 
                  value={formData.language} 
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger data-testid="select-resource-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Country
                </label>
                <Select 
                  value={formData.country} 
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger data-testid="select-resource-country">
                    <SelectValue placeholder="Global (all countries)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (all countries)</SelectItem>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {formData.fileUrl ? (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      File selected: {formData.fileUrl.split('/').pop()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(formData.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('fileUrl', '')}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      Upload a resource file (PDF, DOC, etc.)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      data-testid="input-resource-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300"
                data-testid="checkbox-resource-active"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (visible to users)
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-resource"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="flex-1 bg-pcs_blue hover:bg-blue-600"
                data-testid="button-save-resource"
              >
                {isSubmitting ? 'Saving...' : (resource ? 'Update Resource' : 'Create Resource')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AnalyticsContent() {
  // Analytics queries - all enabled
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview']
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress']
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence']
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement']
  });

  const exportAnalytics = async (format: 'csv' | 'excel') => {
    try {
      const response = await fetch(`/api/admin/export/analytics?format=${format}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Comprehensive insights and metrics for Plastic Clever Schools</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportAnalytics('csv')}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportAnalytics('excel')}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {overviewQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <School className="h-4 w-4 text-pcs_blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-schools">
                {overviewQuery.data.totalSchools.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Registered institutions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-pcs_teal" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-users">
                {overviewQuery.data.totalUsers.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Teachers and administrators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evidence Submissions</CardTitle>
              <FileText className="h-4 w-4 text-pcs_yellow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-evidence">
                {overviewQuery.data.totalEvidence.toLocaleString()}
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <span>{overviewQuery.data.pendingEvidence} pending review</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Reach</CardTitle>
              <Globe className="h-4 w-4 text-pcs_coral" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-countries-reached">
                {overviewQuery.data.countriesReached.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">Countries with participating schools</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Metrics Summary */}
      {overviewQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600 font-medium">Total Schools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pcs_blue">{overviewQuery.data.totalSchools}</div>
              <p className="text-xs text-gray-500 mt-1">Participating schools</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600 font-medium">Total Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal">{overviewQuery.data.totalEvidence}</div>
              <p className="text-xs text-gray-500 mt-1">Submissions received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600 font-medium">Awards Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-coral">{overviewQuery.data.completedAwards}</div>
              <p className="text-xs text-gray-500 mt-1">Schools with awards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600 font-medium">Students Impacted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pcs_blue">{overviewQuery.data.studentsImpacted.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">Lives changed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* School Analytics */}
      {schoolProgressQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schools by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-pcs_blue" />
                Schools by Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={schoolProgressQuery.data.stageDistribution}
                    dataKey="count"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.stage}: ${entry.count}`}
                  >
                    {schoolProgressQuery.data.stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly School Registrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-pcs_teal" />
                Monthly School Registrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={schoolProgressQuery.data.monthlyRegistrations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#019ADE" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Progress Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>School Progress Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={schoolProgressQuery.data.progressRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#019ADE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Registrations - Alternative View */}
          <Card>
            <CardHeader>
              <CardTitle>Completion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={schoolProgressQuery.data.completionRates}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#02BBB4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evidence Analytics */}
      {evidenceQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evidence by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-pcs_blue" />
                Evidence by Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={evidenceQuery.data.stageBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" fill="#10B981" name="Approved" />
                  <Bar dataKey="pending" fill="#FFC557" name="Pending" />
                  <Bar dataKey="rejected" fill="#FF595A" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Review Turnaround Time */}
          <Card>
            <CardHeader>
              <CardTitle>Review Turnaround Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={evidenceQuery.data.reviewTurnaround}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {evidenceQuery.data.reviewTurnaround.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Submission Trends */}
          {evidenceQuery.data.submissionTrends && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Evidence Submission Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={evidenceQuery.data.submissionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="submissions" stroke="#0B3D5D" strokeWidth={2} name="Submissions" />
                    <Line type="monotone" dataKey="approvals" stroke="#10B981" strokeWidth={2} name="Approvals" />
                    <Line type="monotone" dataKey="rejections" stroke="#FF595A" strokeWidth={2} name="Rejections" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* User Engagement Analytics */}
      {userEngagementQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-coral" />
                User Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={userEngagementQuery.data.roleDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {userEngagementQuery.data.roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Active Users by Period */}
          <Card>
            <CardHeader>
              <CardTitle>Active Users by Period</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={userEngagementQuery.data.activeUsers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="active" fill="#0B3D5D" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Registration Trends */}
          {userEngagementQuery.data.registrationTrends && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>User Registration Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={userEngagementQuery.data.registrationTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="teachers" stroke="#019ADE" strokeWidth={2} name="Teachers" />
                    <Line type="monotone" dataKey="admins" stroke="#FF595A" strokeWidth={2} name="Admins" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Performing Schools Table */}
      {evidenceQuery.data && evidenceQuery.data.topSubmitters && evidenceQuery.data.topSubmitters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-gold" />
              Top Performing Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">School Name</th>
                    <th className="text-center py-3 px-4">Submissions</th>
                    <th className="text-center py-3 px-4">Approval Rate</th>
                    <th className="text-center py-3 px-4">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceQuery.data.topSubmitters.slice(0, 5).map((school: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{school.schoolName}</td>
                      <td className="text-center py-3 px-4">{school.submissions}</td>
                      <td className="text-center py-3 px-4">{school.approvalRate}%</td>
                      <td className="text-center py-3 px-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-pcs_blue h-2 rounded-full" 
                            style={{ width: `${school.approvalRate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmailManagementSection({ 
  emailForm, 
  setEmailForm, 
  handleSendBulkEmail,
  schoolFilters 
}: { 
  emailForm: any;
  setEmailForm: any;
  handleSendBulkEmail: () => Promise<void>;
  schoolFilters: any;
}) {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [schoolName, setSchoolName] = useState('Test School');
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: testEmail,
          schoolName: schoolName,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastResult({ success: true, message: `Test email sent successfully to ${testEmail}` });
        toast({
          title: "Test Email Sent",
          description: `Welcome email sent to ${testEmail}`,
        });
      } else {
        setLastResult({ success: false, message: result.message || result.error || 'Failed to send email' });
        toast({
          title: "Failed to Send Test Email",
          description: result.message || result.error || 'An error occurred while sending the test email.',
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastResult({ success: false, message: errorMsg });
      toast({
        title: "Error",
        description: "Failed to send test email. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Welcome Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">SendGrid Template Configuration</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>📧 <strong>Template ID:</strong> 67435cbdbfbf42d5b3b3167a7efa2e1c</p>
              <p className="mt-2"><strong>Common Setup Issues:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>API key needs "Mail Send" permissions in SendGrid</li>
                <li>Sender email (FROM_EMAIL) must be verified in SendGrid</li>
                <li>Template must be published/active in SendGrid</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Email Address
            </label>
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              data-testid="input-test-email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              School Name (template variable)
            </label>
            <Input
              type="text"
              placeholder="Test School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              data-testid="input-school-name"
            />
          </div>

          <Button
            onClick={handleSendTestEmail}
            disabled={isSending || !testEmail}
            className="w-full"
            data-testid="button-send-test-email"
          >
            {isSending ? (
              <>
                <LoadingSpinner className="mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>

          {lastResult && (
            <div className={`p-4 rounded-lg ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium ${lastResult.success ? 'text-green-900' : 'text-red-900'}`}>
                {lastResult.success ? '✅ Success' : '❌ Error'}
              </p>
              <p className={`text-sm mt-1 ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {lastResult.message}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Bulk Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <Select 
              value={emailForm.recipientType} 
              onValueChange={(value) => setEmailForm((prev: any) => ({ ...prev, recipientType: value }))}
            >
              <SelectTrigger data-testid="select-recipient-type">
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_teachers">All Teachers</SelectItem>
                <SelectItem value="schools">Schools (with current filters)</SelectItem>
                <SelectItem value="custom">Custom List</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Email Template</label>
            <Select 
              value={emailForm.template} 
              onValueChange={(value) => setEmailForm((prev: any) => ({ ...prev, template: value }))}
            >
              <SelectTrigger data-testid="select-email-template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="invitation">Invitation</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {emailForm.recipientType === 'custom' && (
            <div>
              <label className="block text-sm font-medium mb-2">Email Addresses</label>
              <Textarea
                placeholder="Enter email addresses (one per line or comma separated)"
                value={emailForm.recipients}
                onChange={(e) => setEmailForm((prev: any) => ({ ...prev, recipients: e.target.value }))}
                rows={4}
                data-testid="textarea-custom-recipients"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <Input
              placeholder="Email subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm((prev: any) => ({ ...prev, subject: e.target.value }))}
              data-testid="input-email-subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <Textarea
              placeholder="Email content"
              value={emailForm.content}
              onChange={(e) => setEmailForm((prev: any) => ({ ...prev, content: e.target.value }))}
              rows={6}
              data-testid="textarea-email-content"
            />
          </div>

          <Button
            onClick={handleSendBulkEmail}
            disabled={!emailForm.subject || !emailForm.content || 
              (emailForm.recipientType === 'custom' && !emailForm.recipients.trim())}
            className="w-full bg-coral hover:bg-coral/90"
            data-testid="button-send-bulk-email"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Bulk Email
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'schools' | 'teams' | 'resources' | 'case-studies' | 'users' | 'email-test'>('overview');
  const [schoolFilters, setSchoolFilters] = useState({
    search: '',
    country: '',
    stage: '',
  });
  const [caseStudyFilters, setCaseStudyFilters] = useState({
    search: '',
    country: '',
    stage: '',
    featured: '',
  });
  const [createCaseStudyData, setCreateCaseStudyData] = useState<{
    evidenceId: string;
    title: string;
    description: string;
    impact: string;
    imageUrl: string;
    featured: boolean;
  } | null>(null);
  const [reviewData, setReviewData] = useState<{
    evidenceId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientType: 'all_teachers',
    subject: '',
    content: '',
    template: 'announcement',
    recipients: ''
  });
  
  // Bulk operations state
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [viewingSchool, setViewingSchool] = useState<SchoolData | null>(null);
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

  // Pending evidence query
  const { data: pendingEvidence, error: evidenceError } = useQuery<PendingEvidence[]>({
    queryKey: ['/api/admin/evidence/pending'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'evidence'),
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
    queryKey: ['/api/admin/case-studies', cleanFilters(caseStudyFilters)],
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence/pending'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence/pending'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence/pending'] });
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

  // Case study mutations
  const createCaseStudyFromEvidenceMutation = useMutation({
    mutationFn: async (data: {
      evidenceId: string;
      title: string;
      description: string;
      impact: string;
      imageUrl: string;
      featured: boolean;
    }) => {
      await apiRequest('POST', '/api/admin/case-studies/from-evidence', data);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Created",
        description: "Case study has been successfully created from evidence.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setCreateCaseStudyData(null);
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create case study. Please try again.",
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send emails');
      }

      const result = await response.json();
      
      setEmailDialogOpen(false);
      setEmailForm({
        recipientType: 'all_teachers',
        subject: '',
        content: '',
        template: 'announcement',
        recipients: ''
      });
      
      toast({
        title: "Emails Sent Successfully",
        description: `${result.results.sent} emails sent successfully${result.results.failed > 0 ? `, ${result.results.failed} failed` : ''}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Emails",
        description: "There was an error sending the bulk emails. Please try again.",
        variant: "destructive",
      });
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

  if (!isAuthenticated || !(user?.role === 'admin' || user?.isAdmin)) {
    return null; // Will redirect in useEffect
  }

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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-overview"
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'evidence' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('evidence')}
            data-testid="tab-evidence"
          >
            Evidence Review
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'schools' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('schools')}
            data-testid="tab-schools"
          >
            Schools
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'teams' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('teams')}
            data-testid="tab-teams"
          >
            Teams
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'resources' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('resources')}
            data-testid="tab-resources"
          >
            Resources
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'case-studies' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('case-studies')}
            data-testid="tab-case-studies"
          >
            Case Studies
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('users')}
            data-testid="tab-users"
          >
            User Management
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'email-test' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('email-test')}
            data-testid="tab-email-test"
          >
            Email Management
          </button>
        </div>

        {/* Overview Tab (Analytics Content) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AnalyticsContent />
          </div>
        )}

        {/* Evidence Review Tab */}
        {activeTab === 'evidence' && (
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
                          </div>
                          <p className="text-gray-600 mb-3">{evidence.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>School ID: {evidence.schoolId}</span>
                            <span>Submitted: {new Date(evidence.submittedAt).toLocaleDateString()}</span>
                            <span>Files: {evidence.files?.length || 0}</span>
                          </div>
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
                    onClick={() => setCreateCaseStudyData({
                      evidenceId: '',
                      title: '',
                      description: '',
                      impact: '',
                      imageUrl: '',
                      featured: false
                    })}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-create-case-study"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create from Evidence
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
                            <Button
                              size="sm"
                              variant={caseStudy.featured ? "default" : "outline"}
                              onClick={() => updateCaseStudyFeaturedMutation.mutate({
                                id: caseStudy.id,
                                featured: !caseStudy.featured
                              })}
                              disabled={updateCaseStudyFeaturedMutation.isPending}
                              data-testid={`button-toggle-featured-${caseStudy.id}`}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              {caseStudy.featured ? 'Unfeature' : 'Feature'}
                            </Button>
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

      {/* Create Case Study Dialog */}
      {createCaseStudyData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-navy mb-4">
              Create Case Study from Evidence
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence ID <span className="text-red-500">*</span>
                </label>
                <Input
                  value={createCaseStudyData.evidenceId}
                  onChange={(e) => setCreateCaseStudyData(prev => prev ? { ...prev, evidenceId: e.target.value } : null)}
                  placeholder="Enter evidence ID..."
                  data-testid="input-evidence-id"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Study Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={createCaseStudyData.title}
                  onChange={(e) => setCreateCaseStudyData(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter compelling case study title..."
                  data-testid="input-case-study-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={createCaseStudyData.description}
                  onChange={(e) => setCreateCaseStudyData(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Describe the case study (will use evidence description if left empty)..."
                  rows={3}
                  data-testid="textarea-case-study-description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impact Statement
                </label>
                <Textarea
                  value={createCaseStudyData.impact}
                  onChange={(e) => setCreateCaseStudyData(prev => prev ? { ...prev, impact: e.target.value } : null)}
                  placeholder="Describe the impact and outcomes achieved..."
                  rows={3}
                  data-testid="textarea-case-study-impact"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Case Study Image
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Upload Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('directory', 'public');
                          
                          try {
                            const response = await fetch('/api/object-storage/upload', {
                              method: 'POST',
                              body: formData,
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              setCreateCaseStudyData(prev => prev ? { ...prev, imageUrl: data.url } : null);
                              toast({
                                title: "Image Uploaded",
                                description: "Image uploaded successfully!",
                              });
                            } else {
                              throw new Error('Upload failed');
                            }
                          } catch (error) {
                            toast({
                              title: "Upload Error",
                              description: "Failed to upload image. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pcs_blue file:text-white hover:file:bg-pcs_blue/90"
                      data-testid="input-case-study-image-upload"
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or enter URL</span>
                    </div>
                  </div>
                  <Input
                    value={createCaseStudyData.imageUrl}
                    onChange={(e) => setCreateCaseStudyData(prev => prev ? { ...prev, imageUrl: e.target.value } : null)}
                    placeholder="Enter image URL..."
                    data-testid="input-case-study-image-url"
                  />
                  {createCaseStudyData.imageUrl && (
                    <div className="mt-2">
                      <img 
                        src={createCaseStudyData.imageUrl} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-md border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={createCaseStudyData.featured}
                  onChange={(e) => setCreateCaseStudyData(prev => prev ? { ...prev, featured: e.target.checked } : null)}
                  data-testid="checkbox-case-study-featured"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Mark as featured for Global Movement section
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreateCaseStudyData(null)}
                  className="flex-1"
                  data-testid="button-cancel-case-study"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-pcs_blue hover:bg-pcs_blue/90"
                  onClick={() => {
                    if (!createCaseStudyData.evidenceId.trim() || !createCaseStudyData.title.trim()) {
                      toast({
                        title: "Required Fields Missing",
                        description: "Please provide evidence ID and title.",
                        variant: "destructive",
                      });
                      return;
                    }
                    createCaseStudyFromEvidenceMutation.mutate(createCaseStudyData);
                  }}
                  disabled={createCaseStudyFromEvidenceMutation.isPending}
                  data-testid="button-create-case-study-confirm"
                >
                  {createCaseStudyFromEvidenceMutation.isPending ? 'Creating...' : 'Create Case Study'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Detail Dialog */}
      {viewingSchool && (
        <Dialog open={!!viewingSchool} onOpenChange={() => setViewingSchool(null)}>
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

              <div className="flex justify-end gap-2 pt-4">
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
    </div>
  );
}
