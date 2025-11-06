import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProgressTracker from "@/components/ProgressTracker";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { WelcomeModal } from "@/components/WelcomeModal";
import { InteractiveTour } from "@/components/InteractiveTour";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Upload, 
  BookOpen, 
  Users, 
  BarChart3, 
  CheckCircle,
  Clock,
  Calendar,
  Award,
  MapPin,
  AlertCircle,
  Trash2,
  Lightbulb,
  Target,
  Leaf,
  TrendingDown,
  Edit,
  Plus,
  X,
  Download,
  FileText,
  Video
} from "lucide-react";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import { MigratedUserNotice } from "@/components/MigratedUserNotice";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PLASTIC_ITEM_WEIGHTS, calculateAggregateMetrics } from "@/../../shared/plasticMetrics";
import type { ReductionPromise, InsertReductionPromise, AuditResponse } from "@/../../shared/schema";
import { LANGUAGE_FLAG_MAP, languageCodeFromName } from "@/lib/languageUtils";

// Lazy load heavy components
const EventsSection = lazy(() => import("@/components/dashboard/EventsSection"));
const EventNotificationBanner = lazy(() => import("@/components/dashboard/EventNotificationBanner"));
const ResourceNotificationBanner = lazy(() => import("@/components/dashboard/ResourceNotificationBanner"));
const PhotoConsentBanner = lazy(() => import("@/components/PhotoConsentBanner").then(module => ({ default: module.PhotoConsentBanner })));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));

// Helper function to convert GCS URLs to proxy URLs for CORS support
function getProxyUrl(url: string | null): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const pathname = decodeURIComponent(urlObj.pathname);
    
    const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
    if (privateUploadsMatch) {
      return `/objects/uploads/${privateUploadsMatch[1]}`;
    }
    
    const publicMatch = pathname.match(/\/public\/(.+)$/);
    if (publicMatch) {
      return `/objects/public/${publicMatch[1]}`;
    }
    
    if (url.startsWith('/objects/')) {
      return url;
    }
    
    return url;
  } catch {
    return url;
  }
}

interface Certificate {
  id: string;
  certificateNumber: string;
  title: string;
  completedDate: string;
  issuedDate: string;
  stage: string;
  metadata?: {
    round: number;
    achievements?: {
      inspire?: number;
      investigate?: number;
      act?: number;
    };
  };
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string | null;
  language: string | null;
  languages: string[] | null;
  country: string | null;
  resourceType: string | null;
  theme: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  downloadCount: number;
  visibility: 'public' | 'private';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  school: {
    id: string;
    name: string;
    country: string;
    type?: string;
    primaryLanguage?: string | null;
    currentStage: string;
    progressPercentage: number;
    inspireCompleted: boolean;
    investigateCompleted: boolean;
    actCompleted: boolean;
    awardCompleted: boolean;
    currentRound?: number;
    roundsCompleted?: number;
  };
  recentEvidence: Array<{
    id: string;
    title: string;
    stage: string;
    status: string;
    submittedAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
    reviewer?: {
      id: string | null;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }>;
  evidenceCounts: {
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean };
    act: { total: number; approved: number };
  };
}

// Component for resource thumbnails
const ResourceThumbnail = ({ resource }: { resource: Resource }) => {
  const fileType = resource.fileType?.toLowerCase() || '';
  
  // Image files
  if (fileType.includes('image')) {
    const imageProxyUrl = getProxyUrl(resource.fileUrl);
    return (
      <div className="w-full h-40 bg-gray-100 relative overflow-hidden rounded-t-lg">
        <img 
          src={imageProxyUrl} 
          alt={resource.title}
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-pcs_blue/10 to-teal/10"><svg class="h-12 w-12 text-pcs_blue/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
            }
          }}
        />
      </div>
    );
  }
  
  // PDF files
  if (fileType.includes('pdf')) {
    const pdfProxyUrl = getProxyUrl(resource.fileUrl);
    return (
      <div className="w-full h-40 bg-gray-100 flex items-center justify-center rounded-t-lg overflow-hidden">
        <PDFThumbnail url={pdfProxyUrl} className="w-full h-full" />
      </div>
    );
  }
  
  // Video files
  if (fileType.includes('video')) {
    return (
      <div className="w-full h-40 bg-gradient-to-br from-coral/10 to-orange/10 flex items-center justify-center rounded-t-lg">
        <Video className="h-12 w-12 text-coral/30" />
      </div>
    );
  }
  
  // Other file types
  return (
    <div className="w-full h-40 bg-gradient-to-br from-pcs_blue/10 to-teal/10 flex items-center justify-center rounded-t-lg">
      <FileText className="h-12 w-12 text-pcs_blue/30" />
    </div>
  );
};

