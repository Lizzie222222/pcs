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
  MapPin
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

// Color palette for charts
const ANALYTICS_COLORS = ['#0B3D5D', '#019ADE', '#02BBB4', '#FFC557', '#FF595A', '#6B7280', '#10B981', '#8B5CF6'];

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
    country: resource?.country || '',
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

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
                    <SelectItem value="">Global (all countries)</SelectItem>
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
  const [selectedTab, setSelectedTab] = useState('overview');

  // Analytics queries
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview'],
    enabled: true
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress'],
    enabled: selectedTab === 'schools'
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence'],
    enabled: selectedTab === 'evidence'
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement'],
    enabled: selectedTab === 'users'
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

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="analytics-tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="schools" data-testid="analytics-tab-schools">Schools</TabsTrigger>
          <TabsTrigger value="evidence" data-testid="analytics-tab-evidence">Evidence</TabsTrigger>
          <TabsTrigger value="users" data-testid="analytics-tab-users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
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

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* School Progress Distribution */}
              {schoolProgressQuery.data && (
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
              )}

              {/* Monthly Registration Trend */}
              {schoolProgressQuery.data && (
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
              )}
            </div>

            {/* User Engagement and Evidence Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Role Distribution */}
              {userEngagementQuery.data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2 text-coral" />
                      User Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={userEngagementQuery.data.roleDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="role" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#FF595A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Evidence Submissions Overview */}
              {evidenceQuery.data && evidenceQuery.data.stageBreakdown && (
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
              )}
            </div>

            {/* Top Schools Table */}
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
        </TabsContent>

        <TabsContent value="schools">
          {schoolProgressQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stage Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>School Stage Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={schoolProgressQuery.data.stageDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
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

              {/* Progress Ranges */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="evidence">
          {evidenceQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stage Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Evidence by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={evidenceQuery.data.stageBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" stackId="a" fill="#02BBB4" name="Approved" />
                      <Bar dataKey="pending" stackId="a" fill="#FFC557" name="Pending" />
                      <Bar dataKey="rejected" stackId="a" fill="#FF595A" name="Rejected" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Review Turnaround */}
              <Card>
                <CardHeader>
                  <CardTitle>Review Turnaround Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          {userEngagementQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Role Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>User Role Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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

              {/* Active Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Users by Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'schools' | 'analytics' | 'resources' | 'case-studies'>('overview');
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
  const [bulkEvidenceDialogOpen, setBulkEvidenceDialogOpen] = useState(false);
  const [bulkSchoolDialogOpen, setBulkSchoolDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: 'approve' | 'reject' | 'delete' | 'update';
    notes?: string;
    updates?: Record<string, any>;
  } | null>(null);

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
                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-coral hover:bg-coral/90" data-testid="button-send-emails">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Emails
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Send Bulk Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Recipients</label>
                        <Select 
                          value={emailForm.recipientType} 
                          onValueChange={(value) => setEmailForm(prev => ({ ...prev, recipientType: value }))}
                        >
                          <SelectTrigger>
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
                          onValueChange={(value) => setEmailForm(prev => ({ ...prev, template: value }))}
                        >
                          <SelectTrigger>
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
                          <label className="block text-sm font-medium mb-2">Custom Recipients</label>
                          <Textarea
                            className="w-full p-2 border rounded-md h-24"
                            placeholder="Enter email addresses, one per line or separated by commas...\nexample@school.edu\nteacher@domain.com"
                            value={emailForm.recipients}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, recipients: e.target.value }))}
                            data-testid="textarea-custom-recipients"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter email addresses separated by commas or new lines.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">Subject</label>
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md"
                          placeholder="Enter email subject"
                          value={emailForm.subject}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                          data-testid="input-email-subject"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Email Content</label>
                        <textarea
                          className="w-full p-2 border rounded-md h-32"
                          placeholder="Enter your email content here..."
                          value={emailForm.content}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, content: e.target.value }))}
                          data-testid="textarea-email-content"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Content will be wrapped in the selected template design.
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setEmailDialogOpen(false)}
                          data-testid="button-cancel-email"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendBulkEmail}
                          disabled={!emailForm.subject || !emailForm.content || 
            (emailForm.recipientType === 'custom' && !emailForm.recipients.trim())}
                          className="bg-coral hover:bg-coral/90"
                          data-testid="button-send-bulk-email"
                        >
                          Send Email
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
                      <th className="text-left p-3 font-semibold text-navy w-12">Select</th>
                      <th className="text-left p-3 font-semibold text-navy">School Name</th>
                      <th className="text-left p-3 font-semibold text-navy">Country</th>
                      <th className="text-left p-3 font-semibold text-navy">Stage</th>
                      <th className="text-left p-3 font-semibold text-navy">Progress</th>
                      <th className="text-left p-3 font-semibold text-navy">Students</th>
                      <th className="text-left p-3 font-semibold text-navy">Joined</th>
                      <th className="text-left p-3 font-semibold text-navy">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools?.map((school) => (
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
                        <td className="p-3 text-gray-600">
                          {new Date(school.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setViewingSchool(school)}
                            data-testid={`button-view-${school.id}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <ResourcesManagement />
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
    </div>
  );
}
