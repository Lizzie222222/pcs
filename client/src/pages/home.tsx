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
  Trash2
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function Home() {
  const { t } = useTranslation('dashboard');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<string | null>(null);

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

  // Show toast notification for recent status updates (once per session)
  useEffect(() => {
    if (dashboardData && !sessionStorage.getItem('notificationsShown')) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentApproved = dashboardData.recentEvidence.filter(e => 
        e.status === 'approved' && e.reviewedAt && new Date(e.reviewedAt) > sevenDaysAgo
      );
      const recentRejected = dashboardData.recentEvidence.filter(e => 
        e.status === 'rejected' && e.reviewedAt && new Date(e.reviewedAt) > sevenDaysAgo
      );
      
      if (recentApproved.length > 0 || recentRejected.length > 0) {
        let message = '';
        if (recentApproved.length > 0 && recentRejected.length > 0) {
          message = `${recentApproved.length} approved, ${recentRejected.length} need attention`;
        } else if (recentApproved.length > 0) {
          message = `${recentApproved.length} ${recentApproved.length === 1 ? 'submission' : 'submissions'} approved!`;
        } else {
          message = `${recentRejected.length} ${recentRejected.length === 1 ? 'submission needs' : 'submissions need'} your attention`;
        }
        
        toast({
          title: "Evidence Updates",
          description: message,
          duration: 5000,
        });
        
        sessionStorage.setItem('notificationsShown', 'true');
      }
    }
  }, [dashboardData, toast]);

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
        <div className="mb-8">
          <Card className="bg-white shadow-lg border">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-navy" data-testid="text-welcome">
                      {t('welcome.greeting', { name: user?.firstName ?? t('welcome.default_name') })}
                    </h1>
                    {school.currentRound && (
                      <Badge 
                        className={`${
                          school.currentRound === 1 ? 'bg-blue-500' :
                          school.currentRound === 2 ? 'bg-purple-500' :
                          'bg-green-600'
                        } text-white text-sm px-3 py-1`}
                        data-testid="text-current-round"
                      >
                        Round {school.currentRound}
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg text-gray-600" data-testid="text-school-info">
                    {school.name} • {school.country}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>{t('progress.current_stage')}: {t(`progress.${school.currentStage}.title`)}</span>
                  </div>
                  {school.roundsCompleted && school.roundsCompleted > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-gray-600">
                        {school.roundsCompleted} {school.roundsCompleted === 1 ? 'round' : 'rounds'} completed
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
                    <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20"></div>
                    <div className="relative bg-white rounded-full w-16 h-16 flex items-center justify-center shadow border">
                      <span className="text-xl font-bold text-navy" data-testid="text-progress-percentage">
                        {school.progressPercentage}%
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-600">{t('progress.overall_progress')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Notifications */}
        {(() => {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          const recentApproved = recentEvidence.filter(e => 
            e.status === 'approved' && e.reviewedAt && new Date(e.reviewedAt) > sevenDaysAgo
          );
          const recentRejected = recentEvidence.filter(e => 
            e.status === 'rejected' && e.reviewedAt && new Date(e.reviewedAt) > sevenDaysAgo
          );
          
          const hasNotifications = recentApproved.length > 0 || recentRejected.length > 0;
          
          if (!hasNotifications) return null;
          
          return (
            <div className="mb-8 space-y-3" data-testid="notifications-section">
              {recentApproved.length > 0 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm animate-fade-in" data-testid="notification-approved">
                  <div className="flex items-start gap-3">
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
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-fade-in" data-testid="notification-rejected">
                  <div className="flex items-start gap-3">
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
        <div className="mb-8">
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


        {/* Enhanced Quick Actions */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-navy mb-3">{t('quick_actions.title')}</h2>
            <p className="text-gray-600">{t('quick_actions.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden bg-white/90 backdrop-blur-sm">
              <CardContent className="p-0">
                <Button 
                  className="w-full h-full bg-gradient-to-br from-coral to-coral/80 hover:from-coral hover:to-coral/70 text-white p-6 flex-col gap-3 rounded-none group-hover:scale-105 transition-all duration-300"
                  onClick={() => setShowEvidenceForm(true)}
                  data-testid="button-upload-evidence"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="font-semibold">{t('evidence.submit_evidence')}</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden bg-white/90 backdrop-blur-sm">
              <CardContent className="p-0">
                <Button 
                  className="w-full h-full bg-gradient-to-br from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white p-6 flex-col gap-3 rounded-none group-hover:scale-105 transition-all duration-300"
                  onClick={() => window.location.href = '/resources'}
                  data-testid="button-view-resources"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <span className="font-semibold">{t('quick_actions.view_resources')}</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden bg-white/90 backdrop-blur-sm">
              <CardContent className="p-0">
                <Button 
                  className="w-full h-full bg-gradient-to-br from-teal to-teal/80 hover:from-teal hover:to-teal/70 text-white p-6 flex-col gap-3 rounded-none group-hover:scale-105 transition-all duration-300"
                  data-testid="button-manage-team"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="font-semibold">{t('quick_actions.manage_team')}</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 overflow-hidden bg-white/90 backdrop-blur-sm">
              <CardContent className="p-0">
                <Button 
                  className="w-full h-full bg-gradient-to-br from-yellow to-yellow/80 hover:from-yellow hover:to-yellow/70 text-navy p-6 flex-col gap-3 rounded-none group-hover:scale-105 transition-all duration-300"
                  data-testid="button-view-progress"
                >
                  <div className="w-12 h-12 bg-navy/20 rounded-full flex items-center justify-center group-hover:bg-navy/30 transition-colors">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <span className="font-semibold">{t('quick_actions.track_progress')}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

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
