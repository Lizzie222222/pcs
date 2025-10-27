import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCountries } from "@/hooks/useCountries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import UserManagementTab from "@/components/admin/UserManagementTab";
import ResourcesManagement from "@/components/admin/ResourcesManagement";
import ResourcePackManagement from "@/components/admin/ResourcePackManagement";
const AnalyticsContent = lazy(() => import("@/components/admin/AnalyticsContent"));
const CaseStudyManagement = lazy(() => import("@/components/admin/CaseStudyManagement"));
import EmailManagementSection from "@/components/admin/EmailManagementSection";
import ActivityLogsSection from "@/components/admin/activity-logs/ActivityLogsSection";
import EvidenceGalleryTab from "@/components/admin/EvidenceGalleryTab";
import PrintableFormsTab from "@/components/admin/PrintableFormsTab";
import DataImport from "@/components/admin/DataImport";
import ReviewsSection from "@/components/admin/reviews/ReviewsSection";
import SchoolsSection from '@/components/admin/schools/SchoolsSection';
import TeamsSection from '@/components/admin/teams/TeamsSection';
import EvidenceRequirementsSection from '@/components/admin/evidence-requirements/EvidenceRequirementsSection';
import EventsSection from '@/components/admin/events/EventsSection';
import pcsLogoUrl from "@assets/PSC Logo - Blue_1761334524895.png";
import type { 
  AdminStats, 
  PendingEvidence, 
  SchoolData, 
  VerificationRequest, 
  SchoolTeacher, 
  SchoolWithTeachers, 
  PendingAudit, 
  EvidenceRequirement, 
  EventWithRegistrations, 
  EventRegistrationWithDetails 
} from "@/components/admin/shared/types";

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

  // School filters state (shared between Schools and Email sections)
  const [schoolFilters, setSchoolFilters] = useState({
    search: '',
    country: 'all',
    stage: 'all',
    language: 'all',
  });

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

  // Fetch schools list for CaseStudyManagement
  const { data: schools = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/schools'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin) && activeTab === 'case-studies'),
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

  // Helper function to clean filters (remove 'all' values)
  const cleanFilters = (filters: typeof schoolFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
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
            schoolFilters={schoolFilters}
            setSchoolFilters={setSchoolFilters}
            countryOptions={countryOptions}
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
          <ActivityLogsSection
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
