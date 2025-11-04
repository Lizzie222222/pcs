import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCollaboration } from "@/hooks/useCollaboration";
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
  AlertTriangle,
  MessageSquare,
  Activity
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import UserManagementTab from "@/components/admin/UserManagementTab";
import ResourcesManagement from "@/components/admin/ResourcesManagement";
import ResourcePackManagement from "@/components/admin/ResourcePackManagement";
const AnalyticsContent = lazy(() => import("@/components/admin/AnalyticsContent"));
const CaseStudyManagement = lazy(() => import("@/components/admin/CaseStudyManagement"));
const ReviewsSection = lazy(() => import("@/components/admin/reviews/ReviewsSection"));
const SchoolsSection = lazy(() => import('@/components/admin/schools/SchoolsSection'));
const EventsSection = lazy(() => import('@/components/admin/events/EventsSection'));
const CertificatesSection = lazy(() => import('@/components/admin/CertificatesSection'));
import EmailManagementSection from "@/components/admin/EmailManagementSection";
import ActivityLogsSection from "@/components/admin/activity-logs/ActivityLogsSection";
import EvidenceGalleryTab from "@/components/admin/EvidenceGalleryTab";
import PrintableFormsTab from "@/components/admin/PrintableFormsTab";
import EvidenceImport from "@/components/admin/EvidenceImport";
import SchoolUserImport from "@/components/admin/SchoolUserImport";
import TeamsSection from '@/components/admin/teams/TeamsSection';
import EvidenceRequirementsSection from '@/components/admin/evidence-requirements/EvidenceRequirementsSection';
import SystemHealthTab from '@/components/admin/SystemHealthTab';
import CollaborationSidebar from '@/components/admin/CollaborationSidebar';
import ChatPanel from '@/components/admin/ChatPanel';
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
function AdminContent({ initialTab = 'overview' }: { initialTab?: 'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'resource-packs' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'activity' | 'system-health' | 'certificates' }) {
  const { t } = useTranslation('admin');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [location] = useLocation();
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'resource-packs' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'media-library' | 'data-import' | 'activity' | 'system-health' | 'certificates'>(initialTab);
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
  
  // Collaboration state
  const collaboration = useCollaboration();
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastReadChatCount, setLastReadChatCount] = useState(0);
  
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
    sortByDate: 'newest',
    joinedMonth: 'all',
    joinedYear: 'all',
    interactionStatus: 'all',
    completionStatus: 'all',
  });

  // Check for welcomed parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcomed') === 'true') {
      setShowWelcomeBanner(true);
    }
  }, [location]);

  // Send presence updates when activeTab changes
  useEffect(() => {
    if (collaboration.connectionState === 'connected') {
      let activity: 'idle' | 'viewing_dashboard' | 'reviewing_evidence' | 'editing_case_study' | 'editing_event' | 'managing_schools' | 'managing_users' | 'managing_resources' = 'idle';
      
      switch (activeTab) {
        case 'overview':
          activity = 'viewing_dashboard';
          break;
        case 'reviews':
          activity = 'reviewing_evidence';
          break;
        case 'case-studies':
          activity = 'editing_case_study';
          break;
        case 'events':
          activity = 'editing_event';
          break;
        case 'schools':
        case 'teams':
          activity = 'managing_schools';
          break;
        case 'users':
        case 'activity':
          activity = 'managing_users';
          break;
        case 'resources':
        case 'resource-packs':
          activity = 'managing_resources';
          break;
        default:
          activity = 'idle';
      }
      
      console.log(`[Admin] Sending presence update: ${activity} (tab: ${activeTab})`);
      collaboration.sendPresenceUpdate(activity, user?.id);
    }
  }, [activeTab, collaboration.connectionState, collaboration.sendPresenceUpdate, user?.id]);

  // Track unread chat messages
  useEffect(() => {
    const newMessages = collaboration.chatMessages.length - lastReadChatCount;
    if (newMessages > 0 && !chatPanelOpen) {
      setUnreadChatCount(prev => prev + newMessages);
    }
    setLastReadChatCount(collaboration.chatMessages.length);
  }, [collaboration.chatMessages.length, chatPanelOpen, lastReadChatCount]);

  // Reset unread count when chat panel opens
  const handleChatPanelOpen = (open: boolean) => {
    setChatPanelOpen(open);
    if (open) {
      setUnreadChatCount(0);
    }
  };

  // Update tab title with unread count
  useEffect(() => {
    const originalTitle = document.title;
    
    if (unreadChatCount > 0) {
      document.title = `(${unreadChatCount}) PCS Admin`;
    } else {
      document.title = 'PCS Admin';
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [unreadChatCount]);

  // Redirect if not authenticated or not admin/partner (but only after loading completes)
  useEffect(() => {
    console.log('Admin page - access check:', {
      isLoading,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin } : null,
      hasAdminAccess: user?.role === 'admin' || user?.role === 'partner' || user?.isAdmin
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
    
    // Now check if user has admin or partner access
    if (!isAuthenticated || !(user?.role === 'admin' || user?.role === 'partner' || user?.isAdmin)) {
      console.log('Admin page: Access denied, redirecting to /');
      toast({
        title: t('toasts.access_denied'),
        description: t('toasts.access_denied_desc'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
    
    console.log('Admin page: Access granted');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user]);

  // Combined dashboard data query - fetches stats, audits, and photo consent in one call
  const { data: dashboardData, error: dashboardError } = useQuery<{
    stats: AdminStats;
    pendingAudits: PendingAudit[];
    pendingPhotoConsent: Array<{
      id: string;
      name: string;
      country: string;
      photoConsentDocumentUrl: string | null;
      photoConsentUploadedAt: Date | null;
      photoConsentStatus: string | null;
    }>;
  }>({
    queryKey: ['/api/admin/dashboard-data'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.role === 'partner' || user?.isAdmin)),
    retry: false,
  });

  // Destructure for backwards compatibility
  const stats = dashboardData?.stats;
  const statsError = dashboardError;
  const pendingAudits = dashboardData?.pendingAudits || [];
  const pendingPhotoConsent = dashboardData?.pendingPhotoConsent || [];

  // Fetch schools list for CaseStudyManagement
  const { data: schools = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/schools'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.role === 'partner' || user?.isAdmin) && activeTab === 'case-studies'),
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (dashboardError && isUnauthorizedError(dashboardError as Error)) {
      toast({
        title: t('toasts.session_expired'),
        description: t('toasts.session_expired_desc'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 500);
    }
  }, [dashboardError, toast, t]);

  // Resources queries (used by EvidenceRequirementsSection and EventsSection)
  // Only load when these tabs are active to improve initial dashboard load time
  const { data: allResources = [], isLoading: resourcesLoading } = useQuery<any[]>({
    queryKey: ['/api/resources'],
    enabled: activeTab === 'evidence-requirements' || activeTab === 'events',
  });
  // Photo consent mutations (shared with Reviews and Schools)
  const approvePhotoConsentMutation = useMutation({
    mutationFn: async ({ schoolId, notes }: { schoolId: string; notes: string }) => {
      return await apiRequest('PATCH', `/api/schools/${schoolId}/photo-consent/approve`, { notes });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/photo-consent/pending'] });
      
      // Snapshot the previous value for rollback
      const previousPending = queryClient.getQueryData(['/api/admin/photo-consent/pending']);
      
      // Optimistically remove school from pending photo consent list
      queryClient.setQueryData(['/api/admin/photo-consent/pending'], (old: any[] = []) => {
        return old.filter(school => school.id !== variables.schoolId);
      });
      
      // Return context with snapshot for potential rollback
      return { previousPending };
    },
    onSuccess: () => {
      toast({
        title: t('toasts.photoConsentApproved.title'),
        description: t('toasts.photoConsentApproved.description'),
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(['/api/admin/photo-consent/pending'], context.previousPending);
      }
      toast({
        title: t('toasts.photoConsentApprovalFailed.title'),
        description: error.message || t('toasts.photoConsentApprovalFailed.description'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photo-consent/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      // Invalidate evidence queries so photo consent status updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
    },
  });

  const rejectPhotoConsentMutation = useMutation({
    mutationFn: async ({ schoolId, notes }: { schoolId: string; notes: string }) => {
      return await apiRequest('PATCH', `/api/schools/${schoolId}/photo-consent/reject`, { notes });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['/api/admin/photo-consent/pending'] });
      
      // Snapshot the previous value for rollback
      const previousPending = queryClient.getQueryData(['/api/admin/photo-consent/pending']);
      
      // Optimistically remove school from pending photo consent list
      queryClient.setQueryData(['/api/admin/photo-consent/pending'], (old: any[] = []) => {
        return old.filter(school => school.id !== variables.schoolId);
      });
      
      // Return context with snapshot for potential rollback
      return { previousPending };
    },
    onSuccess: () => {
      setPhotoConsentRejectDialogOpen(false);
      setPhotoConsentRejectNotes('');
      toast({
        title: t('toasts.photoConsentRejected.title'),
        description: t('toasts.photoConsentRejected.description'),
      });
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousPending) {
        queryClient.setQueryData(['/api/admin/photo-consent/pending'], context.previousPending);
      }
      toast({
        title: t('toasts.photoConsentRejectionFailed.title'),
        description: error.message || t('toasts.photoConsentRejectionFailed.description'),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency (surgical invalidation)
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photo-consent/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      // Invalidate evidence queries so photo consent status updates immediately
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
    },
  });

  // Weekly digest mutation
  const sendWeeklyDigestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/admin/send-weekly-digest', {});
    },
    onSuccess: (data: any) => {
      toast({
        title: t('toasts.weeklyDigestSent.title'),
        description: t('toasts.weeklyDigestSent.description', { 
          sent: data.results?.sent || 0,
          total: data.results?.totalRecipients || 0
        }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toasts.weeklyDigestFailed.title'),
        description: error.message || t('toasts.weeklyDigestFailed.description'),
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
        title: t('export.toasts.success.title'),
        description: t('export.toasts.success.description', { type, format: exportFormat.toUpperCase() }),
      });
    } catch (error) {
      toast({
        title: t('export.toasts.failed.title'),
        description: t('export.toasts.failed.description'),
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
        title: t('email.toasts.emailsSent.title'),
        description: t('email.toasts.emailsSent.description', { 
          sent: result.results.sent, 
          failedText: result.results.failed > 0 ? `, ${result.results.failed} failed` : ''
        }),
      });
      
      return result;
    } catch (error) {
      toast({
        title: t('email.toasts.bulkEmailFailed.title'),
        description: t('email.toasts.bulkEmailFailed.description'),
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
          <p className="mt-4 text-gray-600">{t('loading.dashboard')}</p>
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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
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
                        {t('welcomeBanner.title')}
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
                      {t('welcomeBanner.greeting')}
                    </p>
                    <p className="text-white/90">
                      {t('welcomeBanner.description')}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Header */}
        <Card className="mb-4 sm:mb-6 lg:mb-8">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-navy truncate" data-testid="text-admin-title">
                  {t('header.title')}
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  {t('header.subtitle')}
                </p>
              </div>
              <div className="flex gap-2 sm:gap-4 flex-shrink-0">
                {!isPartner && (
                  <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="min-h-11 text-xs sm:text-sm px-3 sm:px-4" data-testid="button-export-data">
                        <Download className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('export.buttonLabel')}</span>
                        <span className="sm:hidden">Export</span>
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('export.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-gray-600 mb-3">{t('export.description')}</p>
                        <Select value={exportFormat} onValueChange={(value: 'csv' | 'excel') => setExportFormat(value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('export.selectFormatPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">{t('export.formats.csv')}</SelectItem>
                            <SelectItem value="excel">{t('export.formats.excel')}</SelectItem>
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
                          {t('export.buttons.exportSchools')}
                          {activeTab === 'schools' && <span className="text-xs ml-2">{t('export.buttons.withCurrentFilters')}</span>}
                        </Button>
                        <Button 
                          onClick={() => handleExport('evidence')} 
                          className="justify-start"
                          data-testid="button-export-evidence"
                        >
                          <Trophy className="h-4 w-4 mr-2" />
                          {t('export.buttons.exportEvidence')}
                        </Button>
                        <Button 
                          onClick={() => handleExport('users')} 
                          className="justify-start"
                          data-testid="button-export-users"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          {t('export.buttons.exportUsers')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
                
                {/* Send Weekly Digest Button */}
                {!isPartner && (
                  <Button
                    onClick={() => sendWeeklyDigestMutation.mutate()}
                    disabled={sendWeeklyDigestMutation.isPending}
                    variant="outline"
                    className="min-h-11 text-xs sm:text-sm px-3 sm:px-4"
                    data-testid="button-send-digest"
                  >
                    <Mail className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {sendWeeklyDigestMutation.isPending ? t('weeklyDigest.sending') : t('weeklyDigest.buttonLabel')}
                    </span>
                    <span className="sm:hidden">
                      {sendWeeklyDigestMutation.isPending ? '...' : 'Digest'}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs - Two Tier Structure */}
        <div className="flex overflow-x-auto space-x-1 bg-gray-200 p-1 rounded-lg mb-4 sm:mb-6 lg:mb-8 scrollbar-hide -mx-2 px-2 sm:mx-0">
          {/* Dashboard - No dropdown */}
          <button
            className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-11 ${
              activeTab === 'overview' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-dashboard"
          >
            {t('tabs.dashboard')}
          </button>

          {/* Schools - Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 min-h-11 ${
                  ['schools', 'teams', 'users', 'certificates', 'activity', 'data-import'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-schools"
              >
                {t('tabs.schools')}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem 
                onClick={() => setActiveTab('schools')}
                className={activeTab === 'schools' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-schools"
              >
                {t('navigation.manageSchools')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('teams')}
                className={activeTab === 'teams' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-teams"
              >
                {t('navigation.manageTeams')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('certificates')}
                className={activeTab === 'certificates' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-certificates"
              >
                Certificates
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-users"
              >
                {t('navigation.userManagement')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('activity')}
                className={activeTab === 'activity' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-activity"
              >
                {t('navigation.userActivity')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setActiveTab('data-import')}
                className={activeTab === 'data-import' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-data-import"
              >
                {t('navigation.importData')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Content - Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 min-h-11 ${
                  ['resources', 'resource-packs', 'case-studies', 'events', 'media-library'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-content"
              >
                {t('tabs.content')}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem 
                onClick={() => setActiveTab('resources')}
                className={activeTab === 'resources' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-resources"
              >
                {t('navigation.manageResources')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('resource-packs')}
                className={activeTab === 'resource-packs' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-resource-packs"
              >
                {t('navigation.manageResourcePacks')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('case-studies')}
                className={activeTab === 'case-studies' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-case-studies"
              >
                {t('navigation.createCaseStudies')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('events')}
                className={activeTab === 'events' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-events"
              >
                {t('navigation.manageEvents')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('media-library')}
                className={activeTab === 'media-library' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-evidence-gallery"
              >
                {t('navigation.evidenceGallery')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Review Queue - Top Level Tab */}
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3 sm:px-4 py-3 sm:py-2 rounded-md text-sm font-medium transition-colors relative whitespace-nowrap flex-shrink-0 min-h-11 ${
              activeTab === 'reviews' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            data-testid="tab-reviews"
          >
            {t('tabs.reviewQueue')}
            {((stats && stats.pendingEvidence > 0) || pendingAudits.length > 0 || pendingPhotoConsent.length > 0) && (
              <span 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center"
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
                className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 relative whitespace-nowrap flex-shrink-0 min-h-11 ${
                  ['evidence-requirements', 'printable-forms'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-program"
              >
                {t('tabs.program')}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem 
                onClick={() => setActiveTab('evidence-requirements')}
                className={activeTab === 'evidence-requirements' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-evidence-requirements"
              >
                {t('navigation.setEvidenceRequirements')}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('printable-forms')}
                className={activeTab === 'printable-forms' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-printable-forms"
              >
                {t('navigation.reviewPrintableForms')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Communications - No dropdown */}
          <button
            className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-11 ${
              activeTab === 'email-test' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('email-test')}
            data-testid="tab-communications"
          >
            {t('tabs.communications')}
          </button>

          {/* System Health - No dropdown */}
          <button
            className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-11 flex items-center gap-2 ${
              activeTab === 'system-health' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('system-health')}
            data-testid="tab-system-health"
          >
            <Activity className="w-4 h-4" />
            System Health
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
              <AnalyticsContent activeTab={activeTab} />
            </Suspense>
          </div>
        )}


        {/* Review Queue Tab */}
        {activeTab === 'reviews' && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
            </div>
          }>
            <ReviewsSection 
              activeTab={activeTab} 
              stats={stats}
              approvePhotoConsentMutation={approvePhotoConsentMutation}
              rejectPhotoConsentMutation={rejectPhotoConsentMutation}
            />
          </Suspense>
        )}

        {/* Schools Tab */}
        {activeTab === 'schools' && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
            </div>
          }>
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
          </Suspense>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && <TeamsSection activeTab={activeTab} />}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <Suspense fallback={<LoadingSpinner />}>
            <CertificatesSection activeTab={activeTab} />
          </Suspense>
        )}

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

        {/* Data Import Tab - with tabs for Schools/Users and Evidence */}
        {activeTab === 'data-import' && (
          <div className="space-y-6">
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="evidence" data-testid="tab-evidence-import">Evidence Approval Import</TabsTrigger>
                <TabsTrigger value="schools-users" data-testid="tab-schools-users-import">Schools & Users Import</TabsTrigger>
              </TabsList>
              <TabsContent value="evidence" className="mt-6">
                <EvidenceImport />
              </TabsContent>
              <TabsContent value="schools-users" className="mt-6">
                <SchoolUserImport />
              </TabsContent>
            </Tabs>
          </div>
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
          <Suspense fallback={<LoadingSpinner message={t('loading.caseStudies')} />}>
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
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full" />
            </div>
          }>
            <EventsSection 
              allResources={allResources}
              resourcesLoading={resourcesLoading}
              activeTab={activeTab}
            />
          </Suspense>
        )}

        {/* Printable Forms Tab */}
        {activeTab === 'printable-forms' && <PrintableFormsTab />}

        {/* Evidence Gallery Tab */}
        {activeTab === 'media-library' && <EvidenceGalleryTab />}

        {/* System Health Tab */}
        {activeTab === 'system-health' && <SystemHealthTab />}
      </div>

      {/* Collaboration Components */}
      {(user?.role === 'admin' || user?.role === 'partner' || user?.isAdmin) && (
        <>
          <CollaborationSidebar />
          
          <ChatPanel 
            open={chatPanelOpen}
            onOpenChange={handleChatPanelOpen}
            unreadCount={unreadChatCount}
            onMessagesRead={() => setUnreadChatCount(0)}
          />

          {/* Floating Admin Chat Button */}
          <Button
            onClick={() => setChatPanelOpen(true)}
            className="fixed bottom-24 right-6 z-30 w-14 h-14 rounded-full shadow-lg bg-pcs_blue hover:bg-pcs_blue/90"
            data-testid="button-open-admin-chat"
          >
            <MessageSquare className="h-6 w-6" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

export default function Admin({ initialTab = 'overview' }: { initialTab?: 'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'resource-packs' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'activity' } = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab') as 'overview' | 'reviews' | 'schools' | 'teams' | 'resources' | 'resource-packs' | 'case-studies' | 'users' | 'email-test' | 'evidence-requirements' | 'events' | 'printable-forms' | 'activity' | null;
  
  const effectiveInitialTab = tabFromUrl || initialTab;
  
  return <AdminContent initialTab={effectiveInitialTab} />;
}
