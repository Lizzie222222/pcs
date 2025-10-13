import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProgressTracker from "@/components/ProgressTracker";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import TeamManagement from "@/pages/TeamManagement";
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
  X,
  Lightbulb,
  Target,
  Leaf,
  TrendingDown,
  Edit,
  Plus,
  Video,
  Filter,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PLASTIC_ITEM_WEIGHTS, calculateAggregateMetrics } from "@/../../shared/plasticMetrics";
import type { ReductionPromise, InsertReductionPromise, AuditResponse, Event, EventRegistration } from "@/../../shared/schema";
import { format, isPast, isFuture, parseISO } from "date-fns";

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

interface AnalyticsData {
  reviewStats: {
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    averageReviewTimeHours: number;
  };
  submissionTrends: Array<{
    month: string;
    count: number;
  }>;
  teamContributions: Array<{
    userId: string;
    userName: string;
    submissionCount: number;
    approvedCount: number;
  }>;
  stageTimeline: Array<{
    stage: string;
    completedAt: string | null;
    daysToComplete: number;
  }>;
  fileTypeDistribution: {
    images: number;
    videos: number;
    pdfs: number;
    other: number;
  };
}

interface AuditAnalyticsData {
  hasAudit: boolean;
  totalPlasticItems: number;
  locationBreakdown: {
    lunchroom: number;
    staffroom: number;
    classrooms: number;
    bathrooms: number;
  };
  topProblemPlastics: Array<{
    name: string;
    count: number;
  }>;
  wasteManagement: {
    hasRecycling: boolean;
    recyclingBinLocations: string | null;
    plasticWasteDestination: string | null;
    hasComposting: boolean;
    hasPolicy: boolean;
    policyDetails: string | null;
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
  const [activeTab, setActiveTab] = useState<'progress' | 'analytics' | 'resources' | 'team' | 'promises' | 'events'>('progress');
  const [promiseDialogOpen, setPromiseDialogOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState<ReductionPromise | null>(null);
  const [deletePromiseDialogOpen, setDeletePromiseDialogOpen] = useState(false);
  const [promiseToDelete, setPromiseToDelete] = useState<string | null>(null);
  
  // Events state
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

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

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/schools', dashboardData?.school?.id, 'analytics'],
    enabled: activeTab === 'analytics' && !!dashboardData?.school?.id,
  });

  const { data: auditAnalyticsData, isLoading: auditAnalyticsLoading } = useQuery<AuditAnalyticsData>({
    queryKey: ['/api/schools', dashboardData?.school?.id, 'audit-analytics'],
    enabled: activeTab === 'analytics' && !!dashboardData?.school?.id,
    retry: false,
  });

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

