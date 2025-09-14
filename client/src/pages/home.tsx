import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Award
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
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: isDashboardLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || isDashboardLoading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (!dashboardData) {
    return (
      <ErrorState
        title="No School Found"
        description="It looks like your account isn't associated with a school yet. Please contact support for assistance."
        showHome={true}
        onGoHome={() => window.location.href = "/api/logout"}
      />
    );
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
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-navy" data-testid="text-welcome">
                  Welcome back, {user?.firstName || 'Teacher'}!
                </h1>
                <p className="text-gray-600 mt-1" data-testid="text-school-info">
                  {school.name} • {school.country}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-pcs_blue" data-testid="text-progress-percentage">
                  {school.progressPercentage}%
                </div>
                <div className="text-sm text-gray-500">Overall Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-navy">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="bg-coral hover:bg-coral/90 text-white p-4 h-auto flex-col gap-2"
                onClick={() => setShowEvidenceForm(true)}
                data-testid="button-upload-evidence"
              >
                <Upload className="h-6 w-6" />
                <span>Upload Evidence</span>
              </Button>
              
              <Button 
                className="bg-pcs_blue hover:bg-pcs_blue/90 text-white p-4 h-auto flex-col gap-2"
                onClick={() => window.location.href = '/resources'}
                data-testid="button-view-resources"
              >
                <BookOpen className="h-6 w-6" />
                <span>View Resources</span>
              </Button>
              
              <Button 
                className="bg-teal hover:bg-teal/90 text-white p-4 h-auto flex-col gap-2"
                data-testid="button-manage-team"
              >
                <Users className="h-6 w-6" />
                <span>Manage Team</span>
              </Button>
              
              <Button 
                className="bg-yellow hover:bg-yellow/90 text-black p-4 h-auto flex-col gap-2"
                data-testid="button-view-progress"
              >
                <BarChart3 className="h-6 w-6" />
                <span>View Progress</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvidence.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity. Start by uploading your first evidence!</p>
                <Button 
                  className="mt-4 bg-coral hover:bg-coral/90"
                  onClick={() => setShowEvidenceForm(true)}
                >
                  Upload Evidence
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEvidence.map((evidence) => (
                  <div 
                    key={evidence.id} 
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    data-testid={`activity-${evidence.id}`}
                  >
                    <div className={`p-2 rounded-full text-white ${
                      evidence.status === 'approved' ? 'bg-green-500' :
                      evidence.status === 'pending' ? 'bg-yellow' :
                      'bg-red-500'
                    }`}>
                      {evidence.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-navy">{evidence.title}</h4>
                        <Badge className={getStageColor(evidence.stage)}>
                          {evidence.stage}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(evidence.status)}>
                          {evidence.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        Submitted {new Date(evidence.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
