import { useEffect, useState, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
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
  FileText
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PLASTIC_ITEM_WEIGHTS, calculateAggregateMetrics } from "@/../../shared/plasticMetrics";
import type { ReductionPromise, InsertReductionPromise, AuditResponse } from "@/../../shared/schema";

// Lazy load heavy components
const EventsSection = lazy(() => import("@/components/dashboard/EventsSection"));
const EventNotificationBanner = lazy(() => import("@/components/dashboard/EventNotificationBanner"));
const ResourceNotificationBanner = lazy(() => import("@/components/dashboard/ResourceNotificationBanner"));
const PhotoConsentBanner = lazy(() => import("@/components/PhotoConsentBanner").then(module => ({ default: module.PhotoConsentBanner })));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));

interface Certificate {
  id: string;
  certificateNumber: string;
  title: string;
  completedDate: string;
  issuedDate: string;
  stage: string;
}

interface DashboardData {
  school: {
    id: string;
    name: string;
    country: string;
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
  }>;
  evidenceCounts: {
    inspire: { total: number; approved: number };
    investigate: { total: number; approved: number; hasQuiz: boolean };
    act: { total: number; approved: number };
  };
}

export default function Home() {
  const { t } = useTranslation('dashboard');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
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
  const [promiseDialogOpen, setPromiseDialogOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState<ReductionPromise | null>(null);
  const [deletePromiseDialogOpen, setDeletePromiseDialogOpen] = useState(false);
  const [promiseToDelete, setPromiseToDelete] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [hasAttemptedOnboarding, setHasAttemptedOnboarding] = useState(false);

  // Redirect admins to admin dashboard
  useEffect(() => {
    console.log('Home component - admin redirect check:', {
      isLoading,
      isAuthenticated,
      userIsAdmin: user?.isAdmin,
      userRole: user?.role,
      willRedirect: !isLoading && isAuthenticated && user?.isAdmin
    });
    
    if (!isLoading && isAuthenticated && user?.isAdmin) {
      console.log('Home: Admin detected, redirecting to /admin');
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

  const { data: dashboardData, isLoading: isDashboardLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
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

  // Fetch all promises for school via audit (for Our Action Plan tab)
  // Using audit endpoint instead of school endpoint to avoid permission issues
  const { data: schoolPromises = [], isLoading: promisesLoading } = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/audit', schoolAudit?.id],
    enabled: activeTab === 'promises' && !!schoolAudit?.id,
    retry: false,
  });

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

  // Form schema for promise dialog
  const promiseFormSchema = z.object({
    plasticItemType: z.string().min(1, t('validation.select_plastic_type', { ns: 'dashboard' })),
    plasticItemLabel: z.string().min(1, t('validation.provide_item_label', { ns: 'dashboard' })),
    baselineQuantity: z.number().min(1, t('validation.baseline_min', { ns: 'dashboard' })),
    targetQuantity: z.number().min(0, t('validation.target_min', { ns: 'dashboard' })),
    timeframeUnit: z.enum(["week", "month", "year"]),
    notes: z.string().optional(),
  });

  const promiseForm = useForm<z.infer<typeof promiseFormSchema>>({
    resolver: zodResolver(promiseFormSchema),
    defaultValues: {
      plasticItemType: "",
      plasticItemLabel: "",
      baselineQuantity: 0,
      targetQuantity: 0,
      timeframeUnit: "week",
      notes: "",
    },
  });

  // Create promise mutation
  const createPromiseMutation = useMutation({
    mutationFn: async (data: InsertReductionPromise) => {
      return apiRequest('POST', '/api/reduction-promises', data);
    },
    onSuccess: () => {
      // Invalidate audit-based query and analytics
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit', schoolAudit?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'audit-analytics'] });
      toast({
        title: t('toasts.success', { ns: 'dashboard' }),
        description: t('toasts.promise_created', { ns: 'dashboard' }),
      });
      setPromiseDialogOpen(false);
      setEditingPromise(null);
      promiseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t('toasts.error', { ns: 'dashboard' }),
        description: error?.message || t('toasts.promise_create_failed', { ns: 'dashboard' }),
        variant: "destructive",
      });
    },
  });

  // Update promise mutation
  const updatePromiseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertReductionPromise> }) => {
      return apiRequest('PATCH', `/api/reduction-promises/${id}`, data);
    },
    onSuccess: () => {
      // Invalidate audit-based query and analytics
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit', schoolAudit?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', dashboardData?.school?.id, 'audit-analytics'] });
      toast({
        title: t('toasts.success', { ns: 'dashboard' }),
        description: t('toasts.promise_updated', { ns: 'dashboard' }),
      });
      setPromiseDialogOpen(false);
      setEditingPromise(null);
      promiseForm.reset();
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
    // 4. Modal is not already showing
    // 5. All loading states are complete
    if (user && !user.hasSeenOnboarding && !hasAttemptedOnboarding && dashboardData && !isLoading && !isDashboardLoading && !showWelcomeModal) {
      setShowWelcomeModal(true);
      setHasAttemptedOnboarding(true); // Mark as attempted immediately to prevent re-triggering
    }
  }, [user, user?.hasSeenOnboarding, user?.id, dashboardData, isLoading, isDashboardLoading, hasAttemptedOnboarding, showWelcomeModal]);

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    setHasAttemptedOnboarding(true);
    markOnboardingCompleteMutation.mutate();
  };

  const handleStartTour = () => {
    setShowTour(true);
  };

  const handleTourComplete = () => {
    setShowTour(false);
  };

  const handleTourSkip = () => {
    setShowTour(false);
  };

  const handleRestartTour = () => {
    setShowTour(true);
  };

  const handlePromiseSubmit = (values: z.infer<typeof promiseFormSchema>) => {
    if (!dashboardData?.school?.id || !user?.id) return;

    const reductionAmount = values.baselineQuantity - values.targetQuantity;
    
    if (editingPromise) {
      updatePromiseMutation.mutate({
        id: editingPromise.id,
        data: {
          ...values,
          reductionAmount,
          schoolId: dashboardData.school.id,
          createdBy: editingPromise.createdBy,
        },
      });
    } else {
      createPromiseMutation.mutate({
        ...values,
        reductionAmount,
        schoolId: dashboardData.school.id,
        auditId: schoolAudit?.id,
        createdBy: user.id,
        status: 'active',
      });
    }
  };

  const handleEditPromise = (promise: ReductionPromise) => {
    setEditingPromise(promise);
    promiseForm.reset({
      plasticItemType: promise.plasticItemType,
      plasticItemLabel: promise.plasticItemLabel,
      baselineQuantity: promise.baselineQuantity,
      targetQuantity: promise.targetQuantity,
      timeframeUnit: promise.timeframeUnit as "week" | "month" | "year",
      notes: promise.notes || "",
    });
    setPromiseDialogOpen(true);
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

  const handleAddPromiseClick = () => {
    setEditingPromise(null);
    promiseForm.reset({
      plasticItemType: "",
      plasticItemLabel: "",
      baselineQuantity: 0,
      targetQuantity: 0,
      timeframeUnit: "week",
      notes: "",
    });
    setPromiseDialogOpen(true);
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

  // Determine resource URLs based on school type
  const isPrimary = !school.type || school.type === 'primary';
  const teacherToolkitUrl = isPrimary 
    ? '/PCS_PRIMARY_Teacher_Toolkit.pdf'
    : '/PCS_SECONDARY_Teacher_Toolkit.pdf';
  const studentWorkbookUrl = isPrimary
    ? '/PCS_PRIMARY_Pupil_Workbook.pdf'
    : '/PCS_SECONDARY_Student_Workbook.pdf';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                        } text-white text-sm px-4 py-1.5 shadow-lg animate-pulse`}
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
                        Teacher Toolkit
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
                        Student Workbook
                      </Button>
                    </a>
                  </div>
                  {school.roundsCompleted && school.roundsCompleted > 0 && (
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
                    <div className="absolute inset-0 bg-gradient-to-br from-pcs_blue to-teal rounded-full opacity-20 animate-pulse"></div>
                    <div className="relative bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-xl border-4 border-white">
                      <span className="text-2xl font-bold text-navy" data-testid="text-progress-percentage">
                        {school.progressPercentage}%
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
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
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
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
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
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
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
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
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
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
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
                  className="ml-1 sm:ml-2 bg-red-500 text-white px-1.5 sm:px-2 py-0.5 text-xs font-bold animate-pulse" 
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
             !dismissedPromiseNotification && (
              <div className="mb-6" data-testid="missing-promises-notification">
                <Alert className="bg-gradient-to-r from-teal/10 to-pcs_blue/10 border-l-4 border-teal shadow-lg">
                  <button
                    onClick={dismissPromiseNotification}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-teal/20 transition-colors"
                    data-testid="button-dismiss-promise-notification"
                    aria-label="Dismiss notification"
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
                        className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white w-fit"
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
                        aria-label="Dismiss notification"
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
                            {recentApproved.map(evidence => (
                              <div key={evidence.id} className="text-xs">
                                <div className="text-green-700 font-medium">
                                  ✓ {evidence.title}
                                </div>
                                {evidence.reviewNotes && (
                                  <div className="text-green-600 mt-1 pl-4 italic">
                                    "{evidence.reviewNotes}"
                                  </div>
                                )}
                              </div>
                            ))}
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
                        aria-label="Dismiss notification"
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
                          <div className="mt-2 space-y-1">
                            {recentRejected.map(evidence => (
                              <div key={evidence.id} className="text-xs text-red-700 font-medium">
                                ✗ {evidence.title}
                              </div>
                            ))}
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
              />
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
                        <Award className="h-14 w-14 text-white" />
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
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                                onClick={() => window.open(`/api/certificates/${cert.id}`, '_blank')}
                                data-testid={`button-view-certificate-${cert.id}`}
                              >
                                {t('certificates.view_certificate', { ns: 'dashboard' })}
                              </Button>
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
                        className="bg-gradient-to-r from-coral to-coral/80 hover:from-coral hover:to-coral/70 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group"
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
            {/* Quick Access Resources */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="shadow-lg border-0 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 group h-full" onClick={() => window.location.href = '/resources'} data-testid="card-browse-resources">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 bg-gradient-to-br from-pcs_blue to-teal rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-pcs_blue transition-colors">{t('resources.browse_title')}</h3>
                  <p className="text-sm text-gray-600 mb-6 flex-grow">{t('resources.browse_description')}</p>
                  <Button className="w-full bg-gradient-to-r from-pcs_blue to-teal hover:from-pcs_blue/90 hover:to-teal/90 text-white shadow-lg font-semibold">
                    {t('actions.view_resources')}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group h-full">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal to-green-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Lightbulb className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-teal transition-colors">{t('resources.evidence_guides_title')}</h3>
                  <p className="text-sm text-gray-600 mb-6">{t('resources.evidence_guides_description')}</p>
                  <ul className="space-y-3 text-sm flex-grow">
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-pcs_blue rounded-full"></div>
                      {t('resources.photo_video_guidelines')}
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-pcs_blue rounded-full"></div>
                      {t('resources.documentation_tips')}
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-pcs_blue rounded-full"></div>
                      {t('resources.best_practices')}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group h-full">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 bg-gradient-to-br from-coral to-red-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-coral transition-colors">{t('resources.program_stages_title')}</h3>
                  <p className="text-sm text-gray-600 mb-6">{t('resources.program_stages_description')}</p>
                  <ul className="space-y-3 text-sm flex-grow">
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-teal rounded-full"></div>
                      {t('stages.inspire_brief')}
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-yellow rounded-full"></div>
                      {t('stages.investigate_brief')}
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-coral rounded-full"></div>
                      {t('stages.act_brief')}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Helpful Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-pcs_blue" />
                  {t('tips.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">{t('tips.photo_guidelines_title')}</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• {t('tips.photo_clear')}</li>
                      <li>• {t('tips.photo_context')}</li>
                      <li>• {t('tips.photo_consent')}</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">{t('tips.documentation_title')}</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• {t('tips.doc_detailed')}</li>
                      <li>• {t('tips.doc_impact')}</li>
                      <li>• {t('tips.doc_reflections')}</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">{t('tips.video_best_practices_title')}</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• {t('tips.video_length')}</li>
                      <li>• {t('tips.video_stable')}</li>
                      <li>• {t('tips.video_captions')}</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">{t('tips.quick_wins_title')}</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• {t('tips.quick_submit')}</li>
                      <li>• {t('tips.quick_respond')}</li>
                      <li>• {t('tips.quick_collaborate')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Resources (if available) */}
            <Card>
              <CardHeader>
                <CardTitle>{t('resources.featured_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  {t('resources.featured_description')}
                </p>
                <Button 
                  className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                  onClick={() => window.location.href = '/resources'}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t('actions.explore_all_resources')}
                </Button>
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
                  <h2 className="text-2xl font-bold text-navy mb-3">{t('action_plan.empty_title', { ns: 'dashboard' })}</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {t('action_plan.empty_message', { ns: 'dashboard' })}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={handleAddPromiseClick}
                      className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white px-6 py-3 text-lg shadow-lg"
                      data-testid="button-add-first-promise"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      {t('actions.create_online_action_plan', { ns: 'dashboard' })}
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/api/printable-forms/action-plan'}
                      variant="outline"
                      className="px-6 py-3 text-lg shadow-lg border-2 border-teal text-teal hover:bg-teal hover:text-white"
                      data-testid="button-download-action-plan-form"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      {t('actions.download_printable_form', { ns: 'dashboard' })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Impact Summary */}
                {(() => {
                  const metrics = calculateAggregateMetrics(schoolPromises);
                  return (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-navy">{t('action_plan.impact_title', { ns: 'dashboard' })}</h2>
                        <Button
                          onClick={handleAddPromiseClick}
                          className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white shadow-lg"
                          data-testid="button-add-promise"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          {t('actions.add_action_item', { ns: 'dashboard' })}
                        </Button>
                      </div>

                      {/* Summary Cards */}
                      <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Card className="shadow-xl border-0 bg-gradient-to-br from-teal to-pcs_blue text-white cursor-help">
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                      <Target className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold opacity-90">{t('action_plan.total_items', { ns: 'dashboard' })}</div>
                                      <div className="text-3xl font-bold" data-testid="text-total-promises">
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
                              <Card className="shadow-xl border-0 bg-gradient-to-br from-green-500 to-green-600 text-white cursor-help">
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                      <TrendingDown className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold opacity-90">{t('action_plan.items_reduced_per_year', { ns: 'dashboard' })}</div>
                                      <div className="text-3xl font-bold" data-testid="text-items-reduced">
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
                              <Card className="shadow-xl border-0 bg-gradient-to-br from-coral to-red-400 text-white cursor-help">
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                      <Leaf className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-semibold opacity-90">{t('action_plan.weight_reduced_per_year', { ns: 'dashboard' })}</div>
                                      <div className="text-3xl font-bold" data-testid="text-weight-reduced">
                                        {metrics.seriousMetrics.kilograms.toFixed(1)} kg
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

                      {/* Fun & Serious Metrics */}
                      <TooltipProvider>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                          <Card className="shadow-lg border-0">
                            <CardHeader>
                              <CardTitle className="text-xl font-bold text-navy flex items-center gap-2">
                                🌊 {t('action_plan.ocean_impact', { ns: 'dashboard' })}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-blue-50 rounded-lg cursor-help">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.plastic_bottles_prevented', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-pcs_blue" data-testid="text-ocean-bottles">
                                      {Math.floor(metrics.funMetrics.oceanPlasticBottles).toLocaleString()}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_ocean_bottles')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-green-50 rounded-lg cursor-help">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.fish_potentially_saved', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-green-600" data-testid="text-fish-saved">
                                      {Math.floor(metrics.funMetrics.fishSaved).toLocaleString()}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_fish_saved')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-teal-50 rounded-lg cursor-help">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.sea_turtles_worth', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-teal" data-testid="text-sea-turtles">
                                      {metrics.funMetrics.seaTurtles.toFixed(3)}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_sea_turtles')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </CardContent>
                          </Card>

                          <Card className="shadow-lg border-0">
                            <CardHeader>
                              <CardTitle className="text-xl font-bold text-navy flex items-center gap-2">
                                📊 {t('action_plan.environmental_impact', { ns: 'dashboard' })}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-orange-50 rounded-lg cursor-help">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.co2_emissions_prevented', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-orange-600" data-testid="text-co2-prevented">
                                      {metrics.seriousMetrics.co2Prevented.toFixed(1)} kg
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_co2_prevented')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-purple-50 rounded-lg cursor-help">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.oil_saved', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-purple-600" data-testid="text-oil-saved">
                                      {metrics.seriousMetrics.oilSaved.toFixed(1)} liters
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>{t('action_plan.tooltip_oil_saved')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-4 bg-indigo-50 rounded-lg cursor-help">
                                    <p className="text-sm font-semibold text-navy mb-1">{t('action_plan.tons_plastic_prevented', { ns: 'dashboard' })}</p>
                                    <p className="text-2xl font-bold text-indigo-600" data-testid="text-tons-prevented">
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
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditPromise(promise)}
                                  className="h-8 w-8 p-0 hover:bg-pcs_blue/10"
                                  data-testid={`button-edit-promise-${promise.id}`}
                                >
                                  <Edit className="h-4 w-4 text-pcs_blue" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeletePromiseClick(promise.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  data-testid={`button-delete-promise-${promise.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
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
          onClose={() => setShowEvidenceForm(false)}
          schoolId={school.id}
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

      {/* Promise Form Dialog */}
      <Dialog open={promiseDialogOpen} onOpenChange={setPromiseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-promise-form">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-navy">
              {editingPromise ? t('promise_dialog.title_edit', { ns: 'dashboard' }) : t('promise_dialog.title_add', { ns: 'dashboard' })}
            </DialogTitle>
            <DialogDescription>
              {t('promise_dialog.description', { ns: 'dashboard' })}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...promiseForm}>
            <form onSubmit={promiseForm.handleSubmit(handlePromiseSubmit)} className="space-y-6">
              <FormField
                control={promiseForm.control}
                name="plasticItemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('promise_dialog.plastic_item_type', { ns: 'dashboard' })}</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-fill label with formatted version
                        if (!promiseForm.getValues('plasticItemLabel')) {
                          promiseForm.setValue('plasticItemLabel', value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-plastic-item-type">
                          <SelectValue placeholder={t('promise_dialog.select_plastic_item', { ns: 'dashboard' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.keys(PLASTIC_ITEM_WEIGHTS).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={promiseForm.control}
                name="plasticItemLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('promise_dialog.item_label', { ns: 'dashboard' })}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t('promise_dialog.item_label_placeholder', { ns: 'dashboard' })}
                        data-testid="input-plastic-item-label"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={promiseForm.control}
                  name="baselineQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('promise_dialog.baseline_quantity', { ns: 'dashboard' })}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder={t('promise_dialog.baseline_placeholder', { ns: 'dashboard' })}
                          data-testid="input-baseline-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={promiseForm.control}
                  name="targetQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('promise_dialog.target_quantity', { ns: 'dashboard' })}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder={t('promise_dialog.target_placeholder', { ns: 'dashboard' })}
                          data-testid="input-target-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={promiseForm.control}
                name="timeframeUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('promise_dialog.timeframe', { ns: 'dashboard' })}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeframe-unit">
                          <SelectValue placeholder={t('promise_dialog.select_timeframe', { ns: 'dashboard' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="week">{t('promise_dialog.per_week', { ns: 'dashboard' })}</SelectItem>
                        <SelectItem value="month">{t('promise_dialog.per_month', { ns: 'dashboard' })}</SelectItem>
                        <SelectItem value="year">{t('promise_dialog.per_year', { ns: 'dashboard' })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(() => {
                const baseline = promiseForm.watch('baselineQuantity');
                const target = promiseForm.watch('targetQuantity');
                const reduction = baseline - target;
                const reductionPercent = baseline > 0 ? ((reduction / baseline) * 100).toFixed(0) : 0;
                
                if (baseline > 0 && target >= 0) {
                  return (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-navy mb-2">{t('promise_dialog.reduction_preview', { ns: 'dashboard' })}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-2xl font-bold text-green-600">
                            {t('promise_dialog.items', { ns: 'dashboard', count: reduction })}
                          </p>
                          <p className="text-xs text-gray-600">
                            {t('promise_dialog.reduction_percent', { ns: 'dashboard', percent: reductionPercent })}
                          </p>
                        </div>
                        {reduction > 0 && (
                          <Badge className="bg-green-500 text-white">
                            {t('promise_dialog.great_goal', { ns: 'dashboard' })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <FormField
                control={promiseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('promise_dialog.notes_optional', { ns: 'dashboard' })}</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={t('promise_dialog.notes_placeholder', { ns: 'dashboard' })}
                        rows={3}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPromiseDialogOpen(false);
                    setEditingPromise(null);
                    promiseForm.reset();
                  }}
                  data-testid="button-cancel-promise"
                >
                  {t('actions.cancel', { ns: 'dashboard' })}
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white"
                  disabled={createPromiseMutation.isPending || updatePromiseMutation.isPending}
                  data-testid="button-save-promise"
                >
                  {createPromiseMutation.isPending || updatePromiseMutation.isPending
                    ? t('actions.saving', { ns: 'dashboard' })
                    : editingPromise
                    ? t('actions.update_action_item', { ns: 'dashboard' })
                    : t('actions.create_action_item', { ns: 'dashboard' })}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
