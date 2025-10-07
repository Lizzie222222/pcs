import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProgressTracker from "@/components/ProgressTracker";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { AuditQuizPlaceholder } from "@/components/AuditQuizPlaceholder";
import TeamManagement from "@/pages/TeamManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Lightbulb
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'progress' | 'analytics' | 'resources' | 'team'>('progress');

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
          </div>
        </div>

        {/* Progress Tab Content */}
        {activeTab === 'progress' && (
          <>
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
                          <div className="mt-2 space-y-1">
                            {recentApproved.map(evidence => (
                              <div key={evidence.id} className="text-xs text-green-700 font-medium">
                                ✓ {evidence.title}
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
            {analyticsLoading ? (
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
            ) : !analyticsData ? (
              <Card className="shadow-lg border-0">
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No analytics data available</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Overview Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="text-sm font-semibold text-gray-600 mb-2">Total Submissions</div>
                      <div className="text-3xl font-bold text-navy">{analyticsData.reviewStats.approvedCount + analyticsData.reviewStats.pendingCount + analyticsData.reviewStats.rejectedCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-green-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="text-sm font-semibold text-gray-600 mb-2">Approved</div>
                      <div className="text-3xl font-bold text-green-600">{analyticsData.reviewStats.approvedCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-yellow-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="text-sm font-semibold text-gray-600 mb-2">Pending Review</div>
                      <div className="text-3xl font-bold text-yellow-600">{analyticsData.reviewStats.pendingCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="text-sm font-semibold text-gray-600 mb-2">Avg Review Time</div>
                      <div className="text-3xl font-bold text-pcs_blue">{Math.round(analyticsData.reviewStats.averageReviewTimeHours)}h</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Submission Trends Chart */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-navy">Submission Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.submissionTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                          <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#009ADE" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#00BBB4" stopOpacity={1}/>
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Contributions */}
                <Card className="shadow-lg border-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold text-navy">Team Contributions</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-4">
                      {analyticsData.teamContributions.map(member => (
                        <div key={member.userId} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-pcs_blue/30">
                          <div className="flex-1">
                            <div className="font-semibold text-navy text-lg">{member.userName}</div>
                            <div className="text-sm text-gray-600 font-medium">{member.submissionCount} submissions</div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-600 font-bold text-lg">{member.approvedCount} approved</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Stage Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stage Completion Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.stageTimeline.map(stage => (
                        <div key={stage.stage} className="flex items-center gap-4">
                          <div className="w-24 font-medium capitalize">{stage.stage}</div>
                          <div className="flex-1 relative h-8 bg-gray-100 rounded-full overflow-hidden">
                            {stage.completedAt && (
                              <div className="absolute inset-0 bg-green-500 opacity-20"></div>
                            )}
                          </div>
                          <div className="w-32 text-sm text-gray-600">
                            {stage.completedAt 
                              ? `${stage.daysToComplete} days`
                              : 'In progress'
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* File Type Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>File Type Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">{analyticsData.fileTypeDistribution.images}</div>
                        <div className="text-sm text-gray-600">Images</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">{analyticsData.fileTypeDistribution.videos}</div>
                        <div className="text-sm text-gray-600">Videos</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-3xl font-bold text-red-600">{analyticsData.fileTypeDistribution.pdfs}</div>
                        <div className="text-sm text-gray-600">PDFs</div>
                      </div>
                      <div className="text-center p-4 bg-gray-100 rounded-lg">
                        <div className="text-3xl font-bold text-gray-600">{analyticsData.fileTypeDistribution.other}</div>
                        <div className="text-sm text-gray-600">Other</div>
                      </div>
                    </div>
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
      </div>

      {/* Evidence Submission Form */}
      {showEvidenceForm && (
        <EvidenceSubmissionForm 
          onClose={() => setShowEvidenceForm(false)}
          schoolId={school.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
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
    </div>
  );
}
