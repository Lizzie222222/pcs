import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProgressTracker from "@/components/ProgressTracker";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  BookOpen, 
  Users, 
  BarChart3, 
  CheckCircle,
  Clock,
  Calendar,
  Award,
  MapPin
} from "lucide-react";
import { useState } from "react";

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
  };
  recentEvidence: Array<{
    id: string;
    title: string;
    stage: string;
    status: string;
    submittedAt: string;
  }>;
}

export default function Home() {
  const { t } = useTranslation('dashboard');
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  const { school, recentEvidence } = dashboardData;

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
                  <h1 className="text-3xl font-bold text-navy" data-testid="text-welcome">
                    {t('welcome.greeting', { name: user?.firstName ?? t('welcome.default_name') })}
                  </h1>
                  <p className="text-lg text-gray-600" data-testid="text-school-info">
                    {school.name} • {school.country}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>{t('progress.current_stage')}: {t(`progress.${school.currentStage}.title`)}</span>
                  </div>
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

        {/* Progress Tracker */}
        <div className="mb-8">
          <ProgressTracker 
            inspireCompleted={school.inspireCompleted}
            investigateCompleted={school.investigateCompleted}
            actCompleted={school.actCompleted}
            awardCompleted={school.awardCompleted}
            currentStage={school.currentStage}
          />
        </div>

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
    </div>
  );
}
