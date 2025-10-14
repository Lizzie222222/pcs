import { useState, useEffect, useRef } from "react";
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

import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import type { ReductionPromise, Event, EventRegistration, EvidenceWithSchool } from "@shared/schema";
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

interface AuditOverviewAnalytics {
  totalSchoolsAudited: number;
  totalPlasticItems: number;
  averageItemsPerSchool: number;
  topProblemPlastics: Array<{ name: string; count: number }>;
}

interface AuditBySchoolAnalytics {
  schoolId: string;
  schoolName: string;
  country: string;
  totalPlasticItems: number;
  topProblemPlastic: string | null;
  auditDate: string;
  hasRecycling: boolean;
  hasComposting: boolean;
  hasPolicy: boolean;
}

interface WasteTrendsAnalytics {
  monthlySubmissions: Array<{ month: string; count: number }>;
  plasticItemsTrend: Array<{ month: string; totalItems: number }>;
  wasteReductionSchools: Array<{ month: string; count: number }>;
}

interface AdminPromiseMetrics {
  totalPromises: number;
  totalSchoolsWithPromises: number;
  totalAnnualReduction: number;
  totalAnnualWeightKg: number;
  funMetrics: {
    oceanPlasticBottles: number;
    fishSaved: number;
    seaTurtles: number;
  };
  seriousMetrics: {
    co2Prevented: number;
    oilSaved: number;
    tons: number;
  };
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

interface PrintableFormSubmissionWithDetails {
  id: string;
  schoolId: string;
  submittedBy: string;
  formType: 'audit' | 'action_plan';
  filePath: string;
  originalFilename: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState<'head_teacher' | 'teacher'>('teacher');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: schools = [], isLoading: schoolsLoading } = useQuery<SchoolData[]>({
    queryKey: ['/api/admin/schools'],
  });