  // Fetch all promises for school (for Our Promises tab)
  const { data: schoolPromises = [], isLoading: promisesLoading } = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/school', dashboardData?.school?.id],
    enabled: activeTab === 'promises' && !!dashboardData?.school?.id,
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
    plasticItemType: z.string().min(1, "Please select a plastic item type"),
    plasticItemLabel: z.string().min(1, "Please provide a label for the plastic item"),
    baselineQuantity: z.number().min(1, "Baseline quantity must be at least 1"),
    targetQuantity: z.number().min(0, "Target quantity must be at least 0"),
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
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/school', dashboardData?.school?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit'] });
      toast({
        title: "Success",
        description: "Reduction promise created successfully!",
      });
      setPromiseDialogOpen(false);
      setEditingPromise(null);
      promiseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create reduction promise",
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
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/school', dashboardData?.school?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit'] });
      toast({
        title: "Success",
        description: "Reduction promise updated successfully!",
      });
      setPromiseDialogOpen(false);
      setEditingPromise(null);
      promiseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update reduction promise",
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
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/school', dashboardData?.school?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/reduction-promises/audit'] });
      toast({
        title: "Success",
        description: "Reduction promise deleted successfully!",
      });
      setDeletePromiseDialogOpen(false);
      setPromiseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete reduction promise",
        variant: "destructive",
      });
      setDeletePromiseDialogOpen(false);
      setPromiseToDelete(null);
    },
  });

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

  // Events queries and mutations
  const { data: upcomingEvents = [], isLoading: upcomingEventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events/upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/events/upcoming?limit=6');
      if (!response.ok) throw new Error('Failed to fetch upcoming events');
      return response.json();
    },
    enabled: activeTab === 'events',
    retry: false,
  });

  const { data: filteredEvents = [], isLoading: filteredEventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events', eventFilter, showAllEvents],
    queryFn: async () => {
      const params = new URLSearchParams({ upcoming: 'true' });
      if (eventFilter !== 'all') {
        params.append('eventType', eventFilter);
      }
      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: activeTab === 'events' && showAllEvents,
    retry: false,
  });

  const { data: myEvents = [], isLoading: myEventsLoading } = useQuery<Array<EventRegistration & { event: Event }>>({
    queryKey: ['/api/my-events'],
    enabled: activeTab === 'events' && isAuthenticated,
    retry: false,
  });

  const { data: selectedEventDetails } = useQuery<Event & { registrations?: EventRegistration[], registrationsCount?: number }>({
    queryKey: ['/api/events', selectedEvent?.id],
    enabled: !!selectedEvent?.id && eventDetailOpen,
    retry: false,
  });

  const registerEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('POST', `/api/events/${eventId}/register`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-events'] });
      toast({
        title: "Success",
        description: "Successfully registered for event!",
      });
      setEventDetailOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error?.message || "Failed to register for event",
        variant: "destructive",
      });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      return apiRequest('DELETE', `/api/events/registrations/${registrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-events'] });
      toast({
        title: "Success",
        description: "Registration cancelled successfully",
      });
      setEventDetailOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to cancel registration",
        variant: "destructive",
      });
    },
  });

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  const handleRegisterForEvent = () => {
    if (selectedEvent) {
      registerEventMutation.mutate(selectedEvent.id);
    }
  };

  const handleCancelRegistration = () => {
    if (!selectedEventDetails) return;
    const userRegistration = myEvents.find(reg => 
      reg.eventId === selectedEvent?.id && 
      (reg.status === 'registered' || reg.status === 'waitlisted')
    );
    if (userRegistration) {
      cancelEventMutation.mutate(userRegistration.id);
    }
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="mb-10">
          <div className="bg-white rounded-xl shadow-lg p-3 flex gap-3 border border-gray-100">
            <Button
              variant={activeTab === 'progress' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold ${
                activeTab === 'progress' 
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('progress')}
              data-testid="tab-progress"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Progress
            </Button>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold ${
                activeTab === 'analytics' 
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('analytics')}
              data-testid="tab-analytics"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Analytics
            </Button>
            <Button
              variant={activeTab === 'resources' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold ${
                activeTab === 'resources' 
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('resources')}
              data-testid="tab-resources"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Resources
            </Button>
            <Button
              variant={activeTab === 'team' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold ${
                activeTab === 'team' 
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('team')}
              data-testid="tab-team"
            >
              <Users className="h-5 w-5 mr-2" />
              Team
            </Button>
            <Button
              variant={activeTab === 'promises' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold ${
                activeTab === 'promises' 
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('promises')}
              data-testid="tab-promises"
            >
              <Target className="h-5 w-5 mr-2" />
              Our Promises
            </Button>
            <Button
              variant={activeTab === 'events' ? 'default' : 'ghost'}
              className={`flex-1 transition-all duration-300 font-semibold ${
                activeTab === 'events' 
                  ? 'bg-gradient-to-r from-pcs_blue to-teal text-white shadow-lg scale-105' 
                  : 'text-gray-600 hover:text-navy hover:bg-gray-50 hover:scale-102'
              }`}
              onClick={() => setActiveTab('events')}
              data-testid="tab-events"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Events
            </Button>
          </div>
        </div>

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
                          🎉 You've completed your plastic waste audit!
                        </h3>
                        <p className="text-gray-700">
                          Make your reduction promises to start tracking your impact and see the difference your school can make.
                        </p>
                      </div>
                      <Button
                        onClick={() => setActiveTab('promises')}
                        className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white w-fit"
                        data-testid="button-make-promises-now"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Make Promises Now
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
                            🎉 Evidence Approved!
                          </h3>
                          <p className="text-sm text-green-800">
                            {recentApproved.length} {recentApproved.length === 1 ? 'submission has' : 'submissions have'} been approved in the last 7 days. Great work!
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
                            Action Required
                          </h3>
                          <p className="text-sm text-red-800">
                            {recentRejected.length} {recentRejected.length === 1 ? 'submission needs' : 'submissions need'} your attention. Please review feedback and resubmit.
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
                      🎉 Congratulations!
                    </h2>
                    <p className="text-xl text-gray-700 mb-6">
                      You've completed Round {school.currentRound}!
                    </p>
                    <div className="space-y-4">
                      <div className="bg-white/80 backdrop-blur rounded-lg p-4 inline-block">
                        <p className="text-sm text-gray-600 mb-2">Your school has successfully:</p>
                        <div className="flex items-center gap-2 text-green-600 font-semibold">
                          <CheckCircle className="h-5 w-5" />
                          <span>Completed all 3 stages (Inspire → Investigate → Act)</span>
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
                                  title: "Error",
                                  description: "Failed to start new round",
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to start new round",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-start-new-round"
                        >
                          Start Round {(school.currentRound || 1) + 1} →
                        </Button>
                        <p className="text-xs text-gray-500 mt-3">
                          Starting a new round will reset your progress and begin fresh
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
                      Your Certificates
                    </CardTitle>
                    <p className="text-sm text-gray-600">Download and share your achievements</p>
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
                                Certificate #{cert.certificateNumber}
                              </p>
                              <p className="text-xs text-gray-600 mb-3">
                                Completed: {new Date(cert.completedDate).toLocaleDateString()}
                              </p>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                                onClick={() => window.open(`/api/certificates/${cert.id}`, '_blank')}
                                data-testid={`button-view-certificate-${cert.id}`}
                              >
                                View Certificate
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

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {auditAnalyticsLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
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
                <Card className="shadow-lg border-0">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-64 bg-gray-100 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : !auditAnalyticsData || !auditAnalyticsData.hasAudit ? (
              <Card className="shadow-lg border-0">
                <CardContent className="p-12 text-center">
                  <div className="mb-4">
                    <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-10 w-10 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-gray-800 mb-2">No Analytics Available Yet</p>
                  <p className="text-gray-600">Complete your plastic waste audit to see analytics</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Total Plastic Items - Hero Stat */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-pcs_blue via-teal to-pcs_blue text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <CardContent className="p-12 relative z-10">
                    <div className="text-center">
                      <div className="text-sm font-semibold mb-2 text-white/80 uppercase tracking-wide">Plastic Waste Audit Results</div>
                      <div className="text-7xl font-bold mb-3" data-testid="text-total-plastic-items">
                        {auditAnalyticsData.totalPlasticItems}
                      </div>
                      <div className="text-2xl font-semibold">Total Plastic Items Identified</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Breakdown - Bar Chart */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-navy">Plastic Items by Location</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { location: 'Lunchroom', count: auditAnalyticsData.locationBreakdown.lunchroom },
                          { location: 'Staffroom', count: auditAnalyticsData.locationBreakdown.staffroom },
                          { location: 'Classrooms', count: auditAnalyticsData.locationBreakdown.classrooms },
                          { location: 'Bathrooms', count: auditAnalyticsData.locationBreakdown.bathrooms },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="location" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Bar dataKey="count" fill="url(#locationGradient)" radius={[8, 8, 0, 0]} />
                          <defs>
                            <linearGradient id="locationGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#009ADE" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#00BBB4" stopOpacity={1}/>
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Problem Plastics */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-navy">Top 5 Problem Plastics</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {auditAnalyticsData.topProblemPlastics.length > 0 ? (
                      <div className="space-y-4">
                        {auditAnalyticsData.topProblemPlastics.map((plastic, index) => (
                          <div key={index} className="flex items-center gap-4" data-testid={`problem-plastic-${index}`}>
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-coral to-red-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-navy text-lg">{plastic.name}</div>
                              <div className="h-3 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-coral to-red-400"
                                  style={{ 
                                    width: `${(plastic.count / auditAnalyticsData.topProblemPlastics[0].count) * 100}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-3xl font-bold text-coral">{plastic.count}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-8">No plastic items identified</p>
                    )}
                  </CardContent>
                </Card>

                {/* Waste Management Practices */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-navy">Waste Management Practices</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className={`p-6 rounded-xl border-2 ${auditAnalyticsData.wasteManagement.hasRecycling ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full ${auditAnalyticsData.wasteManagement.hasRecycling ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center`}>
                            {auditAnalyticsData.wasteManagement.hasRecycling ? (
                              <CheckCircle className="h-6 w-6 text-white" />
                            ) : (
                              <X className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="font-semibold text-lg text-navy">Recycling</div>
                        </div>
                        <div className="text-sm text-gray-700">
                          {auditAnalyticsData.wasteManagement.hasRecycling 
                            ? `Available${auditAnalyticsData.wasteManagement.recyclingBinLocations ? `: ${auditAnalyticsData.wasteManagement.recyclingBinLocations}` : ''}`
                            : 'Not available'}
                        </div>
                      </div>

                      <div className={`p-6 rounded-xl border-2 ${auditAnalyticsData.wasteManagement.hasComposting ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full ${auditAnalyticsData.wasteManagement.hasComposting ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center`}>
                            {auditAnalyticsData.wasteManagement.hasComposting ? (
                              <CheckCircle className="h-6 w-6 text-white" />
                            ) : (
                              <X className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="font-semibold text-lg text-navy">Composting</div>
                        </div>
                        <div className="text-sm text-gray-700">
                          {auditAnalyticsData.wasteManagement.hasComposting ? 'Available' : 'Not available'}
                        </div>
                      </div>

                      <div className={`p-6 rounded-xl border-2 ${auditAnalyticsData.wasteManagement.hasPolicy ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-full ${auditAnalyticsData.wasteManagement.hasPolicy ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center`}>
                            {auditAnalyticsData.wasteManagement.hasPolicy ? (
                              <CheckCircle className="h-6 w-6 text-white" />
                            ) : (
                              <X className="h-6 w-6 text-white" />
                            )}
                          </div>
                          <div className="font-semibold text-lg text-navy">Reduction Policy</div>
                        </div>
                        <div className="text-sm text-gray-700">
                          {auditAnalyticsData.wasteManagement.hasPolicy 
                            ? `In place${auditAnalyticsData.wasteManagement.policyDetails ? `: ${auditAnalyticsData.wasteManagement.policyDetails}` : ''}`
                            : 'Not in place'}
                        </div>
                      </div>
                    </div>

                    {auditAnalyticsData.wasteManagement.plasticWasteDestination && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="font-semibold text-navy mb-2">Plastic Waste Destination</div>
                        <div className="text-sm text-gray-700">{auditAnalyticsData.wasteManagement.plasticWasteDestination}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
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
                  <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-pcs_blue transition-colors">Browse All Resources</h3>
                  <p className="text-sm text-gray-600 mb-6 flex-grow">Access our complete library of educational materials and guides</p>
                  <Button className="w-full bg-gradient-to-r from-pcs_blue to-teal hover:from-pcs_blue/90 hover:to-teal/90 text-white shadow-lg font-semibold">
                    View Resources →
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group h-full">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal to-green-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Lightbulb className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-teal transition-colors">Evidence Guides</h3>
                  <p className="text-sm text-gray-600 mb-6">Learn how to submit quality evidence for each stage</p>
                  <ul className="space-y-3 text-sm flex-grow">
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-pcs_blue rounded-full"></div>
                      Photo & video guidelines
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-pcs_blue rounded-full"></div>
                      Documentation tips
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-pcs_blue rounded-full"></div>
                      Best practices
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group h-full">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 bg-gradient-to-br from-coral to-red-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-navy mb-3 group-hover:text-coral transition-colors">Program Stages</h3>
                  <p className="text-sm text-gray-600 mb-6">Understand each stage of the program</p>
                  <ul className="space-y-3 text-sm flex-grow">
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-teal rounded-full"></div>
                      Inspire: Build awareness
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-yellow rounded-full"></div>
                      Investigate: Research
                    </li>
                    <li className="flex items-center gap-3 text-gray-700 font-medium">
                      <div className="w-2 h-2 bg-coral rounded-full"></div>
                      Act: Create change
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
                  Helpful Tips for Evidence Submission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">📸 Photo Guidelines</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Ensure images are clear and well-lit</li>
                      <li>• Include context (date, location if relevant)</li>
                      <li>• Get parental consent for children's photos</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">📝 Documentation Tips</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Write detailed descriptions</li>
                      <li>• Explain the impact of your actions</li>
                      <li>• Include student reflections when possible</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">🎥 Video Best Practices</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Keep videos under 5 minutes</li>
                      <li>• Use stable camera positioning</li>
                      <li>• Include narration or captions</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-navy mb-2">⚡ Quick Wins</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Submit evidence promptly</li>
                      <li>• Respond to feedback quickly</li>
                      <li>• Collaborate with your team</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Resources (if available) */}
            <Card>
              <CardHeader>
                <CardTitle>Featured Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">
                  Access our curated collection of resources to help your school succeed in the Plastic Clever Schools program.
                </p>
                <Button 
                  className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                  onClick={() => window.location.href = '/resources'}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Explore All Resources
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Tab Content */}
        {activeTab === 'team' && (
          <div className="mb-8">
            <TeamManagement />
          </div>
        )}

        {/* Our Promises Tab Content */}
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
                  <h2 className="text-2xl font-bold text-navy mb-3">No Reduction Promises Yet</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    You haven't made any reduction promises yet. Complete an audit and make your first promises to start tracking your impact!
                  </p>
                  <Button
                    onClick={handleAddPromiseClick}
                    className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white px-6 py-3 text-lg shadow-lg"
                    data-testid="button-add-first-promise"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Make Your First Promise
                  </Button>
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
                        <h2 className="text-3xl font-bold text-navy">Our Promises Impact</h2>
                        <Button
                          onClick={handleAddPromiseClick}
                          className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white shadow-lg"
                          data-testid="button-add-promise"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add Promise
                        </Button>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="shadow-xl border-0 bg-gradient-to-br from-teal to-pcs_blue text-white">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <Target className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold opacity-90">Total Promises</div>
                                <div className="text-3xl font-bold" data-testid="text-total-promises">
                                  {schoolPromises.length}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="shadow-xl border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <TrendingDown className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold opacity-90">Items Reduced/Year</div>
                                <div className="text-3xl font-bold" data-testid="text-items-reduced">
                                  {metrics.byItemType.reduce((sum, item) => sum + item.totalReduction, 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="shadow-xl border-0 bg-gradient-to-br from-coral to-red-400 text-white">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <Leaf className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold opacity-90">Weight Reduced/Year</div>
                                <div className="text-3xl font-bold" data-testid="text-weight-reduced">
                                  {metrics.seriousMetrics.kilograms.toFixed(1)} kg
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Fun & Serious Metrics */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <Card className="shadow-lg border-0">
                          <CardHeader>
                            <CardTitle className="text-xl font-bold text-navy flex items-center gap-2">
                              🌊 Ocean Impact
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm font-semibold text-navy mb-1">Plastic Bottles Prevented</p>
                              <p className="text-2xl font-bold text-pcs_blue" data-testid="text-ocean-bottles">
                                {Math.floor(metrics.funMetrics.oceanPlasticBottles).toLocaleString()}
                              </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                              <p className="text-sm font-semibold text-navy mb-1">Fish Potentially Saved</p>
                              <p className="text-2xl font-bold text-green-600" data-testid="text-fish-saved">
                                {Math.floor(metrics.funMetrics.fishSaved).toLocaleString()}
                              </p>
                            </div>
                            <div className="p-4 bg-teal-50 rounded-lg">
                              <p className="text-sm font-semibold text-navy mb-1">Sea Turtles Worth of Plastic</p>
                              <p className="text-2xl font-bold text-teal" data-testid="text-sea-turtles">
                                {metrics.funMetrics.seaTurtles.toFixed(3)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="shadow-lg border-0">
                          <CardHeader>
                            <CardTitle className="text-xl font-bold text-navy flex items-center gap-2">
                              📊 Environmental Impact
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="p-4 bg-orange-50 rounded-lg">
                              <p className="text-sm font-semibold text-navy mb-1">CO₂ Emissions Prevented</p>
                              <p className="text-2xl font-bold text-orange-600" data-testid="text-co2-prevented">
                                {metrics.seriousMetrics.co2Prevented.toFixed(1)} kg
                              </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                              <p className="text-sm font-semibold text-navy mb-1">Oil Saved</p>
                              <p className="text-2xl font-bold text-purple-600" data-testid="text-oil-saved">
                                {metrics.seriousMetrics.oilSaved.toFixed(1)} liters
                              </p>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-lg">
                              <p className="text-sm font-semibold text-navy mb-1">Tons of Plastic Prevented</p>
                              <p className="text-2xl font-bold text-indigo-600" data-testid="text-tons-prevented">
                                {metrics.seriousMetrics.tons.toFixed(4)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  );
                })()}

                {/* Promise Cards */}
                <div>
                  <h3 className="text-2xl font-bold text-navy mb-6">Active Promises</h3>
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
                                <p className="text-xs text-gray-600 mb-1">Baseline</p>
                                <p className="text-lg font-bold text-navy" data-testid={`text-baseline-${promise.id}`}>
                                  {promise.baselineQuantity}
                                </p>
                                <p className="text-xs text-gray-500">per {promise.timeframeUnit}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-600 mb-1">Target</p>
                                <p className="text-lg font-bold text-navy" data-testid={`text-target-${promise.id}`}>
                                  {promise.targetQuantity}
                                </p>
                                <p className="text-xs text-gray-500">per {promise.timeframeUnit}</p>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-navy">Reduction Goal</p>
                                <Badge className="bg-green-500 text-white">
                                  -{reductionPercent}%
                                </Badge>
                              </div>
                              <p className="text-2xl font-bold text-green-600" data-testid={`text-reduction-${promise.id}`}>
                                {reduction} items
                              </p>
                            </div>

                            {promise.notes && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Notes</p>
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
          <div className="space-y-8">
            {/* Filter and Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold text-navy mb-2">Upcoming Events</h2>
                <p className="text-gray-600">Join workshops, webinars, and community events</p>
              </div>
              <div className="flex items-center gap-3">
                <Filter className="h-5 w-5 text-gray-500" />
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-48" data-testid="select-event-filter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="workshop">Workshops</SelectItem>
                    <SelectItem value="webinar">Webinars</SelectItem>
                    <SelectItem value="community_event">Community Events</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="celebration">Celebrations</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upcoming Events Grid */}
            {upcomingEventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="shadow-lg border-0">
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-3">
                        <div className="h-40 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <Card className="shadow-lg border-0">
                <CardContent className="p-12 text-center">
                  <div className="mb-6">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pcs_blue/20 to-teal/20 rounded-full flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-pcs_blue" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-navy mb-3">No Upcoming Events</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    There are no upcoming events at the moment. Check back soon for new workshops, webinars, and community events!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(showAllEvents ? filteredEvents : upcomingEvents).map((event) => {
                    const eventDate = new Date(event.startDateTime);
                    const isEventPast = isPast(eventDate);
                    const registrationsCount = (event as any).registrationsCount || 0;
                    const spotsLeft = event.capacity ? event.capacity - registrationsCount : null;
                    const isFull = event.capacity && registrationsCount >= event.capacity;
                    const userRegistration = myEvents.find(reg => reg.eventId === event.id);
                    
                    return (
                      <Card 
                        key={event.id} 
                        className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                        onClick={() => handleEventClick(event)}
                        data-testid={`event-card-${event.id}`}
                      >
                        {event.imageUrl && (
                          <div className="w-full h-48 overflow-hidden relative">
                            <img 
                              src={event.imageUrl} 
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute top-3 right-3">
                              <Badge className={`
                                ${event.eventType === 'workshop' ? 'bg-blue-500' : ''}
                                ${event.eventType === 'webinar' ? 'bg-purple-500' : ''}
                                ${event.eventType === 'community_event' ? 'bg-green-500' : ''}
                                ${event.eventType === 'training' ? 'bg-orange-500' : ''}
                                ${event.eventType === 'celebration' ? 'bg-pink-500' : ''}
                                ${event.eventType === 'other' ? 'bg-gray-500' : ''}
                                text-white shadow-lg
                              `}>
                                {event.eventType.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>
                        )}
                        <CardContent className="p-6 space-y-3">
                          <h3 className="text-lg font-bold text-navy group-hover:text-pcs_blue transition-colors line-clamp-2">
                            {event.title}
                          </h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                              <span>{format(eventDate, 'PPP')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                              <span>{format(eventDate, 'p')}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                {event.isVirtual ? (
                                  <Video className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                                ) : (
                                  <MapPin className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                                )}
                                <span className="line-clamp-1">{event.location}</span>
                              </div>
                            )}
                            {event.capacity && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                                {isFull && !event.waitlistEnabled ? (
                                  <span className="text-red-600 font-semibold">Event Full</span>
                                ) : isFull && event.waitlistEnabled ? (
                                  <span className="text-orange-600 font-semibold">Waitlist Available</span>
                                ) : (
                                  <span>{spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left</span>
                                )}
                              </div>
                            )}
                          </div>
                          {userRegistration && (
                            <Badge className={`
                              ${userRegistration.status === 'registered' ? 'bg-green-500' : ''}
                              ${userRegistration.status === 'waitlisted' ? 'bg-orange-500' : ''}
                              ${userRegistration.status === 'attended' ? 'bg-blue-500' : ''}
                              text-white
                            `} data-testid={`badge-registration-status-${event.id}`}>
                              {userRegistration.status === 'registered' && '✓ Registered'}
                              {userRegistration.status === 'waitlisted' && 'Waitlisted'}
                              {userRegistration.status === 'attended' && 'Attended'}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {!showAllEvents && upcomingEvents.length >= 6 && (
                  <div className="text-center pt-6">
                    <Button
                      onClick={() => setShowAllEvents(true)}
                      className="bg-gradient-to-r from-pcs_blue to-teal hover:from-pcs_blue/90 hover:to-teal/90 text-white px-8 py-6 text-lg shadow-lg"
                      data-testid="button-view-all-events"
                    >
                      <ExternalLink className="h-5 w-5 mr-2" />
                      View All Events
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* My Events Section */}
            <div className="mt-12">
              <h2 className="text-3xl font-bold text-navy mb-6">My Events</h2>
              {myEventsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-lg border-0">
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : myEvents.length === 0 ? (
                <Card className="shadow-lg border-0">
                  <CardContent className="p-8 text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Registered Events</h3>
                    <p className="text-gray-500">You haven't registered for any events yet. Browse upcoming events and join us!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const sortedEvents = [...myEvents].sort((a, b) => {
                      const dateA = new Date(a.event.startDateTime);
                      const dateB = new Date(b.event.startDateTime);
                      const nowDate = new Date();
                      const aIsPast = dateA < nowDate;
                      const bIsPast = dateB < nowDate;
                      
                      if (aIsPast && !bIsPast) return 1;
                      if (!aIsPast && bIsPast) return -1;
                      return dateA.getTime() - dateB.getTime();
                    });

                    return sortedEvents.map((registration) => {
                      const eventDate = new Date(registration.event.startDateTime);
                      const isEventPast = isPast(eventDate);
                      const isEventFuture = isFuture(eventDate);
                      
                      return (
                        <Card 
                          key={registration.id} 
                          className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={() => handleEventClick(registration.event)}
                          data-testid={`my-event-${registration.id}`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-bold text-navy">{registration.event.title}</h3>
                                  <Badge className={`
                                    ${registration.status === 'registered' ? 'bg-green-500' : ''}
                                    ${registration.status === 'waitlisted' ? 'bg-orange-500' : ''}
                                    ${registration.status === 'attended' ? 'bg-blue-500' : ''}
                                    ${registration.status === 'cancelled' ? 'bg-gray-500' : ''}
                                    text-white
                                  `} data-testid={`badge-status-${registration.id}`}>
                                    {registration.status === 'registered' && 'Registered'}
                                    {registration.status === 'waitlisted' && 'Waitlisted'}
                                    {registration.status === 'attended' && 'Attended'}
                                    {registration.status === 'cancelled' && 'Cancelled'}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-pcs_blue" />
                                    <span>{format(eventDate, 'PPP')} at {format(eventDate, 'p')}</span>
                                  </div>
                                  {registration.event.location && (
                                    <div className="flex items-center gap-2">
                                      {registration.event.isVirtual ? (
                                        <Video className="h-4 w-4 text-pcs_blue" />
                                      ) : (
                                        <MapPin className="h-4 w-4 text-pcs_blue" />
                                      )}
                                      <span>{registration.event.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isEventFuture && registration.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEventMutation.mutate(registration.id);
                                  }}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                                  data-testid={`button-cancel-${registration.id}`}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
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
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promise Form Dialog */}
      <Dialog open={promiseDialogOpen} onOpenChange={setPromiseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-promise-form">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-navy">
              {editingPromise ? 'Edit Reduction Promise' : 'Add Reduction Promise'}
            </DialogTitle>
            <DialogDescription>
              Set a goal to reduce plastic waste at your school. Choose a plastic item type and set your reduction targets.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...promiseForm}>
            <form onSubmit={promiseForm.handleSubmit(handlePromiseSubmit)} className="space-y-6">
              <FormField
                control={promiseForm.control}
                name="plasticItemType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plastic Item Type *</FormLabel>
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
                          <SelectValue placeholder="Select plastic item type" />
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
                    <FormLabel>Item Label *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Single-use water bottles"
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
                      <FormLabel>Baseline Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="Current usage"
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
                      <FormLabel>Target Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          placeholder="Reduction goal"
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
                    <FormLabel>Timeframe *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timeframe-unit">
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="week">Per Week</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
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
                      <p className="text-sm font-semibold text-navy mb-2">Reduction Preview</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-2xl font-bold text-green-600">
                            {reduction} items
                          </p>
                          <p className="text-xs text-gray-600">
                            {reductionPercent}% reduction
                          </p>
                        </div>
                        {reduction > 0 && (
                          <Badge className="bg-green-500 text-white">
                            Great Goal!
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add any additional notes about this promise..."
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-teal to-pcs_blue hover:from-teal/90 hover:to-pcs_blue/90 text-white"
                  disabled={createPromiseMutation.isPending || updatePromiseMutation.isPending}
                  data-testid="button-save-promise"
                >
                  {createPromiseMutation.isPending || updatePromiseMutation.isPending
                    ? 'Saving...'
                    : editingPromise
                    ? 'Update Promise'
                    : 'Create Promise'}
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
            <AlertDialogTitle>Are you sure you want to delete this promise?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your reduction promise and remove it from your impact calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setPromiseToDelete(null)}
              data-testid="button-cancel-delete-promise"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePromiseConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePromiseMutation.isPending}
              data-testid="button-confirm-delete-promise"
            >
              {deletePromiseMutation.isPending ? 'Deleting...' : 'Delete Promise'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Detail Modal - Luma Style */}
      {selectedEvent && (
        <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0 overflow-hidden" data-testid="dialog-event-detail">
            {/* Hero Image Section */}
            {selectedEvent.imageUrl ? (
              <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden">
                <img 
                  src={selectedEvent.imageUrl} 
                  alt={selectedEvent.title}
                  className="w-full h-full object-cover"
                />
                {/* Gradient Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                
                {/* Title Overlay on Image */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                    {selectedEvent.title}
                  </h2>
                  <Badge className={`
                    ${selectedEvent.eventType === 'workshop' ? 'bg-blue-500' : ''}
                    ${selectedEvent.eventType === 'webinar' ? 'bg-purple-500' : ''}
                    ${selectedEvent.eventType === 'community_event' ? 'bg-green-500' : ''}
                    ${selectedEvent.eventType === 'training' ? 'bg-orange-500' : ''}
                    ${selectedEvent.eventType === 'celebration' ? 'bg-pink-500' : ''}
                    ${selectedEvent.eventType === 'other' ? 'bg-gray-500' : ''}
                    text-white text-base px-4 py-1.5 shadow-xl
                  `}>
                    {selectedEvent.eventType.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            ) : (
              // Gradient Background if no image
              <div className={`relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gradient-to-br
                ${selectedEvent.eventType === 'workshop' ? 'from-blue-500 to-blue-700' : ''}
                ${selectedEvent.eventType === 'webinar' ? 'from-purple-500 to-purple-700' : ''}
                ${selectedEvent.eventType === 'community_event' ? 'from-green-500 to-green-700' : ''}
                ${selectedEvent.eventType === 'training' ? 'from-orange-500 to-orange-700' : ''}
                ${selectedEvent.eventType === 'celebration' ? 'from-pink-500 to-pink-700' : ''}
                ${selectedEvent.eventType === 'other' ? 'from-gray-500 to-gray-700' : ''}
              `}>
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                    {selectedEvent.title}
                  </h2>
                  <Badge className="bg-white/20 backdrop-blur-sm text-white text-base px-4 py-1.5 border border-white/30">
                    {selectedEvent.eventType.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            )}

            {/* Two-Column Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 md:p-12 overflow-y-auto max-h-[calc(95vh-400px)] md:max-h-[calc(95vh-500px)]">
              {/* Left Column - Description & Details (2/3 width) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description Section */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-navy flex items-center gap-3">
                    <Lightbulb className="h-7 w-7 text-pcs_blue" />
                    About This Event
                  </h3>
                  <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Meeting Link for Registered Virtual Events */}
                {selectedEvent.isVirtual && selectedEvent.meetingLink && (() => {
                  const userRegistration = myEvents.find(reg => 
                    reg.eventId === selectedEvent.id && 
                    (reg.status === 'registered' || reg.status === 'waitlisted')
                  );
                  
                  if (userRegistration) {
                    return (
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-md">
                        <div className="flex items-center gap-3 mb-4">
                          <Video className="h-6 w-6 text-blue-600" />
                          <h4 className="text-xl font-bold text-navy">Meeting Link</h4>
                        </div>
                        <a
                          href={selectedEvent.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg hover:underline transition-colors"
                          data-testid="link-meeting"
                        >
                          <span>Join Virtual Event</span>
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Registration Status Banner */}
                {(() => {
                  const userRegistration = myEvents.find(reg => reg.eventId === selectedEvent.id);
                  
                  if (userRegistration && userRegistration.status !== 'cancelled') {
                    return (
                      <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl border-2 border-green-200 shadow-md">
                        <div className="flex items-center gap-4">
                          <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                          <div>
                            <h4 className="text-xl font-bold text-navy mb-1">
                              {userRegistration.status === 'registered' && 'You\'re Registered!'}
                              {userRegistration.status === 'waitlisted' && 'You\'re on the Waitlist'}
                              {userRegistration.status === 'attended' && 'You Attended This Event'}
                            </h4>
                            <p className="text-gray-600">
                              {userRegistration.status === 'registered' && 'Looking forward to seeing you there!'}
                              {userRegistration.status === 'waitlisted' && 'We\'ll notify you if a spot opens up'}
                              {userRegistration.status === 'attended' && 'Thank you for participating!'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Right Column - Info Card (1/3 width, sticky on desktop) */}
              <div className="lg:col-span-1">
                <Card className="sticky top-0 shadow-xl border-gray-200">
                  <CardContent className="p-6 space-y-6">
                    {/* Date & Time */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <Calendar className="h-6 w-6 text-pcs_blue" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                          <p className="text-base font-bold text-navy">
                            {format(new Date(selectedEvent.startDateTime), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <div className="pl-14">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Time</p>
                        <p className="text-base font-semibold text-navy">
                          {format(new Date(selectedEvent.startDateTime), 'p')} - {format(new Date(selectedEvent.endDateTime), 'p')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedEvent.timezone || 'UTC'}
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-gray-200"></div>

                    {/* Location */}
                    {selectedEvent.location && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-purple-50 rounded-xl flex-shrink-0">
                            {selectedEvent.isVirtual ? (
                              <Video className="h-6 w-6 text-purple-600" />
                            ) : (
                              <MapPin className="h-6 w-6 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Location</p>
                            <p className="text-base font-semibold text-navy">{selectedEvent.location}</p>
                            {selectedEvent.isVirtual && (
                              <Badge className="bg-purple-100 text-purple-700 mt-2">
                                Virtual Event
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="h-px bg-gray-200"></div>
                      </>
                    )}

                    {/* Capacity */}
                    {selectedEvent.capacity && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-green-50 rounded-xl flex-shrink-0">
                            <Users className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Capacity</p>
                            {(() => {
                              const registrationsCount = (selectedEventDetails as any)?.registrationsCount || 0;
                              const spotsLeft = selectedEvent.capacity - registrationsCount;
                              const isFull = registrationsCount >= selectedEvent.capacity;
                              
                              return (
                                <>
                                  <p className="text-base font-semibold text-navy mb-2">
                                    {selectedEvent.capacity} total spots
                                  </p>
                                  {isFull && !selectedEvent.waitlistEnabled ? (
                                    <Badge className="bg-red-500 text-white">Event Full</Badge>
                                  ) : isFull && selectedEvent.waitlistEnabled ? (
                                    <Badge className="bg-orange-500 text-white">Waitlist Available</Badge>
                                  ) : (
                                    <p className="text-sm font-bold text-green-600">
                                      {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} available
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="h-px bg-gray-200"></div>
                      </>
                    )}

                    {/* Registration Deadline */}
                    {selectedEvent.registrationDeadline && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-orange-50 rounded-xl flex-shrink-0">
                            <Clock className="h-6 w-6 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Registration Deadline</p>
                            <p className="text-base font-semibold text-navy mb-2">
                              {format(new Date(selectedEvent.registrationDeadline), 'PPP')}
                            </p>
                            {isPast(new Date(selectedEvent.registrationDeadline)) && (
                              <Badge className="bg-red-500 text-white">Deadline Passed</Badge>
                            )}
                          </div>
                        </div>
                        <div className="h-px bg-gray-200"></div>
                      </>
                    )}

                    {/* CTA Button */}
                    <div className="pt-2">
                      {(() => {
                        const eventDate = new Date(selectedEvent.startDateTime);
                        const isEventPast = isPast(eventDate);
                        const userRegistration = myEvents.find(reg => reg.eventId === selectedEvent.id);
                        const isRegistered = userRegistration && (userRegistration.status === 'registered' || userRegistration.status === 'waitlisted');
                        const registrationsCount = (selectedEventDetails as any)?.registrationsCount || 0;
                        const isFull = selectedEvent.capacity && registrationsCount >= selectedEvent.capacity;
                        const deadlinePassed = selectedEvent.registrationDeadline && isPast(new Date(selectedEvent.registrationDeadline));

                        if (isEventPast) {
                          return (
                            <div className="p-4 bg-gray-50 rounded-xl text-center">
                              <p className="text-gray-500 font-medium">This event has ended</p>
                            </div>
                          );
                        }

                        if (isRegistered) {
                          return (
                            <Button
                              variant="outline"
                              onClick={handleCancelRegistration}
                              disabled={cancelEventMutation.isPending}
                              className="w-full text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300 font-semibold py-6 text-base"
                              data-testid="button-cancel-registration"
                            >
                              {cancelEventMutation.isPending ? 'Cancelling...' : 'Cancel Registration'}
                            </Button>
                          );
                        }

                        if (deadlinePassed) {
                          return (
                            <div className="p-4 bg-red-50 rounded-xl text-center">
                              <p className="text-red-600 font-semibold">Registration deadline has passed</p>
                            </div>
                          );
                        }

                        if (isFull && !selectedEvent.waitlistEnabled) {
                          return (
                            <div className="p-4 bg-red-50 rounded-xl text-center">
                              <p className="text-red-600 font-semibold">This event is full</p>
                            </div>
                          );
                        }

                        return (
                          <Button
                            onClick={handleRegisterForEvent}
                            disabled={registerEventMutation.isPending}
                            className="w-full bg-gradient-to-r from-pcs_blue to-teal hover:from-pcs_blue/90 hover:to-teal/90 text-white font-bold py-6 text-base shadow-lg hover:shadow-xl transition-all"
                            data-testid="button-register-event"
                          >
                            {registerEventMutation.isPending ? 'Registering...' : isFull ? 'Join Waitlist' : 'Register for Event'}
                          </Button>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