export default function Home() {
  const { t } = useTranslation('dashboard');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [preSelectedStage, setPreSelectedStage] = useState<'inspire' | 'investigate' | 'act' | 'above_and_beyond' | undefined>(undefined);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<string | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedEvidenceNotifications');
    return stored ? JSON.parse(stored) : [];
  });
  const [dismissedPromiseNotification, setDismissedPromiseNotification] = useState<boolean>(() => {
    const stored = localStorage.getItem('dismissedPromiseNotification');
    return stored === 'true';
  });
  const [activeTab, setActiveTab] = useState<'progress' | 'resources' | 'team' | 'promises' | 'events'>('progress');
  const [deletePromiseDialogOpen, setDeletePromiseDialogOpen] = useState(false);
  const [promiseToDelete, setPromiseToDelete] = useState<string | null>(null);
  const [editPromiseDialogOpen, setEditPromiseDialogOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState<ReductionPromise | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [hasAttemptedOnboarding, setHasAttemptedOnboarding] = useState<boolean>(() => {
    const stored = sessionStorage.getItem('hasAttemptedOnboarding');
    return stored === 'true';
  });
  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(() => {
    const stored = localStorage.getItem('hasCompletedTour');
    return stored === 'true';
  });
  const isManualTourTrigger = useRef(false);

  // Redirect admins and partners to admin dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && (user?.isAdmin || user?.role === 'partner')) {
      setLocation("/admin");
      return;
    }
  }, [isAuthenticated, isLoading, user, setLocation]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('welcome.unauthorized_title'),
        description: t('welcome.unauthorized_message'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/auth/google";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Safeguard: Prevent tour from showing automatically if already completed
  // (but allow manual restarts via the "Restart Tour" button)
  useEffect(() => {
    if (showTour && hasCompletedTour && !isManualTourTrigger.current) {
      console.log('[Tour] Blocking auto-trigger - tour already completed');
      setShowTour(false);
    }
  }, [showTour, hasCompletedTour]);

  const { data: dashboardData, isLoading: isDashboardLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated && !user?.isAdmin && user?.role !== 'partner',
    retry: false,
  });

  const { data: certificates = [] } = useQuery<Certificate[]>({
    queryKey: ['/api/schools', dashboardData?.school?.id, 'certificates'],
    enabled: !!dashboardData?.school?.id,
    retry: false,
  });

  // Fetch upcoming events for new events badge
  const { data: upcomingEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/events/upcoming'],
    enabled: isAuthenticated,
  });

  // Calculate count of new events
  const newEventsCount = upcomingEvents.filter(event => {
    if (!user?.lastViewedEventsAt) return true; // All events are new if never viewed
    const lastViewed = new Date(user.lastViewedEventsAt);
    const eventCreated = new Date(event.createdAt || event.startDateTime);
    return eventCreated > lastViewed;
  }).length;

  // Fetch school audit for promise notification check
  const { data: schoolAudit } = useQuery<AuditResponse>({
    queryKey: ['/api/audits/school', dashboardData?.school?.id],
    enabled: !!dashboardData?.school?.id,
    retry: false,
  });

  // Fetch promises for audit (to check if missing)
  const { data: auditPromises } = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/audit', schoolAudit?.id],
    enabled: !!schoolAudit?.id && (schoolAudit.status === 'submitted' || schoolAudit.status === 'approved'),
    retry: false,
  });

  // Fetch evidence requirements to find "Action Plan Development"
  const { data: evidenceRequirements = [] } = useQuery<any[]>({
    queryKey: ['/api/evidence-requirements'],
    enabled: !!dashboardData?.school?.id,
    retry: false,
  });

  // Find the Action Plan Development requirement
  const actionPlanRequirement = evidenceRequirements.find(req => 
    req.title.includes("Action Plan Development") && req.stage === 'investigate'
  );

  // Fetch action plan evidence if we have the requirement ID
  const { data: actionPlanEvidence } = useQuery<any[]>({
    queryKey: [`/api/evidence/requirement/${actionPlanRequirement?.id}/school/${dashboardData?.school?.id}`],
    enabled: !!actionPlanRequirement?.id && !!dashboardData?.school?.id,
    retry: false,
  });

  // Fetch all promises for school via audit (for Our Action Plan tab)
  // Using audit endpoint instead of school endpoint to avoid permission issues
  const { data: schoolPromises = [], isLoading: promisesLoading } = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/audit', schoolAudit?.id],
    enabled: activeTab === 'promises' && !!schoolAudit?.id,
    retry: false,
  });

  // Fetch "above and beyond" evidence for the school
  const { data: allEvidence = [] } = useQuery<any[]>({
    queryKey: ['/api/evidence', { schoolId: dashboardData?.school?.id }],
    enabled: activeTab === 'progress' && !!dashboardData?.school?.id,
    retry: false,
  });

  // Filter for "above and beyond" evidence
  const aboveAndBeyondEvidence = allEvidence.filter(ev => ev.stage === 'above_and_beyond');

  // Fetch resources for the resources tab
  const { data: allResources = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ['/api/resources?limit=50'],
    enabled: activeTab === 'resources',
    retry: false,
  });

  // Sort resources by relevance to school's current stage and language
  const sortedResources = (() => {
    if (!dashboardData?.school || !allResources.length) return [];
    
    const school = dashboardData.school;
    const schoolLangCode = school.primaryLanguage ? languageCodeFromName(school.primaryLanguage) : null;
    
    // Calculate relevance score for each resource
    const resourcesWithScores = allResources.map(resource => {
      let score = 0;
      
      // +100 points if stage matches school's current stage
      if (resource.stage === school.currentStage) {
        score += 100;
      }
      
      // +50 points if resource language matches school's primary language
      if (schoolLangCode && resource.languages && resource.languages.length > 0) {
        const resourceLangCodes = resource.languages
          .map(lang => languageCodeFromName(lang) || lang.toLowerCase())
          .filter(Boolean);
        
        if (resourceLangCodes.includes(schoolLangCode)) {
          score += 50;
        }
      }
      
      return { resource, score };
    });
    
    // Sort by score (highest first), then by createdAt (newest first)
    resourcesWithScores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.resource.createdAt).getTime() - new Date(a.resource.createdAt).getTime();
    });
    
    // Take top scored resources
    const topResources = resourcesWithScores.slice(0, 9).map(item => item.resource);
    
    // If we have fewer than 6 resources, backfill with random ones
    if (topResources.length < 6 && allResources.length > topResources.length) {
      const remainingResources = allResources.filter(
        r => !topResources.find(tr => tr.id === r.id)
      );
      
      // Shuffle and take enough to reach 6
      const shuffled = [...remainingResources].sort(() => Math.random() - 0.5);
      const needed = Math.min(6 - topResources.length, shuffled.length);
      topResources.push(...shuffled.slice(0, needed));
    }
    
    return topResources;
  })();

  // Delete evidence mutation
  const deleteMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      return apiRequest('DELETE', `/api/evidence/${evidenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence'] });
      toast({
        title: t('evidence.delete_success'),
        variant: "default",
      });
      setDeleteDialogOpen(false);
      setEvidenceToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t('evidence.delete_error'),
        description: error?.message || t('errors.unexpected_error'),
        variant: "destructive",
      });
      setDeleteDialogOpen(false);
      setEvidenceToDelete(null);
    },
  });

  const handleDeleteClick = (evidenceId: string) => {
    setEvidenceToDelete(evidenceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (evidenceToDelete) {
      deleteMutation.mutate(evidenceToDelete);
    }
  };

  const dismissNotification = (evidenceId: string) => {
    const updated = [...dismissedNotifications, evidenceId];
    setDismissedNotifications(updated);
    localStorage.setItem('dismissedEvidenceNotifications', JSON.stringify(updated));
  };

  const dismissPromiseNotification = () => {
    setDismissedPromiseNotification(true);
    localStorage.setItem('dismissedPromiseNotification', 'true');
  };

  // Update promise mutation (for editing existing promises before approval)
  const updatePromiseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertReductionPromise> }) => {
      return apiRequest('PATCH', `/api/reduction-promises/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit', schoolAudit?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'audit-analytics'] });
      toast({
        title: t('toasts.success', { ns: 'dashboard' }),
        description: t('toasts.promise_updated', { ns: 'dashboard' }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('toasts.error', { ns: 'dashboard' }),
        description: error?.message || t('toasts.promise_update_failed', { ns: 'dashboard' }),
        variant: "destructive",
      });
    },
  });

  // Delete promise mutation
  const deletePromiseMutation = useMutation({
    mutationFn: async (promiseId: string) => {
      return apiRequest('DELETE', `/api/reduction-promises/${promiseId}`);
    },
    onSuccess: () => {
      // Invalidate audit-based query and analytics
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit', schoolAudit?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'audit-analytics'] });
      toast({
        title: t('toasts.success', { ns: 'dashboard' }),
        description: t('toasts.promise_deleted', { ns: 'dashboard' }),
      });
      setDeletePromiseDialogOpen(false);
      setPromiseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t('toasts.error', { ns: 'dashboard' }),
        description: error?.message || t('toasts.promise_delete_failed', { ns: 'dashboard' }),
        variant: "destructive",
      });
      setDeletePromiseDialogOpen(false);
      setPromiseToDelete(null);
    },
  });

  // Mark onboarding complete mutation
  const markOnboardingCompleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/onboarding-complete');
    },
    onSuccess: () => {
      // Optimistically update the cache to reflect onboarding complete
      queryClient.setQueryData(['/api/auth/user'], (oldData: any) => {
        if (oldData?.user) {
          return { ...oldData, user: { ...oldData.user, hasSeenOnboarding: true } };
        }
        return oldData;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: () => {
      // Keep the modal closed even if API fails - user can still use the app
      toast({
        title: t('toasts.notice', { ns: 'dashboard' }),
        description: t('toasts.onboarding_save_failed', { ns: 'dashboard' }),
        variant: "default",
      });
    },
  });

  // Show welcome modal on first login only
  useEffect(() => {
    // Only show modal if:
    // 1. User exists and hasn't seen onboarding
    // 2. Haven't attempted to show it in this session
    // 3. Dashboard data is loaded
    // 4. All loading states are complete
    if (user && !user.hasSeenOnboarding && !hasAttemptedOnboarding && dashboardData && !isLoading && !isDashboardLoading) {
      console.log('[Welcome Modal] Showing welcome modal - first time onboarding');
      setShowWelcomeModal(true);
      setHasAttemptedOnboarding(true);
      sessionStorage.setItem('hasAttemptedOnboarding', 'true');
    }
  }, [user?.hasSeenOnboarding, hasAttemptedOnboarding, isLoading, isDashboardLoading]);

  const handleWelcomeModalClose = () => {
    console.log('[Welcome Modal] Closing welcome modal');
    setShowWelcomeModal(false);
    setHasAttemptedOnboarding(true);
    sessionStorage.setItem('hasAttemptedOnboarding', 'true');
    markOnboardingCompleteMutation.mutate();
  };

  const handleStartTour = () => {
    // Only start tour if user hasn't completed it before
    console.log('[Tour] handleStartTour called - hasCompletedTour:', hasCompletedTour);
    if (!hasCompletedTour) {
      console.log('[Tour] Starting tour via handleStartTour');
      setShowTour(true);
    } else {
      console.log('[Tour] Tour already completed, not starting');
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    setHasCompletedTour(true);
    localStorage.setItem('hasCompletedTour', 'true');
    isManualTourTrigger.current = false;
  };

  const handleTourSkip = () => {
    setShowTour(false);
    setHasCompletedTour(true);
    localStorage.setItem('hasCompletedTour', 'true');
    isManualTourTrigger.current = false;
  };

  const handleRestartTour = () => {
    // Allow manual restart regardless of completion status
    console.log('[Tour] Manual restart triggered');
    isManualTourTrigger.current = true;
    setShowTour(true);
  };

  const handleEditPromiseClick = (promise: ReductionPromise) => {
    setEditingPromise(promise);
    setEditPromiseDialogOpen(true);
  };

  const handleEditPromiseSubmit = (data: { baselineQuantity: number; targetQuantity: number; notes?: string }) => {
    if (!editingPromise) return;
    
    updatePromiseMutation.mutate({
      id: editingPromise.id,
      data: {
        baselineQuantity: data.baselineQuantity,
        targetQuantity: data.targetQuantity,
        notes: data.notes || "",
      },
    });
    setEditPromiseDialogOpen(false);
    setEditingPromise(null);
  };

  const handleDeletePromiseClick = (promiseId: string) => {
    setPromiseToDelete(promiseId);
    setDeletePromiseDialogOpen(true);
  };

  const handleDeletePromiseConfirm = () => {
    if (promiseToDelete) {
      deletePromiseMutation.mutate(promiseToDelete);
    }
  };

  // Redirect to action plan evidence requirement
  const handleAddActionPlan = () => {
    setActiveTab('progress');
    // Scroll to action plan requirement after tab switches
    setTimeout(() => {
      const actionPlanCard = document.querySelector('[data-requirement-id="' + actionPlanRequirement?.id + '"]');
      if (actionPlanCard) {
        actionPlanCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Handler to open evidence form for "Above and Beyond" submissions
  const handleAboveAndBeyondSubmit = () => {
    setPreSelectedStage('above_and_beyond');
    setShowEvidenceForm(true);
  };


  // Handle errors (unauthorized and no school registration)
  useEffect(() => {
    if (error) {
      const errorMessage = (error as any)?.message || '';
      
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t('welcome.unauthorized_title'),
          description: t('welcome.unauthorized_message'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/auth/google";
        }, 500);
      } else if (errorMessage.includes("No schools found for user")) {
        // Handle specific case where user needs to register their school
        if (!isRedirecting) {
          setIsRedirecting(true);
          toast({
            title: t('welcome.school_registration_required'),
            description: t('welcome.school_registration_message'),
          });
          setTimeout(() => {
            setLocation("/register");
          }, 1000);
        }
      }
    }
  }, [error, toast, isRedirecting, setLocation]);

  if (isLoading || isDashboardLoading) {
    return <LoadingSpinner message={t('welcome.loading_dashboard')} />;
  }

  // Handle case where user is being redirected to registration
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <h2 className="text-xl font-semibold text-navy mb-2" data-testid="text-redirecting-title">
                {t('welcome.redirecting_title')}
              </h2>
              <p className="text-gray-600" data-testid="text-redirecting-description">
                {t('welcome.redirecting_message')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle general errors (excluding "No schools found for user" which is handled above)
  if (error) {
    const errorMessage = (error as any)?.message || t('errors.unexpected_error');
    // Don't show error state for "No schools found for user" since we handle that above
    if (!errorMessage.includes("No schools found for user")) {
      return <ErrorState error={errorMessage} />;
    }
  }

  // Handle case where no data is available yet (still loading or error was "No schools found for user")
  if (!dashboardData) {
    return <LoadingSpinner message={t('welcome.loading_dashboard')} />;
  }

  const { school, recentEvidence, evidenceCounts } = dashboardData;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue';
      case 'investigate': return 'bg-teal';
      case 'act': return 'bg-coral';
      case 'above_and_beyond': return 'bg-purple-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Determine resource URLs based on school type and current language
  const isPrimary = !school.type || school.type === 'primary';
  const currentLanguage = i18n.language || 'en';
  
  // Build URLs with language parameter for language-specific PDFs
  const baseTeacherToolkitFilename = isPrimary 
    ? 'PCS_PRIMARY_Teacher_Toolkit.pdf'
    : 'PCS_SECONDARY_Teacher_Toolkit.pdf';
  const baseStudentWorkbookFilename = isPrimary
    ? 'PCS_PRIMARY_Pupil_Workbook.pdf'
    : 'PCS_SECONDARY_Student_Workbook.pdf';
  
  const teacherToolkitUrl = `/api/pdfs/${baseTeacherToolkitFilename}?lang=${currentLanguage}`;
  const studentWorkbookUrl = `/api/pdfs/${baseStudentWorkbookFilename}?lang=${currentLanguage}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Migrated User Notice */}
        {user?.isMigrated && (
          <MigratedUserNotice needsEvidenceResubmission={user?.needsEvidenceResubmission || false} />
        )}
        
        {/* Welcome Header */}
        <div className="mb-10">
          <Card className="bg-gradient-to-br from-white via-blue-50/30 to-white shadow-xl border-0 overflow-hidden relative transition-all duration-300 hover:shadow-2xl">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pcs_blue/10 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal/10 to-transparent rounded-full blur-2xl"></div>
            
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-4xl lg:text-5xl font-bold text-navy tracking-tight" data-testid="text-welcome">
                      {t('welcome.greeting', { name: user?.firstName ?? t('welcome.default_name') })}
                    </h1>
                    {school.currentRound && (
                      <Badge 
                        className={`${
                          school.currentRound === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          school.currentRound === 2 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                          'bg-gradient-to-r from-green-600 to-green-700'
                        } text-white text-sm px-4 py-1.5 shadow-lg`}
                        data-testid="text-current-round"
                      >
                        Round {school.currentRound}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xl font-semibold text-gray-700" data-testid="text-school-info">
                    {school.name} • <span className="text-pcs_blue">{school.country}</span>
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-5 w-5 text-pcs_blue" />
                    <span className="font-medium">{t('progress.current_stage')}: <span className="text-navy font-semibold">{t(`progress.${school.currentStage}.title`)}</span></span>
                  </div>
                  {/* Teacher Toolkit & Student Workbook Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <a href={teacherToolkitUrl} target="_blank" rel="noopener noreferrer">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 px-3"
                        data-testid="button-teacher-toolkit"
                      >
                        <BookOpen className="h-3 w-3 mr-1.5" />
                        {t('progress.buttons.teacher_toolkit')}
                      </Button>
                    </a>
                    <a href={studentWorkbookUrl} target="_blank" rel="noopener noreferrer">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7 px-3"
                        data-testid="button-student-workbook"
                      >
                        <FileText className="h-3 w-3 mr-1.5" />
                        {t('progress.buttons.student_workbook')}
                      </Button>
                    </a>
                  </div>
                  {(school.roundsCompleted ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <span className="text-gray-700 font-medium">
                        {school.roundsCompleted} {school.roundsCompleted === 1 ? 'round' : 'rounds'} completed
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-28 h-28 mb-3">
                    <div className="absolute inset-0 bg-gradient-to-br from-pcs_blue to-teal rounded-full opacity-20"></div>
                    <div className="relative bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-xl border-4 border-white">
                      <span className="text-2xl font-bold text-navy" data-testid="text-progress-percentage">
                        {school.progressPercentage % 100 === 0 && school.progressPercentage > 0 ? 100 : school.progressPercentage % 100}%
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{t('progress.overall_progress')}</div>
                  {user?.hasSeenOnboarding && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestartTour}
                      className="mt-3"
                      data-testid="button-restart-tour"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      {t('actions.take_tour_again', { ns: 'dashboard' })}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-10">
          <div className="bg-white rounded-xl shadow-lg p-2 sm:p-3 flex gap-1 sm:gap-3 border border-gray-100 overflow-x-auto">
            <Button
              variant={activeTab === 'progress' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold min-w-[44px] ${
                activeTab === 'progress' 
                  ? 'bg-pcs_blue text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('progress')}
              data-testid="tab-progress"
              data-tour="progress-tab"
            >
              <BarChart3 className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">{t('tabs.progress', { ns: 'dashboard' })}</span>
            </Button>
            <Button
              variant={activeTab === 'resources' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold min-w-[44px] ${
                activeTab === 'resources' 
                  ? 'bg-pcs_blue text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('resources')}
              data-testid="tab-resources"
              data-tour="resources-tab"
            >
              <BookOpen className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">{t('tabs.resources', { ns: 'dashboard' })}</span>
            </Button>
            <Button
              variant={activeTab === 'team' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold min-w-[44px] ${
                activeTab === 'team' 
                  ? 'bg-pcs_blue text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('team')}
              data-testid="tab-team"
              data-tour="team-tab"
            >
              <Users className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">{t('tabs.team', { ns: 'dashboard' })}</span>
            </Button>
            <Button
              variant={activeTab === 'promises' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold min-w-[44px] ${
                activeTab === 'promises' 
                  ? 'bg-pcs_blue text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('promises')}
              data-testid="tab-promises"
              data-tour="action-plan-tab"
            >
              <Target className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">{t('tabs.action_plan', { ns: 'dashboard' })}</span>
            </Button>
            <Button
              variant={activeTab === 'events' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold min-w-[44px] ${
                activeTab === 'events' 
                  ? 'bg-pcs_blue text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('events')}
              data-testid="tab-events"
              data-tour="events-tab"
            >
              <Calendar className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">{t('tabs.events', { ns: 'dashboard' })}</span>
              {newEventsCount > 0 && (
                <Badge 
                  className="ml-1 sm:ml-2 bg-red-500 text-white px-1.5 sm:px-2 py-0.5 text-xs font-bold" 
                  data-testid="badge-new-events-tab"
                >
                  {newEventsCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Event Notifications */}
        <Suspense fallback={null}>
          <EventNotificationBanner isAuthenticated={isAuthenticated} />
        </Suspense>

        {/* Resource Notifications */}
        <Suspense fallback={null}>
          <ResourceNotificationBanner isAuthenticated={isAuthenticated} />
        </Suspense>

        {/* Photo Consent Banner */}
        {activeTab === 'progress' && dashboardData?.school && (
          <Suspense fallback={null}>
            <PhotoConsentBanner schoolId={dashboardData.school.id} />
          </Suspense>
        )}

        {/* Progress Tab Content */}
        {activeTab === 'progress' && (
          <>
            {/* Missing Promises Notification */}
            {schoolAudit && 
             (schoolAudit.status === 'submitted' || schoolAudit.status === 'approved') && 
             auditPromises !== undefined &&
             auditPromises.length === 0 && 
             // Don't show if ANY action plan evidence is pending or approved
             !(actionPlanEvidence && actionPlanEvidence.some(ev => 
               ev.status === 'pending' || ev.status === 'approved'
             )) &&
             !dismissedPromiseNotification && (
              <div className="mb-6" data-testid="missing-promises-notification">
                <Alert className="bg-teal/10 border-l-4 border-teal shadow-lg">
                  <button
                    onClick={dismissPromiseNotification}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-teal/20 transition-colors"
                    data-testid="button-dismiss-promise-notification"
                    aria-label={t('accessibility.dismiss_notification', { ns: 'dashboard' })}
                  >
                    <X className="h-4 w-4 text-teal" />
                  </button>
                  <Leaf className="h-5 w-5 text-teal" />
                  <AlertDescription className="pr-8">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h3 className="font-semibold text-navy text-lg mb-1">
                          {t('notifications.audit_complete_title', { ns: 'dashboard' })}
                        </h3>
                        <p className="text-gray-700">
                          {t('notifications.audit_complete_message', { ns: 'dashboard' })}
                        </p>
                      </div>
                      <Button
                        onClick={() => setActiveTab('promises')}
                        className="bg-teal hover:bg-teal/90 text-white w-fit"
                        data-testid="button-make-promises-now"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        {t('actions.create_action_plan_now', { ns: 'dashboard' })}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Status Notifications */}
            {(() => {
              const now = new Date();
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              
              const recentApproved = recentEvidence.filter(e => 
                e.status === 'approved' && 
                e.reviewedAt && 
                new Date(e.reviewedAt) > sevenDaysAgo &&
                !dismissedNotifications.includes(e.id)
              );
              const recentRejected = recentEvidence.filter(e => 
                e.status === 'rejected' && 
                e.reviewedAt && 
                new Date(e.reviewedAt) > sevenDaysAgo &&
                !dismissedNotifications.includes(e.id)
              );
              
              const hasNotifications = recentApproved.length > 0 || recentRejected.length > 0;
              
              if (!hasNotifications) return null;
              
              return (
                <div className="mb-8 space-y-3" data-testid="notifications-section">
                  {recentApproved.length > 0 && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm animate-fade-in relative" data-testid="notification-approved">
                      <button
                        onClick={() => recentApproved.forEach(e => dismissNotification(e.id))}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-green-200 transition-colors"
                        data-testid="button-dismiss-approved"
                        aria-label={t('accessibility.dismiss_notification', { ns: 'dashboard' })}
                      >
                        <X className="h-4 w-4 text-green-700" />
                      </button>
                      <div className="flex items-start gap-3 pr-8">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-green-900 mb-1">
                            {t('notifications.evidence_approved_title', { ns: 'dashboard' })}
                          </h3>
                          <p className="text-sm text-green-800">
                            {recentApproved.length === 1 
                              ? t('notifications.evidence_approved_message_singular', { ns: 'dashboard', count: recentApproved.length })
                              : t('notifications.evidence_approved_message_plural', { ns: 'dashboard', count: recentApproved.length })
                            }
                          </p>
                          <div className="mt-2 space-y-2">
                            {recentApproved.map(evidence => {
                              const reviewerName = evidence.reviewer?.firstName && evidence.reviewer?.lastName
                                ? `${evidence.reviewer.firstName} ${evidence.reviewer.lastName}`
                                : evidence.reviewer?.email || 'Platform Admin';
                              
                              return (
                                <div key={evidence.id} className="text-xs">
                                  <div className="text-green-700 font-medium">
                                    ✓ {evidence.title}
                                  </div>
                                  {evidence.reviewNotes && (
                                    <div className="text-green-600 mt-1 pl-4 italic">
                                      "{evidence.reviewNotes}"
                                    </div>
                                  )}
                                  <div className="text-green-600 mt-1 pl-4 text-xs">
                                    {t('evidence.reviewed_by', { name: reviewerName })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {recentRejected.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-fade-in relative" data-testid="notification-rejected">
                      <button
                        onClick={() => recentRejected.forEach(e => dismissNotification(e.id))}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-200 transition-colors"
                        data-testid="button-dismiss-rejected"
                        aria-label={t('accessibility.dismiss_notification', { ns: 'dashboard' })}
                      >
                        <X className="h-4 w-4 text-red-700" />
                      </button>
                      <div className="flex items-start gap-3 pr-8">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-red-900 mb-1">
                            {t('notifications.action_required_title', { ns: 'dashboard' })}
                          </h3>
                          <p className="text-sm text-red-800">
                            {recentRejected.length === 1
                              ? t('notifications.action_required_message_singular', { ns: 'dashboard', count: recentRejected.length })
                              : t('notifications.action_required_message_plural', { ns: 'dashboard', count: recentRejected.length })
                            }
                          </p>
                          <div className="mt-2 space-y-2">
                            {recentRejected.map(evidence => {
                              const reviewerName = evidence.reviewer?.firstName && evidence.reviewer?.lastName
                                ? `${evidence.reviewer.firstName} ${evidence.reviewer.lastName}`
                                : evidence.reviewer?.email || 'Platform Admin';
                              
                              return (
                                <div key={evidence.id} className="text-xs">
                                  <div className="text-red-700 font-medium">
                                    ✗ {evidence.title}
                                  </div>
                                  {evidence.reviewNotes && (
                                    <div className="text-red-600 mt-1 pl-4 italic">
                                      "{evidence.reviewNotes}"
                                    </div>
                                  )}
                                  <div className="text-red-600 mt-1 pl-4 text-xs">
                                    {t('evidence.reviewed_by', { name: reviewerName })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Progress Tracker */}
            <div className="mb-10">
              <ProgressTracker 
                inspireCompleted={school.inspireCompleted}
                investigateCompleted={school.investigateCompleted}
                actCompleted={school.actCompleted}
                awardCompleted={school.awardCompleted}
                currentStage={school.currentStage}
                evidenceCounts={evidenceCounts}
                schoolId={school.id}
                currentRound={school.currentRound ?? 1}
              />
            </div>

            {/* Above and Beyond Section */}
            <div className="mb-8">
              <Card className="bg-gradient-to-br from-purple-50 via-white to-purple-50 border-2 border-purple-200 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-[#21496a]">
                        <Award className="h-5 w-5 text-purple-600" />
                        Above and Beyond
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Submit extra work that isn't attached to a specific requirement. Show us the amazing things you're doing!
                      </p>
                      <Button
                        onClick={handleAboveAndBeyondSubmit}
                        className="bg-[#009de1] hover:bg-purple-700 text-white shadow-sm"
                        size="sm"
                        data-testid="button-submit-above-and-beyond"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Evidence
                      </Button>
                    </div>
                  </div>

                  {/* List of Above and Beyond Submissions */}
                  {aboveAndBeyondEvidence.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-purple-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Submissions ({aboveAndBeyondEvidence.length})</h4>
                      <div className="space-y-2">
                        {aboveAndBeyondEvidence.slice(0, 5).map((evidence) => (
                          <div
                            key={evidence.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100 hover:shadow-sm transition-shadow"
                            data-testid={`above-beyond-${evidence.id}`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{evidence.title}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(evidence.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge
                              className={`${getStatusColor(evidence.status)} text-white text-xs`}
                              data-testid={`status-${evidence.id}`}
                            >
                              {evidence.status}
                            </Badge>
                          </div>
                        ))}
                        {aboveAndBeyondEvidence.length > 5 && (
                          <p className="text-xs text-gray-500 text-center pt-2">
                            + {aboveAndBeyondEvidence.length - 5} more submission{aboveAndBeyondEvidence.length - 5 !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Round Completion Celebration */}
            {school.awardCompleted && (
              <div className="mb-8">
                <Card className={`${
                  school.currentRound === 1 ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' :
                  school.currentRound === 2 ? 'bg-gradient-to-br from-purple-50 via-white to-purple-50' :
                  'bg-gradient-to-br from-green-50 via-white to-green-50'
                } border-4 ${
                  school.currentRound === 1 ? 'border-blue-300' :
                  school.currentRound === 2 ? 'border-purple-300' :
                  'border-green-300'
                } shadow-2xl`} data-testid="round-completion-card">
                  <CardContent className="p-8 text-center">
                    <div className="mb-6">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                        <Award className="h-14 w-14 text-navy" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-navy mb-3">
                      {t('round.congratulations_title', { ns: 'dashboard' })}
                    </h2>
                    <p className="text-xl text-gray-700 mb-6">
                      {t('round.congratulations_message', { ns: 'dashboard', round: school.currentRound })}
                    </p>
                    <div className="space-y-4">
                      <div className="bg-white/80 backdrop-blur rounded-lg p-4 inline-block">
                        <p className="text-sm text-gray-600 mb-2">{t('round.completion_subtitle', { ns: 'dashboard' })}</p>
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <CheckCircle className="h-5 w-5" />
                          <span>{t('round.completion_stages', { ns: 'dashboard' })}</span>
                        </div>
                      </div>
                      <div className="pt-4">
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-bold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/schools/${school.id}/start-round`, {
                                method: 'POST',
                                credentials: 'include',
                              });
                              if (response.ok) {
                                window.location.reload();
                              } else {
                                toast({
                                  title: t('errors.unexpected_error', { ns: 'dashboard' }),
                                  description: t('errors.start_round_failed', { ns: 'dashboard' }),
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              toast({
                                title: t('errors.unexpected_error', { ns: 'dashboard' }),
                                description: t('errors.start_round_failed', { ns: 'dashboard' }),
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-start-new-round"
                        >
                          {t('round.start_next_round', { ns: 'dashboard', round: (school.currentRound || 1) + 1 })}
                        </Button>
                        <p className="text-xs text-gray-500 mt-3">
                          {t('round.start_warning', { ns: 'dashboard' })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Certificate Display */}
            {certificates.length > 0 && school.roundsCompleted && school.roundsCompleted >= 1 && (
              <div className="mb-8">
                <Card className="bg-gradient-to-br from-yellow-50 via-white to-yellow-50 border-2 border-yellow-300 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-navy flex items-center gap-2">
                      <Award className="h-6 w-6 text-yellow-500" />
                      {t('certificates.title', { ns: 'dashboard' })}
                    </CardTitle>
                    <p className="text-sm text-gray-600">{t('certificates.description', { ns: 'dashboard' })}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certificates.map((cert) => (
                        <div 
                          key={cert.id}
                          className="bg-white p-6 rounded-lg border-2 border-yellow-200 shadow-md hover:shadow-lg transition-shadow"
                          data-testid={`certificate-${cert.id}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                              <Award className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-navy mb-1">{cert.title}</h3>
                              <p className="text-xs text-gray-500 mb-2">
                                {t('certificates.certificate_number', { ns: 'dashboard', number: cert.certificateNumber })}
                              </p>
                              <p className="text-xs text-gray-600 mb-3">
                                {t('certificates.completed_on', { ns: 'dashboard', date: new Date(cert.completedDate).toLocaleDateString() })}
                              </p>
                              <div className="space-y-2">
                                <Button
                                  size="sm"
                                  className="bg-pcs_blue hover:bg-blue-700 text-white w-full"
                                  onClick={() => window.open(`/api/certificates/${cert.id}/download`, '_blank')}
                                  data-testid={`button-view-certificate-${cert.id}`}
                                >
                                  {t('certificates.view_certificate', { ns: 'dashboard' })}
                                </Button>
                                
                                {/* Social Sharing Buttons */}
                                <div className="flex items-center gap-2 pt-2">
                                  <span className="text-xs text-gray-500 mr-1">Share:</span>
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-pcs_blue hover:bg-blue-700 text-white"
                                    onClick={() => {
                                      const shareUrl = `${window.location.origin}/verify-certificate/${cert.certificateNumber}`;
                                      const shareText = `🎉 ${school.name} is now a Plastic Clever School! Check out our Round ${(cert.metadata as any)?.round || 1} completion certificate:`;
                                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420');
                                    }}
                                    data-testid={`button-share-twitter-${cert.id}`}
                                  >
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-pcs_blue hover:bg-blue-700 text-white"
                                    onClick={() => {
                                      const shareUrl = `${window.location.origin}/verify-certificate/${cert.certificateNumber}`;
                                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420');
                                    }}
                                    data-testid={`button-share-facebook-${cert.id}`}
                                  >
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-pcs_blue hover:bg-blue-700 text-white"
                                    onClick={() => {
                                      const shareUrl = `${window.location.origin}/verify-certificate/${cert.certificateNumber}`;
                                      const shareText = `${school.name} is now a Plastic Clever School!`;
                                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=550,height=420');
                                    }}
                                    data-testid={`button-share-linkedin-${cert.id}`}
                                  >
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1 bg-pcs_blue hover:bg-blue-700 text-white"
                                    onClick={() => {
                                      const shareUrl = `${window.location.origin}/verify-certificate/${cert.certificateNumber}`;
                                      const shareText = `🎉 ${school.name} is now a Plastic Clever School! Check out our certificate:`;
                                      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
                                    }}
                                    data-testid={`button-share-whatsapp-${cert.id}`}
                                  >
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.304-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}


            {/* Enhanced Recent Activity */}
            <div>
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold text-navy">{t('activity_feed.title')}</CardTitle>
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  {recentEvidence.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('activity_feed.no_activity_title')}</h3>
                      <p className="text-gray-500 mb-6">{t('activity_feed.no_activity_description')}</p>
                      <Button 
                        className="bg-coral hover:bg-coral/90 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
                        onClick={() => setShowEvidenceForm(true)}
                        data-testid="button-upload-evidence-empty"
                      >
                        <Upload className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                        {t('evidence.submit_evidence')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentEvidence.map((evidence, index) => (
                        <div 
                          key={evidence.id} 
                          className="group flex items-start gap-4 p-6 bg-gradient-to-r from-white to-gray-50/50 rounded-xl border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
                          style={{ animationDelay: `${index * 0.1}s` }}
                          data-testid={`activity-${evidence.id}`}
                        >
                          <div className={`p-3 rounded-full text-white shadow-lg ${
                            evidence.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                            evidence.status === 'pending' ? 'bg-gradient-to-r from-yellow to-yellow/80' :
                            'bg-gradient-to-r from-red-500 to-red-400'
                          } group-hover:scale-110 transition-transform duration-300`}>
                            {evidence.status === 'approved' ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <Clock className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-navy group-hover:text-ocean-blue transition-colors">{evidence.title}</h4>
                              <Badge className={`${getStageColor(evidence.stage)} text-white shadow-sm`}>
                                {t(`progress.${evidence.stage}.title`)}
                              </Badge>
                              <Badge variant="outline" className={`${getStatusColor(evidence.status)} text-white border-0 shadow-sm`}>
                                {t(`evidence.evidence_${evidence.status}`)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {t('evidence.submitted_on', { date: new Date(evidence.submittedAt).toLocaleDateString() })}
                            </p>
                          </div>
                          {evidence.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(evidence.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              data-testid={`button-delete-evidence-${evidence.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Resources Tab Content */}
        {activeTab === 'resources' && (
          <div className="space-y-8">
            {/* Recommended Resources for Your Stage */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-pcs_blue" />
                      Recommended for you
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Resources matching your current stage ({dashboardData?.school?.currentStage}) 
                      {dashboardData?.school?.primaryLanguage && ` and language (${dashboardData.school.primaryLanguage})`}
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    className="border-pcs_blue text-pcs_blue hover:bg-pcs_blue hover:text-white"
                    onClick={() => window.location.href = '/resources'}
                    data-testid="button-view-all-resources"
                  >
                    View All Resources
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {resourcesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : sortedResources.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No resources available yet.</p>
                    <Button 
                      className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                      onClick={() => window.location.href = '/resources'}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Explore Resources Page
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedResources.map((resource) => {
                      const isStageMatch = resource.stage === dashboardData?.school?.currentStage;
                      const schoolLangCode = dashboardData?.school?.primaryLanguage 
                        ? languageCodeFromName(dashboardData.school.primaryLanguage) 
                        : null;
                      const resourceLangCodes = resource.languages?.map(lang => 
                        languageCodeFromName(lang) || lang.toLowerCase()
                      ).filter(Boolean) || [];
                      const isLangMatch = schoolLangCode && resourceLangCodes.includes(schoolLangCode);
                      
                      return (
                        <Card 
                          key={resource.id} 
                          className={`group hover:shadow-xl transition-all duration-300 border-2 overflow-hidden ${
                            isStageMatch ? 'border-pcs_blue/30 bg-blue-50/30' : 'border-gray-100'
                          }`}
                          data-testid={`card-resource-${resource.id}`}
                        >
                          {/* Thumbnail */}
                          <ResourceThumbnail resource={resource} />
                          
                          <CardContent className="p-4">
                            <h4 className="font-bold text-navy mb-2 line-clamp-2 group-hover:text-pcs_blue transition-colors">
                              {resource.title}
                            </h4>
                            {resource.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                {resource.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge className={`${
                                resource.stage === 'inspire' ? 'bg-pcs_blue' :
                                resource.stage === 'investigate' ? 'bg-teal' : 'bg-coral'
                              } text-white`}>
                                {resource.stage.charAt(0).toUpperCase() + resource.stage.slice(1)}
                              </Badge>
                              
                              {isStageMatch && (
                                <Badge className="bg-green-500 text-white">
                                  Your Stage
                                </Badge>
                              )}
                              
                              {resource.languages && resource.languages.length > 0 && (
                                <div className="flex gap-1">
                                  {resource.languages.slice(0, 3).map((lang, idx) => {
                                    const langCode = languageCodeFromName(lang) || lang.toLowerCase();
                                    const flag = LANGUAGE_FLAG_MAP[langCode] || '🏳️';
                                    const isMatch = schoolLangCode === langCode;
                                    return (
                                      <span 
                                        key={idx} 
                                        className={`text-lg ${isMatch ? 'ring-2 ring-green-500 rounded' : ''}`}
                                        title={lang}
                                      >
                                        {flag}
                                      </span>
                                    );
                                  })}
                                  {resource.languages.length > 3 && (
                                    <span className="text-xs text-gray-500 self-center">
                                      +{resource.languages.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Download className="h-3 w-3" />
                                {resource.downloadCount} downloads
                              </div>
                              
                              {resource.fileUrl && (
                                <Button
                                  size="sm"
                                  className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                                  onClick={() => window.open(resource.fileUrl!, '_blank')}
                                  data-testid={`button-view-resource-${resource.id}`}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              )}
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

        {/* Team Tab Content */}
        {activeTab === 'team' && (
          <Suspense fallback={<LoadingSpinner message="Loading team management..." />}>
            <TeamManagement />
          </Suspense>
        )}

        {/* Our Action Plan Tab Content */}
        {activeTab === 'promises' && (
          <div className="space-y-8">
            {promisesLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-lg border-0">
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : schoolPromises.length === 0 ? (
              <Card className="shadow-lg border-0">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-teal/20 to-pcs_blue/20 rounded-full flex items-center justify-center">
                      <Target className="h-12 w-12 text-teal" />
                    </div>
                  </div>
                  
                  {/* Check if action plan was submitted via Investigate stage */}
                  {(() => {
                    // Find the most recent pending or approved action plan evidence
                    // Sort by submittedAt descending (newest first) before finding
                    const sortedEvidence = actionPlanEvidence
                      ? [...actionPlanEvidence].sort((a, b) => 
                          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                        )
                      : [];
                    
                    const pendingOrApproved = sortedEvidence.find(ev => 
                      ev.status === 'pending' || ev.status === 'approved'
                    );
                    
                    if (pendingOrApproved) {
                      if (pendingOrApproved.status === 'pending') {
                        return (
                          <>
                            <h2 className="text-2xl font-bold text-navy mb-3">{t('action_plan.under_review_title', { ns: 'dashboard' }) || 'Action Plan Under Review'}</h2>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                              {t('action_plan.under_review_message', { ns: 'dashboard' }) || 'Your action plan has been submitted and is currently under review. You\'ll be able to see your reduction promises here once it\'s approved.'}
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                              <p className="text-sm text-gray-700">
                                <strong>{t('common.status', { ns: 'dashboard' }) || 'Status'}:</strong> {t('status.pending_review', { ns: 'dashboard' }) || 'Pending Review'}
                              </p>
                              <p className="text-sm text-gray-600 mt-2">
                                {t('action_plan.view_in_progress_tab', { ns: 'dashboard' }) || 'Visit the "Our Progress" tab to view your submission details.'}
                              </p>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <h2 className="text-2xl font-bold text-navy mb-3">{t('action_plan.approved_title', { ns: 'dashboard' }) || 'Action Plan Approved!'}</h2>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                              {t('action_plan.approved_message', { ns: 'dashboard' }) || 'Your action plan has been approved, but your reduction promises will appear here soon.'}
                            </p>
                            <Button
                              onClick={() => setActiveTab('progress')}
                              className="bg-teal hover:bg-teal/90 text-white px-6 py-3"
                              data-testid="button-view-progress"
                            >
                              {t('actions.view_progress', { ns: 'dashboard' }) || 'View Progress'}
                            </Button>
                          </>
                        );
                      }
                    }
                    
                    // No pending or approved - show message to submit via evidence
                    return (
                    <>
                      <h2 className="text-2xl font-bold text-navy mb-3">Create Your Action Plan</h2>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        To create your action plan, please submit it through the <strong>Action Plan Development</strong> evidence requirement in the Progress tab.
                      </p>
                      <Alert className="max-w-md mx-auto mb-6 bg-navy/5 border-navy/20">
                        <Lightbulb className="h-4 w-4 text-navy" />
                        <AlertDescription className="text-sm text-gray-700">
                          Your action plan will be reviewed by our team. Once approved, you'll see your reduction promises and impact metrics here.
                        </AlertDescription>
                      </Alert>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={handleAddActionPlan}
                          className="bg-navy hover:bg-navy/90 text-white px-6 py-3 text-lg shadow-lg"
                          data-testid="button-add-first-promise"
                        >
                          <Target className="h-5 w-5 mr-2" />
                          Go to Action Plan Evidence
                        </Button>
                      </div>
                    </>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Impact Summary */}
                {(() => {
                  const metrics = calculateAggregateMetrics(schoolPromises);
                  return (
                    <>
                      <h2 className="text-3xl font-bold text-navy mb-6">{t('action_plan.impact_title', { ns: 'dashboard' })}</h2>

                      {/* Summary Cards */}
                      <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Card className="shadow-lg border-2 border-navy/20 cursor-help hover:shadow-xl transition-shadow">
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-navy/10 rounded-full flex items-center justify-center">
                                      <Target className="h-8 w-8 text-navy" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-navy/70">{t('action_plan.total_items', { ns: 'dashboard' })}</div>
                                      <div className="text-3xl font-bold text-navy" data-testid="text-total-promises">
                                        {schoolPromises.length}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('action_plan.tooltip_total_items')}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Card className="shadow-lg border-2 border-teal/20 cursor-help hover:shadow-xl transition-shadow">
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center">
                                      <TrendingDown className="h-8 w-8 text-teal" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-navy/70">{t('action_plan.items_reduced_per_year', { ns: 'dashboard' })}</div>
                                      <div className="text-3xl font-bold text-navy" data-testid="text-items-reduced">
                                        {metrics.byItemType.reduce((sum, item) => sum + item.totalReduction, 0).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('action_plan.tooltip_items_reduced')}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Card className="shadow-lg border-2 border-coral/20 cursor-help hover:shadow-xl transition-shadow">
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center">
                                      <Leaf className="h-8 w-8 text-coral" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold text-navy/70">{t('action_plan.weight_reduced_per_year', { ns: 'dashboard' })}</div>
                                      <div className="text-3xl font-bold text-navy" data-testid="text-weight-reduced">
                                        {metrics.seriousMetrics.kilograms.toFixed(1)} {t('units.kg', { ns: 'dashboard' })}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>{t('action_plan.tooltip_weight_reduced')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>

                      {/* Environmental Metrics */}
                      <TooltipProvider>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                          <Card className="shadow-lg border-2 border-navy/10">
                            <CardHeader className="bg-navy/5">
                              <CardTitle className="text-xl font-bold text-navy flex items-center gap-2">
                                <Leaf className="h-5 w-5" />
                                {t('action_plan.ocean_impact', { ns: 'dashboard' })}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-navy/5 rounded-lg cursor-help border border-navy/10">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.sea_turtles_worth', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-navy" data-testid="text-sea-turtles">
                                      {metrics.funMetrics.seaTurtles.toFixed(3)}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_sea_turtles', { ns: 'dashboard' })}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-navy/5 rounded-lg cursor-help border border-navy/10">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.microplastics_prevented', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-navy" data-testid="text-microplastics">
                                      {Math.floor(metrics.funMetrics.microplasticsPrevented).toLocaleString()}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_microplastics', { ns: 'dashboard' })}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-navy/5 rounded-lg cursor-help border border-navy/10">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.dolphins_protected', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-navy" data-testid="text-dolphins">
                                      {metrics.funMetrics.dolphins.toFixed(3)}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_dolphins', { ns: 'dashboard' })}</p>
                                </TooltipContent>
                              </Tooltip>
                            </CardContent>
                          </Card>

                          <Card className="shadow-lg border-2 border-navy/10">
                            <CardHeader className="bg-navy/5">
                              <CardTitle className="text-xl font-bold text-navy flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                {t('action_plan.environmental_impact', { ns: 'dashboard' })}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-navy/5 rounded-lg cursor-help border border-navy/10">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.co2_emissions_prevented', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-navy" data-testid="text-co2-prevented">
                                      {metrics.seriousMetrics.co2Prevented.toFixed(1)} {t('units.kg', { ns: 'dashboard' })}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_co2_prevented')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-navy/5 rounded-lg cursor-help border border-navy/10">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.oil_saved', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-navy" data-testid="text-oil-saved">
                                      {metrics.seriousMetrics.oilSaved.toFixed(1)} {t('units.liters', { ns: 'dashboard' })}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_oil_saved')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-navy/5 rounded-lg cursor-help border border-navy/10">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.tons_plastic_prevented', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-navy" data-testid="text-tons-prevented">
                                      {metrics.seriousMetrics.tons.toFixed(4)}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_tons_prevented')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </CardContent>
                          </Card>
                        </div>
                      </TooltipProvider>
                    </>
                  );
                })()}

                {/* Promise Cards */}
                <div>
                  <h3 className="text-2xl font-bold text-navy mb-6">{t('action_plan.active_promises_title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {schoolPromises.map((promise) => {
                      const reduction = promise.baselineQuantity - promise.targetQuantity;
                      const reductionPercent = ((reduction / promise.baselineQuantity) * 100).toFixed(0);
                      
                      // Check if action plan is approved - if so, disable edit/delete
                      const sortedEvidence = actionPlanEvidence
                        ? [...actionPlanEvidence].sort((a, b) => 
                            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                          )
                        : [];
                      const approvedActionPlan = sortedEvidence.find(ev => ev.status === 'approved');
                      const isLocked = !!approvedActionPlan;
                      
                      return (
                        <Card key={promise.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow" data-testid={`promise-card-${promise.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg font-bold text-navy mb-1">
                                  {promise.plasticItemLabel}
                                </CardTitle>
                                <Badge className="bg-teal/10 text-teal hover:bg-teal/20">
                                  {promise.plasticItemType.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              {!isLocked && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditPromiseClick(promise)}
                                    className="h-8 w-8 p-0 hover:bg-navy/10"
                                    data-testid={`button-edit-promise-${promise.id}`}
                                    title="Edit this promise"
                                  >
                                    <Edit className="h-4 w-4 text-navy" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeletePromiseClick(promise.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                    data-testid={`button-delete-promise-${promise.id}`}
                                    title="Delete this promise"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              )}
                              {isLocked && (
                                <Badge variant="secondary" className="bg-navy/10 text-navy border-navy/20">
                                  Approved
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">{t('action_plan.baseline', { ns: 'dashboard' })}</p>
                                <p className="text-lg font-bold text-navy" data-testid={`text-baseline-${promise.id}`}>
                                  {promise.baselineQuantity}
                                </p>
                                <p className="text-xs text-gray-500">{t('action_plan.per_timeframe', { ns: 'dashboard', timeframe: promise.timeframeUnit })}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">{t('action_plan.target', { ns: 'dashboard' })}</p>
                                <p className="text-lg font-bold text-navy" data-testid={`text-target-${promise.id}`}>
                                  {promise.targetQuantity}
                                </p>
                                <p className="text-xs text-gray-500">{t('action_plan.per_timeframe', { ns: 'dashboard', timeframe: promise.timeframeUnit })}</p>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-navy">{t('action_plan.reduction_goal', { ns: 'dashboard' })}</p>
                                <Badge className="bg-green-500 text-white">
                                  -{reductionPercent}%
                                </Badge>
                              </div>
                              <p className="text-2xl font-bold text-green-600" data-testid={`text-reduction-${promise.id}`}>
                                {t('action_plan.reduction_amount', { ns: 'dashboard', amount: reduction })}
                              </p>
                            </div>

                            {promise.notes && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">{t('action_plan.notes', { ns: 'dashboard' })}</p>
                                <p className="text-sm text-gray-700" data-testid={`text-notes-${promise.id}`}>
                                  {promise.notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Events Tab Content */}
        {activeTab === 'events' && (
          <Suspense fallback={<LoadingSpinner message="Loading events..." />}>
            <EventsSection 
              schoolId={dashboardData?.school?.id || ''} 
              isActive={activeTab === 'events'}
              isAuthenticated={isAuthenticated}
            />
          </Suspense>
        )}
      </div>
      {/* Evidence Submission Form */}
      {showEvidenceForm && (
        <EvidenceSubmissionForm 
          onClose={() => {
            setShowEvidenceForm(false);
            setPreSelectedStage(undefined);
          }}
          schoolId={school.id}
          preSelectedStage={preSelectedStage}
        />
      )}
      {/* Delete Evidence Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('evidence.delete_confirmation_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('evidence.delete_confirmation_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEvidenceToDelete(null)}>
              {t('actions.cancel', { ns: 'dashboard' })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('actions.deleting', { ns: 'dashboard' }) : t('actions.delete', { ns: 'dashboard' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete Promise Confirmation Dialog */}
      <AlertDialog open={deletePromiseDialogOpen} onOpenChange={setDeletePromiseDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-promise-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('promise_dialog.delete_confirmation_title', { ns: 'dashboard' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('promise_dialog.delete_confirmation_message', { ns: 'dashboard' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setPromiseToDelete(null)}
              data-testid="button-cancel-delete-promise"
            >
              {t('actions.cancel', { ns: 'dashboard' })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePromiseConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePromiseMutation.isPending}
              data-testid="button-confirm-delete-promise"
            >
              {deletePromiseMutation.isPending ? t('actions.deleting', { ns: 'dashboard' }) : t('actions.delete_action_item', { ns: 'dashboard' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Edit Promise Dialog */}
      {editingPromise && (
        <Dialog open={editPromiseDialogOpen} onOpenChange={setEditPromiseDialogOpen}>
          <DialogContent className="sm:max-w-md" data-testid="dialog-edit-promise">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-navy">
                Edit: {editingPromise.plasticItemLabel}
              </DialogTitle>
              <DialogDescription>
                Update the baseline, target, or notes for this reduction promise.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditPromiseSubmit({
                baselineQuantity: parseInt(formData.get('baseline') as string),
                targetQuantity: parseInt(formData.get('target') as string),
                notes: formData.get('notes') as string,
              });
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="baseline" className="text-sm font-medium text-navy">
                    Baseline Quantity (per {editingPromise.timeframeUnit})
                  </label>
                  <Input
                    id="baseline"
                    name="baseline"
                    type="number"
                    defaultValue={editingPromise.baselineQuantity}
                    min="1"
                    required
                    className="mt-1"
                    data-testid="input-edit-baseline"
                  />
                </div>
                <div>
                  <label htmlFor="target" className="text-sm font-medium text-navy">
                    Target Quantity (per {editingPromise.timeframeUnit})
                  </label>
                  <Input
                    id="target"
                    name="target"
                    type="number"
                    defaultValue={editingPromise.targetQuantity}
                    min="0"
                    required
                    className="mt-1"
                    data-testid="input-edit-target"
                  />
                </div>
                <div>
                  <label htmlFor="notes" className="text-sm font-medium text-navy">
                    Notes (optional)
                  </label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={editingPromise.notes || ''}
                    rows={3}
                    className="mt-1"
                    data-testid="input-edit-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditPromiseDialogOpen(false);
                    setEditingPromise(null);
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-navy hover:bg-navy/90 text-white"
                  disabled={updatePromiseMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updatePromiseMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {/* Onboarding Components */}
      <WelcomeModal 
        open={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        onStartTour={handleStartTour}
      />
      <InteractiveTour 
        isActive={showTour}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
      />
    </div>
  );
}
