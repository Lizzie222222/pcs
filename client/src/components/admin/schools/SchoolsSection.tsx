import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCountries } from "@/hooks/useCountries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Clock,
  Target,
  TrendingDown,
  Droplets,
  Fish,
  Heart,
  Leaf,
  Factory,
  Trash,
  Image as ImageIcon,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import type { AdminStats, SchoolData } from "@/components/admin/shared/types";
import type { ReductionPromise } from "@shared/schema";
import { calculateAggregateMetrics } from "@shared/plasticMetrics";

interface SchoolsSectionProps {
  activeTab: string;
  stats: AdminStats | undefined;
  approvePhotoConsentMutation: any;
  rejectPhotoConsentMutation: any;
  photoConsentRejectDialogOpen: boolean;
  setPhotoConsentRejectDialogOpen: (open: boolean) => void;
  photoConsentRejectNotes: string;
  setPhotoConsentRejectNotes: (notes: string) => void;
}

// SchoolTeachersRow component
interface SchoolTeacher {
  userId: string;
  name: string;
  email: string;
  role: 'head_teacher' | 'teacher';
  isVerified: boolean;
  joinedAt: string;
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

export default function SchoolsSection({ 
  activeTab, 
  stats,
  approvePhotoConsentMutation,
  rejectPhotoConsentMutation,
  photoConsentRejectDialogOpen,
  setPhotoConsentRejectDialogOpen,
  photoConsentRejectNotes,
  setPhotoConsentRejectNotes
}: SchoolsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();

  // School filters and management state
  const [schoolFilters, setSchoolFilters] = useState({
    search: '',
    country: 'all',
    stage: 'all',
    language: 'all',
  });
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [viewingSchool, setViewingSchool] = useState<SchoolData | null>(null);
  const [editingSchoolLanguage, setEditingSchoolLanguage] = useState(false);
  const [schoolLanguageValue, setSchoolLanguageValue] = useState<string>('');
  const [evidenceFormSchoolId, setEvidenceFormSchoolId] = useState<string | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<SchoolData | null>(null);
  const [deleteSchoolUsers, setDeleteSchoolUsers] = useState(false);
  const [bulkSchoolDialogOpen, setBulkSchoolDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: 'update' | 'delete';
    updates?: Record<string, any>;
  } | null>(null);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [editingProgression, setEditingProgression] = useState(false);
  const [progressionFormData, setProgressionFormData] = useState({
    currentStage: 'inspire' as 'inspire' | 'investigate' | 'act',
    currentRound: 1,
    inspireCompleted: false,
    investigateCompleted: false,
    actCompleted: false,
  });
  const [showAdminEvidenceForm, setShowAdminEvidenceForm] = useState(false);

  // Clean filters for API (convert "all" values to empty strings)
  const cleanFilters = (filters: typeof schoolFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
  };

  // Schools query
  const { data: schools } = useQuery<SchoolData[]>({
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
    enabled: activeTab === 'schools',
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

  // Photo consent query - fetch when viewing a school
  const { data: photoConsentStatus, refetch: refetchPhotoConsent } = useQuery<{
    status: string | null;
    documentUrl: string | null;
    uploadedAt: Date | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    reviewedBy: string | null;
    reviewNotes: string | null;
  } | null>({
    queryKey: ['/api/schools', viewingSchool?.id, 'photo-consent'],
    enabled: !!viewingSchool?.id,
  });

  // Fetch school users preview when deletion dialog opens
  const { data: schoolUsersPreview, isLoading: isLoadingSchoolUsers } = useQuery<{
    count: number;
    users: Array<{ id: string; name: string; email: string; role: string }>;
  }>({
    queryKey: ['/api/admin/schools', deletingSchool?.id, 'users-preview'],
    enabled: !!deletingSchool,
    retry: false,
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
    onError: () => {
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
    onError: () => {
      toast({
        title: "Bulk Delete Failed",
        description: "Failed to delete schools. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Individual school delete mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async ({ schoolId, deleteUsers }: { schoolId: string; deleteUsers: boolean }) => {
      await apiRequest('DELETE', `/api/admin/schools/${schoolId}?deleteUsers=${deleteUsers}`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "School Deleted",
        description: variables.deleteUsers 
          ? "The school and all associated users have been successfully deleted."
          : "The school has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/school-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setDeletingSchool(null);
      setDeleteSchoolUsers(false);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete school. Please try again.",
        variant: "destructive",
      });
      setDeletingSchool(null);
      setDeleteSchoolUsers(false);
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

  // Helper functions
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

  const toggleSchoolExpansion = (schoolId: string) => {
    const newExpandedSchools = new Set(expandedSchools);
    
    if (expandedSchools.has(schoolId)) {
      newExpandedSchools.delete(schoolId);
    } else {
      newExpandedSchools.add(schoolId);
    }
    
    setExpandedSchools(newExpandedSchools);
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

              {/* Photo Consent Status Card */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="h-5 w-5 text-pcs_blue" />
                    Photo Consent Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!photoConsentStatus || !photoConsentStatus.status ? (
                    <div className="text-center py-8 text-gray-500" data-testid="photo-consent-not-uploaded">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No photo consent document uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Status and Upload Info */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-600">Status:</label>
                            <Badge
                              className={
                                photoConsentStatus.status === 'approved' ? 'bg-green-500 text-white' :
                                photoConsentStatus.status === 'rejected' ? 'bg-red-500 text-white' :
                                photoConsentStatus.status === 'pending' ? 'bg-yellow-500 text-white' :
                                'bg-gray-500 text-white'
                              }
                              data-testid="badge-photo-consent-status"
                            >
                              {photoConsentStatus.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {photoConsentStatus.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                              {photoConsentStatus.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                              {photoConsentStatus.status?.charAt(0).toUpperCase() + photoConsentStatus.status?.slice(1)}
                            </Badge>
                          </div>
                          
                          {photoConsentStatus.uploadedAt && (
                            <p className="text-sm text-gray-600" data-testid="text-photo-consent-upload-date">
                              <strong>Uploaded:</strong> {new Date(photoConsentStatus.uploadedAt).toLocaleDateString()}
                            </p>
                          )}

                          {photoConsentStatus.documentUrl && (
                            <a
                              href={photoConsentStatus.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-pcs_blue hover:underline"
                              data-testid="link-view-photo-consent-document"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Document
                            </a>
                          )}
                        </div>

                        {/* Action Buttons for Pending Status */}
                        {photoConsentStatus.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (viewingSchool?.id) {
                                  approvePhotoConsentMutation.mutate({ schoolId: viewingSchool.id, notes: '' });
                                }
                              }}
                              disabled={approvePhotoConsentMutation.isPending}
                              className="bg-green-500 hover:bg-green-600 text-white"
                              data-testid="button-approve-photo-consent"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {approvePhotoConsentMutation.isPending ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setPhotoConsentRejectDialogOpen(true)}
                              disabled={rejectPhotoConsentMutation.isPending}
                              data-testid="button-reject-photo-consent"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Approval Information */}
                      {photoConsentStatus.status === 'approved' && photoConsentStatus.approvedAt && (
                        <div className="border-t pt-3 text-sm text-gray-600" data-testid="info-photo-consent-approval">
                          <p>
                            <strong>Approved:</strong> {new Date(photoConsentStatus.approvedAt).toLocaleDateString()}
                          </p>
                          {photoConsentStatus.approvedBy && (
                            <p>
                              <strong>Approved by:</strong> {photoConsentStatus.approvedBy}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Rejection Information */}
                      {photoConsentStatus.status === 'rejected' && (
                        <div className="border-t pt-3" data-testid="info-photo-consent-rejection">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm font-semibold text-red-900 mb-1">Rejection Notes:</p>
                            <p className="text-sm text-red-800" data-testid="text-photo-consent-reject-notes">
                              {photoConsentStatus.reviewNotes || 'No notes provided'}
                            </p>
                            {photoConsentStatus.reviewedBy && (
                              <p className="text-xs text-red-700 mt-2">
                                Reviewed by: {photoConsentStatus.reviewedBy}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
      <AlertDialog open={!!deletingSchool} onOpenChange={(open) => {
        if (!open) {
          setDeletingSchool(null);
          setDeleteSchoolUsers(false);
        }
      }}>
        <AlertDialogContent data-testid="dialog-delete-school-confirmation" className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                Are you sure you want to delete <strong>{deletingSchool?.name}</strong>? This action cannot be undone and will permanently remove the school and all associated data.
              </div>
              
              {isLoadingSchoolUsers ? (
                <div className="text-sm text-gray-500">Loading school users...</div>
              ) : schoolUsersPreview && schoolUsersPreview.count > 0 ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Warning:</strong> This school has {schoolUsersPreview.count} associated user{schoolUsersPreview.count > 1 ? 's' : ''}.
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="text-sm font-medium mb-2">Associated Users:</div>
                    <ul className="space-y-1 text-sm">
                      {schoolUsersPreview.users.map((user) => (
                        <li key={user.id} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          <span>{user.name} ({user.email}) - {user.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="delete-school-users"
                      checked={deleteSchoolUsers}
                      onChange={(e) => setDeleteSchoolUsers(e.target.checked)}
                      className="mt-1"
                      data-testid="checkbox-delete-school-users"
                    />
                    <label htmlFor="delete-school-users" className="text-sm cursor-pointer">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Also delete all associated user accounts
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        If unchecked, the user accounts will remain in the system and can be reassigned to other schools. If checked, the users will be permanently deleted and won't be able to register again with the same email addresses.
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  This school has no associated users.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-school">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSchool && deleteSchoolMutation.mutate({ 
                schoolId: deletingSchool.id, 
                deleteUsers: deleteSchoolUsers 
              })}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteSchoolMutation.isPending}
              data-testid="button-confirm-delete-school"
            >
              {deleteSchoolMutation.isPending ? "Deleting..." : "Delete School"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Consent Rejection Dialog */}
      <AlertDialog open={photoConsentRejectDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setPhotoConsentRejectDialogOpen(false);
          setPhotoConsentRejectNotes('');
        }
      }}>
        <AlertDialogContent data-testid="dialog-reject-photo-consent">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Photo Consent</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide feedback explaining why the photo consent document is being rejected. This will help the school understand what needs to be corrected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Notes <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={photoConsentRejectNotes}
              onChange={(e) => setPhotoConsentRejectNotes(e.target.value)}
              placeholder="Explain why the document is being rejected and what needs to be corrected..."
              rows={4}
              data-testid="textarea-photo-consent-reject-notes"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject-photo-consent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!photoConsentRejectNotes.trim()) {
                  toast({
                    title: "Notes Required",
                    description: "Please provide rejection notes explaining why the document was rejected.",
                    variant: "destructive",
                  });
                  return;
                }
                if (viewingSchool?.id) {
                  rejectPhotoConsentMutation.mutate({ schoolId: viewingSchool.id, notes: photoConsentRejectNotes });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={!photoConsentRejectNotes.trim() || rejectPhotoConsentMutation.isPending}
              data-testid="button-confirm-reject-photo-consent"
            >
              {rejectPhotoConsentMutation.isPending ? "Rejecting..." : "Reject Document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