  const { data: usersWithSchools = [], isLoading: usersLoading } = useQuery<UserWithSchools[]>({
    queryKey: ['/api/admin/users'],
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
      setSelectedUserId('');
      setRole('teacher');
      setSearchQuery('');
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
    const selectedUser = usersWithSchools.find(u => u.user.id === selectedUserId);
    const userEmail = selectedUser?.user.email;
    
    if (!selectedSchool || !userEmail) {
      toast({
        title: "Missing Information",
        description: "Please select a school and a user.",
        variant: "destructive",
      });
      return;
    }
    assignTeacherMutation.mutate({ schoolId: selectedSchool, userEmail, role });
  };

  const filteredUsers = usersWithSchools.filter(item => {
    const fullName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.toLowerCase();
    const email = item.user.email?.toLowerCase() || '';
    return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  if (schoolsLoading || usersLoading) {
    return <LoadingSpinner message="Loading data..." />;
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
            User *
          </label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger data-testid="select-user">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                  data-testid="input-search-users"
                />
              </div>
              {filteredUsers.length === 0 ? (
                <div className="px-2 py-4 text-sm text-gray-500 text-center">No users found</div>
              ) : (
                filteredUsers.map((item) => (
                  <SelectItem key={item.user.id} value={item.user.id}>
                    {item.user.firstName} {item.user.lastName} ({item.user.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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
          disabled={assignTeacherMutation.isPending || !selectedSchool || !selectedUserId}
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-schools' | 'without-schools'>('all');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [inviteAdminDialogOpen, setInviteAdminDialogOpen] = useState(false);
  const [inviteAdminEmail, setInviteAdminEmail] = useState('');
  const [invitePartnerDialogOpen, setInvitePartnerDialogOpen] = useState(false);
  const [invitePartnerEmail, setInvitePartnerEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<{ id: string; name: string; isAdmin: boolean; role: string } | null>(null);

  const isPartner = user?.role === 'partner';

  const { data: usersWithSchools = [], isLoading } = useQuery<UserWithSchools[]>({
    queryKey: ['/api/admin/users'],
  });

  const inviteAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/admin/invite-admin', { email });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Admin invitation has been sent successfully.",
      });
      setInviteAdminDialogOpen(false);
      setInviteAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send admin invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const invitePartnerMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/admin/invite-partner', { email });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Partner invitation has been sent successfully.",
      });
      setInvitePartnerDialogOpen(false);
      setInvitePartnerEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send partner invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: { isAdmin?: boolean; role?: string } }) => {
      await apiRequest('PATCH', `/api/admin/users/${userId}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "User role has been successfully updated.",
      });
      setRoleDialogOpen(false);
      setSelectedUserForRole(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
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

  const handleInviteAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteAdminEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    inviteAdminMutation.mutate(inviteAdminEmail);
  };

  const handleInvitePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePartnerEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    invitePartnerMutation.mutate(invitePartnerEmail);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <div className="flex gap-2">
            {!isPartner && (
              <>
                <Dialog open={invitePartnerDialogOpen} onOpenChange={setInvitePartnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-invite-partner">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Partner
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-invite-partner">
                    <DialogHeader>
                      <DialogTitle>Invite New Partner</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInvitePartner} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={invitePartnerEmail}
                          onChange={(e) => setInvitePartnerEmail(e.target.value)}
                          placeholder="partner@example.com"
                          data-testid="input-partner-email"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Partners have admin-like access but cannot assign roles or download school data.
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setInvitePartnerDialogOpen(false);
                            setInvitePartnerEmail('');
                          }}
                          data-testid="button-cancel-partner-invite"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={invitePartnerMutation.isPending}
                          className="bg-blue-500 hover:bg-blue-600"
                          data-testid="button-send-partner-invite"
                        >
                          {invitePartnerMutation.isPending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={inviteAdminDialogOpen} onOpenChange={setInviteAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-pcs_blue hover:bg-pcs_blue/90" data-testid="button-invite-admin">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Admin
                    </Button>
                  </DialogTrigger>
            <DialogContent data-testid="dialog-invite-admin">
              <DialogHeader>
                <DialogTitle>Invite New Administrator</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={inviteAdminEmail}
                    onChange={(e) => setInviteAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    data-testid="input-admin-email"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInviteAdminDialogOpen(false);
                      setInviteAdminEmail('');
                    }}
                    data-testid="button-cancel-invite"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteAdminMutation.isPending}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-send-admin-invite"
                  >
                    {inviteAdminMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
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
                          {user.isAdmin && user.role === 'admin' && (
                            <Badge className="mt-1 bg-purple-500 text-white text-xs">Admin</Badge>
                          )}
                          {user.role === 'partner' && (
                            <Badge className="mt-1 bg-blue-500 text-white text-xs">Partner</Badge>
                          )}
                          {user.role === 'school' && (
                            <Badge className="mt-1 bg-green-500 text-white text-xs">School</Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600" data-testid={`text-user-email-${user.id}`}>
                          {user.email}
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline" data-testid={`text-user-role-${user.id}`}>
                            {user.role === 'admin' && user.isAdmin ? 'Admin' : 
                             user.role === 'partner' ? 'Partner' : 
                             user.role === 'school' ? 'School' :
                             user.role === 'teacher' ? 'Teacher' : user.role}
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`button-user-actions-${user.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAssignToSchool(user.email || '')}
                                  data-testid={`menu-assign-school-${user.id}`}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  {schoolCount === 0 ? 'Assign to School' : 'Assign to Another School'}
                                </DropdownMenuItem>
                                {schoolCount > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        data-testid={`menu-view-schools-${user.id}`}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Schools
                                      </DropdownMenuItem>
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
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                {!isPartner && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUserForRole({
                                        id: user.id,
                                        name: `${user.firstName} ${user.lastName}`,
                                        isAdmin: user.isAdmin,
                                        role: user.role,
                                      });
                                      setRoleDialogOpen(true);
                                    }}
                                    data-testid={`menu-change-role-${user.id}`}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUserToDelete({
                                      id: user.id,
                                      name: `${user.firstName} ${user.lastName}`,
                                    });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                  data-testid={`menu-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-user">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedUserToDelete?.name}</strong>? 
                This action cannot be undone and will remove all user data including school associations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedUserToDelete) {
                    deleteUserMutation.mutate(selectedUserToDelete.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent data-testid="dialog-change-role">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Update the role and permissions for <strong>{selectedUserForRole?.name}</strong>
              </p>
              
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <label className="block text-sm font-medium mb-2">Platform Role</label>
                  <p className="text-xs text-gray-500 mb-3">Select the user's role and permissions</p>
                  <Select
                    value={
                      selectedUserForRole?.isAdmin && selectedUserForRole?.role === 'admin' 
                        ? 'admin' 
                        : selectedUserForRole?.role === 'partner' 
                          ? 'partner'
                          : selectedUserForRole?.role === 'school'
                            ? 'school'
                            : 'teacher'
                    }
                    onValueChange={(value) => {
                      if (selectedUserForRole) {
                        if (value === 'admin') {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'admin', isAdmin: true }
                          });
                        } else if (value === 'partner') {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'partner', isAdmin: false }
                          });
                        } else if (value === 'school') {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'school', isAdmin: false }
                          });
                        } else {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'teacher', isAdmin: false }
                          });
                        }
                      }
                    }}
                    disabled={updateUserRoleMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="school">School (Head Teacher)</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    {selectedUserForRole?.isAdmin && selectedUserForRole?.role === 'admin' ? (
                      <p className="text-gray-600"><strong>Admin:</strong> Full platform access including role assignment and data downloads</p>
                    ) : selectedUserForRole?.role === 'partner' ? (
                      <p className="text-gray-600"><strong>Partner:</strong> Admin-like access but cannot assign roles or download school data</p>
                    ) : selectedUserForRole?.role === 'school' ? (
                      <p className="text-gray-600"><strong>School:</strong> Head teacher role with school management permissions</p>
                    ) : (
                      <p className="text-gray-600"><strong>Teacher:</strong> Standard user with school-level permissions</p>
                    )}
                  </div>
                </div>
              </div>
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
  const { toast } = useToast();
  
  // Date range state - default to Last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }));

  // Analytics queries - all enabled
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const auditOverviewQuery = useQuery<AuditOverviewAnalytics>({
    queryKey: ['/api/admin/analytics/audit-overview']
  });

  const auditBySchoolQuery = useQuery<AuditBySchoolAnalytics[]>({
    queryKey: ['/api/admin/analytics/audit-by-school']
  });

  const wasteTrendsQuery = useQuery<WasteTrendsAnalytics>({
    queryKey: ['/api/admin/analytics/waste-trends']
  });

  const adminPromiseMetricsQuery = useQuery<AdminPromiseMetrics>({
    queryKey: ['/api/admin/reduction-promises/metrics']
  });

  const [includeAIInsights, setIncludeAIInsights] = useState(true);

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

  const exportPDFMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error('Please select a date range');
      }

      const response = await apiRequest('POST', '/api/admin/analytics/export-pdf', {
        dateRange: {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString()
        },
        includeInsights: includeAIInsights
      });

      const blob = await response.blob();
      return blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report downloaded successfully",
        description: "Your PDF analytics report has been downloaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export PDF report",
        variant: "destructive",
      });
    }
  });

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

      {/* Date Range Picker and PDF Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-ai-insights"
                checked={includeAIInsights}
                onCheckedChange={(checked) => setIncludeAIInsights(checked as boolean)}
                data-testid="checkbox-include-ai-insights"
              />
              <label
                htmlFor="include-ai-insights"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include AI insights
              </label>
            </div>
            
            <Button
              onClick={() => exportPDFMutation.mutate()}
              disabled={exportPDFMutation.isPending || !dateRange?.from || !dateRange?.to}
              data-testid="button-export-pdf"
              className="bg-pcs_blue hover:bg-pcs_navy"
            >
              {exportPDFMutation.isPending ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Generating report...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Nested Tabs for Analytics Sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="analytics-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schools-evidence" data-testid="tab-schools-evidence">
            <School className="w-4 h-4 mr-2" />
            Schools & Evidence
          </TabsTrigger>
          <TabsTrigger value="audits" data-testid="tab-audits">
            <PieChartIcon className="w-4 h-4 mr-2" />
            Plastic Waste Audits
          </TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement">
            <Users className="w-4 h-4 mr-2" />
            User Engagement
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
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
        </TabsContent>

        {/* Schools & Evidence Tab */}
        <TabsContent value="schools-evidence" className="space-y-6" data-testid="content-schools-evidence">
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

              {/* Completion Rates */}
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
                  {evidenceQuery.data.reviewTurnaround.length === 0 ? (
                    <div 
                      className="flex flex-col items-center justify-center h-[250px] text-center"
                      data-testid="review-turnaround-insufficient-data"
                    >
                      <Clock className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Insufficient Data</p>
                      <p className="text-sm text-gray-400 mt-1">
                        At least 5 reviewed evidence items are required to display turnaround metrics
                      </p>
                    </div>
                  ) : (
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
                  )}
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
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6" data-testid="content-engagement">
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
        </TabsContent>

        {/* Plastic Waste Audits Tab */}
        <TabsContent value="audits" className="space-y-6" data-testid="content-audits">
          {/* Audit Analytics Section */}
          {auditOverviewQuery.data && (
            <>
              <div>
                <h3 className="text-xl font-bold text-navy mb-4 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-pcs_teal" />
                  Plastic Waste Audit Analytics
                </h3>
                <p className="text-gray-600 mb-6">Tracking plastic waste reduction across all schools</p>
              </div>

              {/* Audit Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Schools Audited</CardTitle>
                    <School className="h-4 w-4 text-pcs_blue" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-schools-audited">
                      {auditOverviewQuery.data.totalSchoolsAudited.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500">Schools with approved audits</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Plastic Items</CardTitle>
                    <TrendingUp className="h-4 w-4 text-pcs_coral" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-total-plastic">
                      {auditOverviewQuery.data.totalPlasticItems.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500">Across all audited schools</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average per School</CardTitle>
                    <PieChartIcon className="h-4 w-4 text-pcs_yellow" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-average-plastic">
                      {auditOverviewQuery.data.averageItemsPerSchool.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500">Plastic items per school</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Audit Charts and Tables */}
          {(auditBySchoolQuery.data || wasteTrendsQuery.data) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Problem Plastics */}
              {auditOverviewQuery.data?.topProblemPlastics && auditOverviewQuery.data.topProblemPlastics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-pcs_coral" />
                      Top Problem Plastics (All Schools)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={auditOverviewQuery.data.topProblemPlastics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#FF595A" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Waste Management Status */}
              {auditBySchoolQuery.data && auditBySchoolQuery.data.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Waste Management Implementation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        const hasRecycling = auditBySchoolQuery.data.filter(s => s.hasRecycling).length;
                        const hasComposting = auditBySchoolQuery.data.filter(s => s.hasComposting).length;
                        const hasPolicy = auditBySchoolQuery.data.filter(s => s.hasPolicy).length;
                        const total = auditBySchoolQuery.data.length;

                        return (
                          <>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Recycling Programs</span>
                                <span className="text-sm text-gray-600">{hasRecycling} / {total}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${(hasRecycling / total) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Composting Programs</span>
                                <span className="text-sm text-gray-600">{hasComposting} / {total}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${(hasComposting / total) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Waste Policies</span>
                                <span className="text-sm text-gray-600">{hasPolicy} / {total}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-500 h-2 rounded-full" 
                                  style={{ width: `${(hasPolicy / total) * 100}%` }}
                                />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plastic Waste by School (Top 10) */}
              {auditBySchoolQuery.data && auditBySchoolQuery.data.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <School className="w-5 h-5 mr-2 text-pcs_blue" />
                      Plastic Waste by School (Top 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={auditBySchoolQuery.data.slice(0, 10).sort((a, b) => b.totalPlasticItems - a.totalPlasticItems)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="schoolName" angle={-45} textAnchor="end" height={120} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalPlasticItems" fill="#0B3D5D" name="Plastic Items" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Audit Submission Trends */}
              {wasteTrendsQuery.data?.monthlySubmissions && wasteTrendsQuery.data.monthlySubmissions.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Audit Submission Trends (Last 12 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={wasteTrendsQuery.data.monthlySubmissions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#019ADE" strokeWidth={2} name="Submissions" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Plastic Items Trend Over Time */}
              {wasteTrendsQuery.data?.plasticItemsTrend && wasteTrendsQuery.data.plasticItemsTrend.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Total Plastic Items Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={wasteTrendsQuery.data.plasticItemsTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="totalItems" stroke="#FF595A" strokeWidth={2} name="Total Plastic Items" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* School-by-School Breakdown Table */}
          {auditBySchoolQuery.data && auditBySchoolQuery.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-pcs_teal" />
                  School-by-School Audit Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">School Name</th>
                        <th className="text-left py-3 px-4">Country</th>
                        <th className="text-center py-3 px-4">Plastic Items</th>
                        <th className="text-left py-3 px-4">Top Problem</th>
                        <th className="text-center py-3 px-4">Audit Date</th>
                        <th className="text-center py-3 px-4">Waste Management</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditBySchoolQuery.data.map((school, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50" data-testid={`audit-row-${school.schoolId}`}>
                          <td className="py-3 px-4 font-medium">{school.schoolName}</td>
                          <td className="py-3 px-4">{school.country}</td>
                          <td className="text-center py-3 px-4">{school.totalPlasticItems}</td>
                          <td className="py-3 px-4">{school.topProblemPlastic || 'N/A'}</td>
                          <td className="text-center py-3 px-4">{new Date(school.auditDate).toLocaleDateString()}</td>
                          <td className="text-center py-3 px-4">
                            <div className="flex gap-1 justify-center">
                              {school.hasRecycling && (
                                <Badge className="bg-green-500 text-white text-xs">R</Badge>
                              )}
                              {school.hasComposting && (
                                <Badge className="bg-blue-500 text-white text-xs">C</Badge>
                              )}
                              {school.hasPolicy && (
                                <Badge className="bg-purple-500 text-white text-xs">P</Badge>
                              )}
                              {!school.hasRecycling && !school.hasComposting && !school.hasPolicy && (
                                <span className="text-gray-400 text-xs">None</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Waste Management: R = Recycling, C = Composting, P = Policy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reduction Promises Impact Section */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-pcs_teal" />
              <h3 className="text-xl font-bold text-navy">Global Action Plan Impact</h3>
            </div>
            <p className="text-gray-600 mb-6">Track the collective impact of all schools' action plans</p>

            {adminPromiseMetricsQuery.isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pcs_blue mr-3"></div>
                <span className="text-gray-600">Loading reduction metrics...</span>
              </div>
            )}

            {adminPromiseMetricsQuery.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-800 font-medium">Failed to load action plan metrics</p>
                <p className="text-red-600 text-sm mt-1">Please try refreshing the page</p>
              </div>
            )}

            {adminPromiseMetricsQuery.data && (
              <>
                {adminPromiseMetricsQuery.data.totalPromises === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium text-lg">No action plans have been created yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Encourage schools to create their first action plan!</p>
                  </div>
                ) : (
                  <>
                    {/* Overview Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Total Action Items</CardTitle>
                      <Target className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-total-promises">
                        {adminPromiseMetricsQuery.data.totalPromises.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Commitments made</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Schools Participating</CardTitle>
                      <School className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-schools-participating">
                        {adminPromiseMetricsQuery.data.totalSchoolsWithPromises.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Making a difference</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Items Reduced Annually</CardTitle>
                      <TrendingDown className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-items-reduced">
                        {adminPromiseMetricsQuery.data.totalAnnualReduction.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Items per year</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Weight Reduced</CardTitle>
                      <Trophy className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-weight-reduced">
                        {adminPromiseMetricsQuery.data.totalAnnualWeightKg.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">kg per year</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Ocean Impact Row */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-navy mb-3 flex items-center">
                    <Droplets className="w-5 h-5 mr-2 text-pcs_teal" />
                    Ocean Impact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-pcs_teal bg-gradient-to-br from-white to-teal-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Ocean Bottles Prevented</CardTitle>
                        <Droplets className="h-5 w-5 text-pcs_teal" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pcs_teal" data-testid="admin-metric-ocean-bottles">
                          {adminPromiseMetricsQuery.data.funMetrics.oceanPlasticBottles.toFixed(0).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Plastic bottles saved from oceans</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-pcs_teal bg-gradient-to-br from-white to-teal-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Fish Saved</CardTitle>
                        <Fish className="h-5 w-5 text-pcs_teal" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pcs_teal" data-testid="admin-metric-fish-saved">
                          {adminPromiseMetricsQuery.data.funMetrics.fishSaved.toFixed(0).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Potential fish saved from plastic</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-pcs_teal bg-gradient-to-br from-white to-teal-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Sea Turtles Saved</CardTitle>
                        <Heart className="h-5 w-5 text-pcs_teal" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pcs_teal" data-testid="admin-metric-sea-turtles">
                          {adminPromiseMetricsQuery.data.funMetrics.seaTurtles.toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Sea turtle equivalents protected</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                    {/* Environmental Impact Row */}
                    <div>
                      <h4 className="text-lg font-semibold text-navy mb-3 flex items-center">
                        <Leaf className="w-5 h-5 mr-2 text-green-600" />
                        Environmental Impact
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-white to-green-50">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">CO₂ Prevented</CardTitle>
                            <Factory className="h-5 w-5 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600" data-testid="admin-metric-co2-prevented">
                              {adminPromiseMetricsQuery.data.seriousMetrics.co2Prevented.toFixed(2).toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">kg of CO₂ emissions prevented</p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-white to-green-50">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Oil Saved</CardTitle>
                            <Droplets className="h-5 w-5 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600" data-testid="admin-metric-oil-saved">
                              {adminPromiseMetricsQuery.data.seriousMetrics.oilSaved.toFixed(2).toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">liters of oil conserved</p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-white to-green-50">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Waste Prevented</CardTitle>
                            <Trash className="h-5 w-5 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600" data-testid="admin-metric-waste-prevented">
                              {adminPromiseMetricsQuery.data.seriousMetrics.tons.toFixed(4)}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">tons of plastic waste avoided</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmailManagementSection({ 
  emailForm, 
  setEmailForm, 
  handleSendBulkEmail,
  schoolFilters,
  setSchoolFilters,
  countryOptions
}: { 
  emailForm: any;
  setEmailForm: any;
  handleSendBulkEmail: () => Promise<void>;
  schoolFilters: any;
  setSchoolFilters: any;
  countryOptions: any[];
}) {
  const { toast } = useToast();
  
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [bulkEmailConfirmOpen, setBulkEmailConfirmOpen] = useState(false);
  const [selectedEmailType, setSelectedEmailType] = useState('welcome');
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState('');
  
  const [formData, setFormData] = useState({
    welcome: { recipientEmail: '', schoolName: 'Test School' },
    invitation: { recipientEmail: '', schoolName: 'Test School', inviterName: 'John Doe', expiresInDays: 7 },
    joinRequest: { recipientEmail: '', schoolName: 'Test School', requesterName: 'Jane Smith', requesterEmail: 'jane@example.com', evidence: 'I am a teacher at this school.' },
    joinApproved: { recipientEmail: '', schoolName: 'Test School', reviewerName: 'Head Teacher', reviewNotes: '' },
    evidenceSubmitted: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program', stage: 'Stage 1' },
    evidenceApproved: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program' },
    evidenceRevision: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program', feedback: 'Please add more details about student participation.' },
    newEvidence: { recipientEmail: '', schoolName: 'Test School', evidenceTitle: 'Recycling Program', stage: 'Stage 1', submitterName: 'Jane Smith' },
  });

  const handleSendEmail = async (type: string, endpoint: string, data: any) => {
    if (!data.recipientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    setLoadingStates(prev => ({ ...prev, [type]: true }));
    setResults(prev => ({ ...prev, [type]: null }));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setResults(prev => ({ ...prev, [type]: { success: true, message: `Email sent successfully to ${data.recipientEmail}` } }));
        toast({
          title: "Test Email Sent",
          description: result.message || `Email sent to ${data.recipientEmail}`,
        });
      } else {
        setResults(prev => ({ ...prev, [type]: { success: false, message: result.message || 'Failed to send email' } }));
        toast({
          title: "Failed to Send Email",
          description: result.message || 'An error occurred while sending the email.',
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setResults(prev => ({ ...prev, [type]: { success: false, message: errorMsg } }));
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [type]: false }));
    }
  };

  const updateFormData = (type: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [type]: { ...prev[type as keyof typeof prev], [field]: value }
    }));
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    setTestEmailSending(true);
    try {
      const response = await fetch('/api/admin/bulk-email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: emailForm.subject,
          preheader: emailForm.preheader,
          title: emailForm.title,
          preTitle: emailForm.preTitle,
          messageContent: emailForm.messageContent,
          testEmail: testEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send test email');
      }

      toast({
        title: "Test Email Sent",
        description: `Test email sent successfully to ${testEmail}`,
      });
      setTestEmail('');
    } catch (error: any) {
      toast({
        title: "Failed to Send Test Email",
        description: error.message || "There was an error sending the test email.",
        variant: "destructive",
      });
    } finally {
      setTestEmailSending(false);
    }
  };

  // Fetch images from Media Library
  const { data: mediaImages = [] } = useQuery({
    queryKey: ['/api/admin/media-assets', { mediaType: 'image', search: imageSearch }],
    enabled: imagePickerOpen,
    queryFn: async () => {
      const params = new URLSearchParams({ mediaType: 'image' });
      if (imageSearch) params.append('search', imageSearch);
      const response = await fetch(`/api/admin/media-assets?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch images');
      return response.json();
    },
  });

  // Handle image insertion into email content
  const handleImageInsert = (image: any) => {
    const imgTag = `<img src="${image.signedUrl}" alt="${image.altText || image.filename}" style="max-width: 100%; height: auto;" />`;
    
    setEmailForm((prev: any) => ({
      ...prev,
      messageContent: prev.messageContent + '\n' + imgTag
    }));
    
    toast({
      title: "Image Inserted",
      description: `${image.filename} has been added to your email content`,
    });
    
    setImagePickerOpen(false);
  };

  const ResultMessage = ({ type }: { type: string }) => {
    const result = results[type];
    if (!result) return null;
    
    return (
      <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} data-testid={`result-${type}`}>
        <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
          {result.success ? '✅ Success' : '❌ Error'}
        </p>
        <p className={`text-sm mt-1 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
          {result.message}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Test Email Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Email Type</label>
              <Select value={selectedEmailType} onValueChange={setSelectedEmailType}>
                <SelectTrigger data-testid="select-email-type">
                  <SelectValue placeholder="Select email type to test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="invitation">Teacher Invitation</SelectItem>
                  <SelectItem value="joinRequest">Join Request</SelectItem>
                  <SelectItem value="joinApproved">Join Request Approved</SelectItem>
                  <SelectItem value="evidenceSubmitted">Evidence Submitted</SelectItem>
                  <SelectItem value="evidenceApproved">Evidence Approved</SelectItem>
                  <SelectItem value="evidenceRevision">Evidence Needs Revision</SelectItem>
                  <SelectItem value="newEvidence">New Evidence for Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Welcome Email */}
            {selectedEmailType === 'welcome' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Welcome Email</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    placeholder="teacher@example.com"
                    value={formData.welcome.recipientEmail}
                    onChange={(e) => updateFormData('welcome', 'recipientEmail', e.target.value)}
                    data-testid="input-welcome-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    type="text"
                    placeholder="Test School"
                    value={formData.welcome.schoolName}
                    onChange={(e) => updateFormData('welcome', 'schoolName', e.target.value)}
                    data-testid="input-welcome-school"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('welcome', '/api/admin/test-email', {
                  recipientEmail: formData.welcome.recipientEmail,
                  email: formData.welcome.recipientEmail,
                  schoolName: formData.welcome.schoolName
                })}
                disabled={loadingStates.welcome}
                data-testid="button-send-welcome"
              >
                {loadingStates.welcome ? 'Sending...' : 'Send Welcome Email'}
              </Button>
              <ResultMessage type="welcome" />
            </div>
            )}

            {/* Teacher Invitation */}
            {selectedEmailType === 'invitation' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Teacher Invitation</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.invitation.recipientEmail}
                    onChange={(e) => updateFormData('invitation', 'recipientEmail', e.target.value)}
                    data-testid="input-invitation-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.invitation.schoolName}
                    onChange={(e) => updateFormData('invitation', 'schoolName', e.target.value)}
                    data-testid="input-invitation-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Inviter Name *</label>
                  <Input
                    value={formData.invitation.inviterName}
                    onChange={(e) => updateFormData('invitation', 'inviterName', e.target.value)}
                    data-testid="input-invitation-inviter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Expires In Days</label>
                  <Input
                    type="number"
                    value={formData.invitation.expiresInDays}
                    onChange={(e) => updateFormData('invitation', 'expiresInDays', parseInt(e.target.value))}
                    data-testid="input-invitation-expires"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('invitation', '/api/admin/test-email/teacher-invitation', formData.invitation)}
                disabled={loadingStates.invitation}
                data-testid="button-send-invitation"
              >
                {loadingStates.invitation ? 'Sending...' : 'Send Invitation'}
              </Button>
              <ResultMessage type="invitation" />
            </div>
            )}

            {/* Join Request */}
            {selectedEmailType === 'joinRequest' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Join Request (to Head Teacher)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email (Head Teacher) *</label>
                  <Input
                    type="email"
                    value={formData.joinRequest.recipientEmail}
                    onChange={(e) => updateFormData('joinRequest', 'recipientEmail', e.target.value)}
                    data-testid="input-join-request-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.joinRequest.schoolName}
                    onChange={(e) => updateFormData('joinRequest', 'schoolName', e.target.value)}
                    data-testid="input-join-request-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Requester Name *</label>
                  <Input
                    value={formData.joinRequest.requesterName}
                    onChange={(e) => updateFormData('joinRequest', 'requesterName', e.target.value)}
                    data-testid="input-join-request-requester"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Requester Email *</label>
                  <Input
                    type="email"
                    value={formData.joinRequest.requesterEmail}
                    onChange={(e) => updateFormData('joinRequest', 'requesterEmail', e.target.value)}
                    data-testid="input-join-request-requester-email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Evidence *</label>
                <Textarea
                  value={formData.joinRequest.evidence}
                  onChange={(e) => updateFormData('joinRequest', 'evidence', e.target.value)}
                  rows={3}
                  data-testid="textarea-join-request-evidence"
                />
              </div>
              <Button
                onClick={() => handleSendEmail('joinRequest', '/api/admin/test-email/join-request', formData.joinRequest)}
                disabled={loadingStates.joinRequest}
                data-testid="button-send-join-request"
              >
                {loadingStates.joinRequest ? 'Sending...' : 'Send Join Request'}
              </Button>
              <ResultMessage type="joinRequest" />
            </div>
            )}

            {/* Join Approved */}
            {selectedEmailType === 'joinApproved' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Join Request Approved</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.joinApproved.recipientEmail}
                    onChange={(e) => updateFormData('joinApproved', 'recipientEmail', e.target.value)}
                    data-testid="input-join-approved-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.joinApproved.schoolName}
                    onChange={(e) => updateFormData('joinApproved', 'schoolName', e.target.value)}
                    data-testid="input-join-approved-school"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Reviewer Name *</label>
                  <Input
                    value={formData.joinApproved.reviewerName}
                    onChange={(e) => updateFormData('joinApproved', 'reviewerName', e.target.value)}
                    data-testid="input-join-approved-reviewer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Review Notes (Optional)</label>
                <Textarea
                  value={formData.joinApproved.reviewNotes}
                  onChange={(e) => updateFormData('joinApproved', 'reviewNotes', e.target.value)}
                  rows={3}
                  data-testid="textarea-join-approved-notes"
                />
              </div>
              <Button
                onClick={() => handleSendEmail('joinApproved', '/api/admin/test-email/join-approved', formData.joinApproved)}
                disabled={loadingStates.joinApproved}
                data-testid="button-send-join-approved"
              >
                {loadingStates.joinApproved ? 'Sending...' : 'Send Approval Email'}
              </Button>
              <ResultMessage type="joinApproved" />
            </div>
            )}

            {/* Evidence Submitted */}
            {selectedEmailType === 'evidenceSubmitted' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Evidence Submitted</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.evidenceSubmitted.recipientEmail}
                    onChange={(e) => updateFormData('evidenceSubmitted', 'recipientEmail', e.target.value)}
                    data-testid="input-evidence-submitted-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.evidenceSubmitted.schoolName}
                    onChange={(e) => updateFormData('evidenceSubmitted', 'schoolName', e.target.value)}
                    data-testid="input-evidence-submitted-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.evidenceSubmitted.evidenceTitle}
                    onChange={(e) => updateFormData('evidenceSubmitted', 'evidenceTitle', e.target.value)}
                    data-testid="input-evidence-submitted-title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stage *</label>
                  <Select
                    value={formData.evidenceSubmitted.stage}
                    onValueChange={(value) => updateFormData('evidenceSubmitted', 'stage', value)}
                  >
                    <SelectTrigger data-testid="select-evidence-submitted-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stage 1">Stage 1</SelectItem>
                      <SelectItem value="Stage 2">Stage 2</SelectItem>
                      <SelectItem value="Stage 3">Stage 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('evidenceSubmitted', '/api/admin/test-email/evidence-submitted', formData.evidenceSubmitted)}
                disabled={loadingStates.evidenceSubmitted}
                data-testid="button-send-evidence-submitted"
              >
                {loadingStates.evidenceSubmitted ? 'Sending...' : 'Send Submission Confirmation'}
              </Button>
              <ResultMessage type="evidenceSubmitted" />
            </div>
            )}

            {/* Evidence Approved */}
            {selectedEmailType === 'evidenceApproved' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Evidence Approved</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.evidenceApproved.recipientEmail}
                    onChange={(e) => updateFormData('evidenceApproved', 'recipientEmail', e.target.value)}
                    data-testid="input-evidence-approved-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.evidenceApproved.schoolName}
                    onChange={(e) => updateFormData('evidenceApproved', 'schoolName', e.target.value)}
                    data-testid="input-evidence-approved-school"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.evidenceApproved.evidenceTitle}
                    onChange={(e) => updateFormData('evidenceApproved', 'evidenceTitle', e.target.value)}
                    data-testid="input-evidence-approved-title"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('evidenceApproved', '/api/admin/test-email/evidence-approved', formData.evidenceApproved)}
                disabled={loadingStates.evidenceApproved}
                data-testid="button-send-evidence-approved"
              >
                {loadingStates.evidenceApproved ? 'Sending...' : 'Send Approval Email'}
              </Button>
              <ResultMessage type="evidenceApproved" />
            </div>
            )}

            {/* Evidence Revision */}
            {selectedEmailType === 'evidenceRevision' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Evidence Needs Revision</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                  <Input
                    type="email"
                    value={formData.evidenceRevision.recipientEmail}
                    onChange={(e) => updateFormData('evidenceRevision', 'recipientEmail', e.target.value)}
                    data-testid="input-evidence-revision-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.evidenceRevision.schoolName}
                    onChange={(e) => updateFormData('evidenceRevision', 'schoolName', e.target.value)}
                    data-testid="input-evidence-revision-school"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.evidenceRevision.evidenceTitle}
                    onChange={(e) => updateFormData('evidenceRevision', 'evidenceTitle', e.target.value)}
                    data-testid="input-evidence-revision-title"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Feedback *</label>
                <Textarea
                  value={formData.evidenceRevision.feedback}
                  onChange={(e) => updateFormData('evidenceRevision', 'feedback', e.target.value)}
                  rows={3}
                  data-testid="textarea-evidence-revision-feedback"
                />
              </div>
              <Button
                onClick={() => handleSendEmail('evidenceRevision', '/api/admin/test-email/evidence-revision', formData.evidenceRevision)}
                disabled={loadingStates.evidenceRevision}
                data-testid="button-send-evidence-revision"
              >
                {loadingStates.evidenceRevision ? 'Sending...' : 'Send Revision Request'}
              </Button>
              <ResultMessage type="evidenceRevision" />
            </div>
            )}

            {/* New Evidence for Admin */}
            {selectedEmailType === 'newEvidence' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">New Evidence for Admin</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Email (Admin) *</label>
                  <Input
                    type="email"
                    value={formData.newEvidence.recipientEmail}
                    onChange={(e) => updateFormData('newEvidence', 'recipientEmail', e.target.value)}
                    data-testid="input-new-evidence-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">School Name *</label>
                  <Input
                    value={formData.newEvidence.schoolName}
                    onChange={(e) => updateFormData('newEvidence', 'schoolName', e.target.value)}
                    data-testid="input-new-evidence-school"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Evidence Title *</label>
                  <Input
                    value={formData.newEvidence.evidenceTitle}
                    onChange={(e) => updateFormData('newEvidence', 'evidenceTitle', e.target.value)}
                    data-testid="input-new-evidence-title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Stage *</label>
                  <Select
                    value={formData.newEvidence.stage}
                    onValueChange={(value) => updateFormData('newEvidence', 'stage', value)}
                  >
                    <SelectTrigger data-testid="select-new-evidence-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Stage 1">Stage 1</SelectItem>
                      <SelectItem value="Stage 2">Stage 2</SelectItem>
                      <SelectItem value="Stage 3">Stage 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Submitter Name *</label>
                  <Input
                    value={formData.newEvidence.submitterName}
                    onChange={(e) => updateFormData('newEvidence', 'submitterName', e.target.value)}
                    data-testid="input-new-evidence-submitter"
                  />
                </div>
              </div>
              <Button
                onClick={() => handleSendEmail('newEvidence', '/api/admin/test-email/new-evidence', formData.newEvidence)}
                disabled={loadingStates.newEvidence}
                data-testid="button-send-new-evidence"
              >
                {loadingStates.newEvidence ? 'Sending...' : 'Send Admin Notification'}
              </Button>
              <ResultMessage type="newEvidence" />
            </div>
            )}
          </div>
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
        <CardContent className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700">Recipient Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipients *</label>
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
            </div>

            {emailForm.recipientType === 'schools' && (
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700">School Filters</h4>
                <p className="text-xs text-gray-600">
                  Configure filters to target specific schools. Emails will be sent to all teachers at filtered schools.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search Schools</label>
                    <Input
                      placeholder="Search by name..."
                      value={schoolFilters.search}
                      onChange={(e) => setSchoolFilters((prev: any) => ({ ...prev, search: e.target.value }))}
                      data-testid="input-school-filter-search"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                    <Select
                      value={schoolFilters.country}
                      onValueChange={(value) => setSchoolFilters((prev: any) => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="h-9" data-testid="select-school-filter-country">
                        <SelectValue placeholder="All countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {countryOptions.map((country: any) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
                    <Select
                      value={schoolFilters.stage}
                      onValueChange={(value) => setSchoolFilters((prev: any) => ({ ...prev, stage: value }))}
                    >
                      <SelectTrigger className="h-9" data-testid="select-school-filter-stage">
                        <SelectValue placeholder="All stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="Stage 1">Stage 1</SelectItem>
                        <SelectItem value="Stage 2">Stage 2</SelectItem>
                        <SelectItem value="Stage 3">Stage 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                    <Select
                      value={schoolFilters.language}
                      onValueChange={(value) => setSchoolFilters((prev: any) => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger className="h-9" data-testid="select-school-filter-language">
                        <SelectValue placeholder="All languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
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
                  </div>
                </div>
              </div>
            )}

            {emailForm.recipientType === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Email Addresses *</label>
                <Textarea
                  placeholder="Enter email addresses (one per line or comma separated)"
                  value={emailForm.recipients}
                  onChange={(e) => setEmailForm((prev: any) => ({ ...prev, recipients: e.target.value }))}
                  rows={4}
                  data-testid="textarea-custom-recipients"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {emailForm.recipients.split(/[,\n]/).filter((e: string) => e.trim()).length} email(s)
                </p>
              </div>
            )}
          </div>

          {/* Email Content */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Email Content</h3>
            <p className="text-xs text-gray-500">
              These fields will be passed to your SendGrid template. Make sure your template is set up with the corresponding variables.
            </p>
            
            {/* Auto-translate toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="text-sm font-medium text-gray-900">Auto-translate to recipient's language</label>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically translate email content to each recipient's preferred school language using AI
                </p>
              </div>
              <Switch
                checked={emailForm.autoTranslate || false}
                onCheckedChange={(checked) => setEmailForm((prev: any) => ({ ...prev, autoTranslate: checked }))}
                data-testid="switch-auto-translate"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Subject *</label>
              <Input
                placeholder="Email subject line"
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev: any) => ({ ...prev, subject: e.target.value }))}
                data-testid="input-email-subject"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailForm.subject.length}/200 characters • The main subject line for the email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preheader</label>
              <Input
                placeholder="Preview text shown in email clients (optional)"
                value={emailForm.preheader}
                onChange={(e) => setEmailForm((prev: any) => ({ ...prev, preheader: e.target.value }))}
                data-testid="input-email-preheader"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailForm.preheader.length}/100 characters • Optional preview text that appears in email inbox
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                placeholder="Large heading inside the email"
                value={emailForm.title}
                onChange={(e) => setEmailForm((prev: any) => ({ ...prev, title: e.target.value }))}
                data-testid="input-email-title"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailForm.title.length}/200 characters • The main heading displayed in the email body
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pre-title (Subtitle)</label>
              <Input
                placeholder="Subtitle under the title (optional)"
                value={emailForm.preTitle}
                onChange={(e) => setEmailForm((prev: any) => ({ ...prev, preTitle: e.target.value }))}
                data-testid="input-email-pretitle"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {emailForm.preTitle.length}/200 characters • Optional subtitle text below the title
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Message Content *</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setImagePickerOpen(true)}
                    data-testid="button-insert-image"
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Insert Image
                  </Button>
                  <span className="text-xs text-gray-500">Supports HTML formatting</span>
                </div>
              </div>
              <Textarea
                placeholder="Enter the main message content. HTML tags are supported for formatting."
                value={emailForm.messageContent}
                onChange={(e) => setEmailForm((prev: any) => ({ ...prev, messageContent: e.target.value }))}
                rows={10}
                data-testid="textarea-email-content"
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {emailForm.messageContent.length}/10,000 characters
                </p>
                <p className="text-xs text-gray-500">
                  ~{Math.ceil(emailForm.messageContent.split(/\s+/).filter((w: string) => w).length / 200)} min read
                </p>
              </div>
            </div>
          </div>

          {/* Preview and Test Section */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700">Preview & Test</h3>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setPreviewDialogOpen(true)}
                disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent}
                data-testid="button-preview-email"
                className="flex-1 min-w-[150px]"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Email
              </Button>
              
              <div className="flex-1 min-w-[300px] flex gap-2">
                <Input
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="input-test-email"
                  type="email"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent || !testEmail.trim() || testEmailSending}
                  data-testid="button-send-test-email"
                >
                  {testEmailSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Send Bulk Email Button */}
          <Button
            onClick={() => setBulkEmailConfirmOpen(true)}
            disabled={!emailForm.subject || !emailForm.title || !emailForm.messageContent || 
              (emailForm.recipientType === 'custom' && !emailForm.recipients.trim())}
            className="w-full bg-coral hover:bg-coral/90 h-12 text-base"
            data-testid="button-send-bulk-email"
          >
            <Mail className="h-5 w-5 mr-2" />
            Send Bulk Email to {emailForm.recipientType === 'all_teachers' ? 'All Teachers' : 
              emailForm.recipientType === 'schools' ? 'Filtered Schools' : 'Custom Recipients'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-email-preview">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="text-xs text-gray-500 mb-1">Subject:</p>
              <p className="text-lg font-semibold" data-testid="text-preview-subject">{emailForm.subject}</p>
            </div>
            {emailForm.preheader && (
              <div className="border-b pb-3">
                <p className="text-xs text-gray-500 mb-1">Preheader:</p>
                <p className="text-sm text-gray-600" data-testid="text-preview-preheader">{emailForm.preheader}</p>
              </div>
            )}
            <div className="border rounded-lg p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h2 className="text-2xl font-bold text-navy" data-testid="text-preview-title">{emailForm.title}</h2>
                  {emailForm.preTitle && (
                    <p className="text-base text-gray-600 mt-2" data-testid="text-preview-pretitle">{emailForm.preTitle}</p>
                  )}
                </div>
                <div 
                  dangerouslySetInnerHTML={{ __html: emailForm.messageContent }}
                  data-testid="preview-html-content"
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Confirmation Dialog */}
      <AlertDialog open={bulkEmailConfirmOpen} onOpenChange={setBulkEmailConfirmOpen}>
        <AlertDialogContent data-testid="dialog-confirm-bulk-email">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Email Send</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to send this email to:</p>
              <p className="font-semibold text-gray-900">
                {emailForm.recipientType === 'all_teachers' ? 'All Teachers' : 
                  emailForm.recipientType === 'schools' ? 'Teachers in Filtered Schools' : 
                  `${emailForm.recipients.split(/[,\n]/).filter((e: string) => e.trim()).length} Custom Recipients`}
              </p>
              <p className="text-sm">Subject: <span className="font-medium">{emailForm.subject}</span></p>
              <p className="text-amber-600 mt-3">This action cannot be undone. Make sure you've tested the email first.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-send">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await handleSendBulkEmail();
                  setBulkEmailConfirmOpen(false);
                } catch (error) {
                  // Error already handled in handleSendBulkEmail
                }
              }}
              className="bg-coral hover:bg-coral/90"
              data-testid="button-confirm-bulk-send"
            >
              Send Bulk Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Picker Dialog */}
      <Dialog open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-image-picker">
          <DialogHeader>
            <DialogTitle>Insert Image from Media Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search/Filter */}
            <Input
              placeholder="Search images..."
              value={imageSearch}
              onChange={(e) => setImageSearch(e.target.value)}
              data-testid="input-image-search"
            />
            
            {/* Image Grid */}
            <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
              {mediaImages.map((image: any) => (
                <div 
                  key={image.id}
                  className="border rounded cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => handleImageInsert(image)}
                  data-testid={`image-picker-${image.id}`}
                >
                  <img src={image.signedUrl} alt={image.altText || image.filename} className="w-full h-32 object-cover rounded-t" />
                  <div className="p-2 text-xs">
                    <p className="font-medium truncate">{image.filename}</p>
                    {image.altText && <p className="text-gray-500 truncate">{image.altText}</p>}
                  </div>
                </div>
              ))}
            </div>
            
            {/* No images message */}
            {mediaImages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No images found in Media Library</p>
                <p className="text-sm">Upload images in the Media Library tab first</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvidenceGalleryTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState({
    status: '',
    stage: '',
    country: '',
    visibility: '',
  });
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithSchool | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [schoolHistoryDialogOpen, setSchoolHistoryDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<EvidenceWithSchool['school'] | null>(null);
  
  // Fetch all evidence with filters
  const { data: evidenceList = [], isLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.country) params.append('country', filters.country);
      if (filters.visibility) params.append('visibility', filters.visibility);
      
      const response = await fetch(`/api/admin/evidence?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
  });

  // Fetch school history when selected
  const { data: schoolHistory = [], isLoading: schoolHistoryLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', { schoolId: selectedSchool?.id }],
    queryFn: async () => {
      if (!selectedSchool?.id) return [];
      const params = new URLSearchParams({ schoolId: selectedSchool.id });
      const response = await fetch(`/api/admin/evidence?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch school history');
      return response.json();
    },
    enabled: !!selectedSchool?.id,
  });

  // Fetch countries for filter
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ['/api/countries'],
  });

  // Update evidence status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const response = await apiRequest('PATCH', `/api/admin/evidence/${id}/status`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ title: "Success", description: "Evidence status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update evidence status", variant: "destructive" });
    },
  });

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/evidence/${id}/featured`, { isFeatured: !isFeatured });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ title: "Success", description: "Evidence featured status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update featured status", variant: "destructive" });
    },
  });

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get stage badge color
  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-purple-100 text-purple-800';
      case 'investigate': return 'bg-blue-100 text-blue-800';
      case 'act': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get file for thumbnail (image or PDF)
  const getFileForThumbnail = (evidence: EvidenceWithSchool) => {
    const files = evidence.files as any[] || [];
    
    // First try to find an image
    const imageFile = files.find((f: any) => 
      f.mimeType?.startsWith('image/') || f.type?.startsWith('image/')
    );
    if (imageFile) return { type: 'image', url: imageFile.url };
    
    // Then try PDF
    const pdfFile = files.find((f: any) => 
      f.mimeType?.includes('pdf') || f.type?.includes('pdf')
    );
    if (pdfFile) return { type: 'pdf', url: pdfFile.url };
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy">Evidence Gallery</h2>
          <p className="text-gray-600 text-sm mt-1">Browse and manage all evidence submissions</p>
        </div>
        <div className="text-sm text-gray-600">
          {evidenceList.length} {evidenceList.length === 1 ? 'submission' : 'submissions'}
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <Select 
                value={filters.stage || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, stage: value === 'all' ? '' : value }))}
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <Select 
                value={filters.country || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, country: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-country-filter">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country: string) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <Select 
                value={filters.visibility || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, visibility: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-visibility-filter">
                  <SelectValue placeholder="All Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ status: '', stage: '', country: '', visibility: '' })}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Evidence Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200" />
              <CardContent className="pt-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : evidenceList.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No evidence submissions yet"
          description="Evidence submissions will appear here once schools start uploading"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {evidenceList.map((evidence: any) => (
            <Card key={evidence.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-evidence-${evidence.id}`}>
              {/* Thumbnail */}
              <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                {(() => {
                  const file = getFileForThumbnail(evidence);
                  if (file?.type === 'image') {
                    return (
                      <img 
                        src={file.url} 
                        alt={evidence.title}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else if (file?.type === 'pdf') {
                    return (
                      <PDFThumbnail 
                        url={file.url}
                        className="w-full h-full"
                      />
                    );
                  } else {
                    return <FileText className="h-24 w-24 text-gray-400" />;
                  }
                })()}
              </div>
              
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-2" title={evidence.title}>
                    {evidence.title}
                  </h3>
                  
                  {/* School Info */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Building className="h-3 w-3" />
                    <button
                      onClick={() => {
                        setSelectedSchool(evidence.school);
                        setSchoolHistoryDialogOpen(true);
                      }}
                      className="hover:underline truncate"
                      data-testid={`button-school-history-${evidence.id}`}
                    >
                      {evidence.school?.name || 'Unknown School'}
                    </button>
                  </div>
                  
                  {/* Country */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Globe className="h-3 w-3" />
                    <span>{evidence.school?.country || 'Unknown'}</span>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge className={getStageBadgeColor(evidence.stage)}>
                      {evidence.stage}
                    </Badge>
                    <Badge className={getStatusBadgeColor(evidence.status)}>
                      {evidence.status}
                    </Badge>
                    {evidence.visibility === 'public' && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                    {evidence.isFeatured && (
                      <Badge className="bg-amber-100 text-amber-800">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedEvidence(evidence);
                        setDetailsDialogOpen(true);
                      }}
                      data-testid={`button-view-evidence-${evidence.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {evidence.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => updateStatusMutation.mutate({ id: evidence.id, status: 'approved' })}
                          data-testid={`button-approve-evidence-${evidence.id}`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: evidence.id, status: 'rejected' })}
                          data-testid={`button-reject-evidence-${evidence.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant={evidence.isFeatured ? "default" : "outline"}
                      onClick={() => toggleFeaturedMutation.mutate({ id: evidence.id, isFeatured: evidence.isFeatured })}
                      data-testid={`button-feature-evidence-${evidence.id}`}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Evidence Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-evidence-details">
          <DialogHeader>
            <DialogTitle>Evidence Details</DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <p className="text-sm mt-1">{selectedEvidence.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm mt-1">{selectedEvidence.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">School</label>
                  <p className="text-sm mt-1">{selectedEvidence.school?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Country</label>
                  <p className="text-sm mt-1">{selectedEvidence.school?.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Stage</label>
                  <Badge className={getStageBadgeColor(selectedEvidence.stage)}>
                    {selectedEvidence.stage}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge className={getStatusBadgeColor(selectedEvidence.status)}>
                    {selectedEvidence.status}
                  </Badge>
                </div>
              </div>
              {selectedEvidence.files && (selectedEvidence.files as any[]).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Files ({(selectedEvidence.files as any[]).length})</label>
                  <EvidenceFilesGallery files={selectedEvidence.files as any[]} />
                </div>
              )}
              {selectedEvidence.videoLinks && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Video Links</label>
                  <EvidenceVideoLinks videoLinks={selectedEvidence.videoLinks as string} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* School History Dialog */}
      <Dialog open={schoolHistoryDialogOpen} onOpenChange={setSchoolHistoryDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-school-history">
          <DialogHeader>
            <DialogTitle>
              {selectedSchool?.name} - All Submissions ({schoolHistory.length})
            </DialogTitle>
          </DialogHeader>
          {schoolHistoryLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
            </div>
          ) : schoolHistory.length === 0 ? (
            <EmptyState 
              icon={FileText}
              title="No submissions yet"
              description="This school hasn't submitted any evidence yet"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolHistory.map((evidence: any) => (
                <Card key={evidence.id} className="overflow-hidden" data-testid={`card-school-evidence-${evidence.id}`}>
                  <div className="h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {(() => {
                      const file = getFileForThumbnail(evidence);
                      if (file?.type === 'image') {
                        return (
                          <img 
                            src={file.url} 
                            alt={evidence.title}
                            className="w-full h-full object-cover"
                          />
                        );
                      } else if (file?.type === 'pdf') {
                        return (
                          <PDFThumbnail 
                            url={file.url}
                            className="w-full h-full"
                          />
                        );
                      } else {
                        return <FileText className="h-16 w-16 text-gray-400" />;
                      }
                    })()}
                  </div>
                  <CardContent className="pt-3">
                    <h4 className="font-medium text-sm line-clamp-2">{evidence.title}</h4>
                    <div className="flex gap-1 mt-2">
                      <Badge className={getStageBadgeColor(evidence.stage)} variant="outline">
                        {evidence.stage}
                      </Badge>
                      <Badge className={getStatusBadgeColor(evidence.status)}>
                        {evidence.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(evidence.submittedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrintableFormsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    formType: '',
    schoolSearch: '',
  });
  const [reviewingSubmission, setReviewingSubmission] = useState<PrintableFormSubmissionWithDetails | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'revision_requested'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch submissions with filters
  const { data: submissions = [], isLoading } = useQuery<PrintableFormSubmissionWithDetails[]>({
    queryKey: ['/api/admin/printable-form-submissions', filters.status, filters.formType, filters.schoolSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.formType) params.append('formType', filters.formType);
      if (filters.schoolSearch) params.append('schoolId', filters.schoolSearch);
      
      const response = await fetch(`/api/admin/printable-form-submissions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) => {
      return apiRequest(`/api/admin/printable-form-submissions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/printable-form-submissions'] });
      toast({
        title: "Success",
        description: "Submission status updated successfully",
      });
      setReviewDialogOpen(false);
      setReviewingSubmission(null);
      setReviewNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission status",
        variant: "destructive",
      });
    },
  });

  // Download submission
  const handleDownload = async (submission: PrintableFormSubmissionWithDetails) => {
    try {
      const response = await fetch(`/api/printable-form-submissions/${submission.id}/download`);
      if (!response.ok) throw new Error('Failed to get download URL');
      
      const { downloadUrl } = await response.json();
      window.open(downloadUrl, '_blank');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download submission",
        variant: "destructive",
      });
    }
  };

  // Handle review submission
  const handleReview = (submission: PrintableFormSubmissionWithDetails) => {
    setReviewingSubmission(submission);
    setReviewStatus('approved');
    setReviewNotes('');
    setReviewDialogOpen(true);
  };

  // Submit review
  const handleSubmitReview = () => {
    if (!reviewingSubmission) return;
    
    updateStatusMutation.mutate({
      id: reviewingSubmission.id,
      status: reviewStatus,
      reviewNotes: reviewNotes || undefined,
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      revision_requested: 'bg-orange-100 text-orange-800',
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-navy">
            Printable Forms Review
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Review and manage printable form submissions from schools
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="revision_requested">Revision Requested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Form Type
              </label>
              <Select value={filters.formType} onValueChange={(value) => setFilters({ ...filters, formType: value })}>
                <SelectTrigger data-testid="select-filter-form-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="action_plan">Action Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Search
              </label>
              <Input
                type="text"
                placeholder="Search by school name..."
                value={filters.schoolSearch}
                onChange={(e) => setFilters({ ...filters, schoolSearch: e.target.value })}
                data-testid="input-search-school"
              />
            </div>
          </div>

          {/* Submissions Table */}
          {isLoading ? (
            <div className="py-8">
              <LoadingSpinner message="Loading submissions..." />
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Submissions Found"
              description="No printable form submissions match your filters"
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" data-testid="table-printable-submissions">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">School</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Form Type</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Submitted By</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Upload Date</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">{submission.school.name}</div>
                          <div className="text-sm text-gray-500">{submission.school.country}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {submission.formType === 'audit' ? 'Audit' : 'Action Plan'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={submission.status} />
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {submission.submittedByUser.firstName} {submission.submittedByUser.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{submission.submittedByUser.email}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {format(new Date(submission.submittedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(submission)}
                            data-testid={`button-download-${submission.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {(submission.status === 'pending' || submission.status === 'revision_requested') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReview(submission)}
                              data-testid={`button-review-${submission.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
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

      {/* Review Status Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen} data-testid="dialog-update-status">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {reviewingSubmission && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p><strong>School:</strong> {reviewingSubmission.school.name}</p>
                <p><strong>Form Type:</strong> {reviewingSubmission.formType === 'audit' ? 'Audit' : 'Action Plan'}</p>
                <p><strong>Submitted by:</strong> {reviewingSubmission.submittedByUser.firstName} {reviewingSubmission.submittedByUser.lastName}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <RadioGroup value={reviewStatus} onValueChange={(value: any) => setReviewStatus(value)}>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="approved"
                    value="approved"
                    checked={reviewStatus === 'approved'}
                    onChange={(e) => setReviewStatus('approved')}
                    className="h-4 w-4"
                    data-testid="radio-status-approved"
                  />
                  <label htmlFor="approved" className="text-sm cursor-pointer">Approved</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="rejected"
                    value="rejected"
                    checked={reviewStatus === 'rejected'}
                    onChange={(e) => setReviewStatus('rejected')}
                    className="h-4 w-4"
                    data-testid="radio-status-rejected"
                  />
                  <label htmlFor="rejected" className="text-sm cursor-pointer">Rejected</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="revision_requested"
                    value="revision_requested"
                    checked={reviewStatus === 'revision_requested'}
                    onChange={(e) => setReviewStatus('revision_requested')}
                    className="h-4 w-4"
                    data-testid="radio-status-revision-requested"
                  />
                  <label htmlFor="revision_requested" className="text-sm cursor-pointer">Revision Requested</label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this review..."
                rows={4}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={updateStatusMutation.isPending}
              data-testid="button-submit-status-update"
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Submit Review'}
            </Button>
          </DialogFooter>
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

  // Approved public evidence query for case study creation
  const { data: approvedPublicEvidence = [] } = useQuery<PendingEvidence[]>({
    queryKey: ['/api/admin/evidence/approved-public'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && createCaseStudyData !== null),
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
      return await apiRequest('POST', '/api/admin/events', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
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
      if (viewingSchool && data.school) {
        setViewingSchool({
          ...viewingSchool,
          ...data.school
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
      
      setEmailForm({
        recipientType: 'all_teachers',
        subject: '',
        preheader: '',
        title: '',
        preTitle: '',
        messageContent: '',
        template: 'announcement',
        recipients: ''
      });
      
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
            <AnalyticsContent />
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

      {/* Create/Edit Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-event-dialog-title">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEventDialogOpen(false)}
              data-testid="button-cancel-event"
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
              {createEventMutation.isPending || updateEventMutation.isPending ? 'Saving...' : 'Save Event'}
            </Button>
          </DialogFooter>
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
                  Select Evidence <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Choose from approved public evidence submissions
                </p>
                {approvedPublicEvidence.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>No approved public evidence available</p>
                    <p className="text-sm mt-1">Evidence must be approved and set to public visibility</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {approvedPublicEvidence.map((evidence) => (
                      <div
                        key={evidence.id}
                        className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                          createCaseStudyData.evidenceId === evidence.id
                            ? 'border-pcs_blue ring-2 ring-pcs_blue'
                            : 'border-gray-200 hover:border-pcs_blue'
                        }`}
                        onClick={() => setCreateCaseStudyData(prev => prev ? { ...prev, evidenceId: evidence.id } : null)}
                        data-testid={`evidence-thumbnail-${evidence.id}`}
                      >
                        <div className="aspect-video bg-gray-100 flex items-center justify-center">
                          {evidence.files && evidence.files.length > 0 && evidence.files[0].type?.includes('image') ? (
                            <img
                              src={evidence.files[0].url}
                              alt={evidence.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400 text-center p-2">
                              <span className="text-2xl">📄</span>
                              <p className="text-xs mt-1">No image</p>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-xs font-medium text-navy line-clamp-2">{evidence.title}</p>
                          <p className="text-xs text-gray-500">{evidence.stage}</p>
                        </div>
                        {createCaseStudyData.evidenceId === evidence.id && (
                          <div className="absolute top-1 right-1 bg-pcs_blue text-white rounded-full p-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
