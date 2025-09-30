import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/states";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  School, 
  User, 
  AlertCircle,
  LogIn
} from "lucide-react";

interface InvitationDetails {
  email: string;
  schoolName: string;
  schoolCountry?: string;
  inviterName: string;
  expiresAt: string;
  status: string;
}

export default function InvitationAccept() {
  const params = useParams();
  const token = params.token;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch invitation details (public endpoint, no auth required)
  const { data: invitation, isLoading: invitationLoading, error } = useQuery<InvitationDetails>({
    queryKey: ['/api/invitations', token],
    enabled: !!token,
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invitations/${token}/accept`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation accepted!",
        description: `You've successfully joined ${data.school?.name || 'the school'}`,
      });
      // Invalidate dashboard cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/");
      }, 1500);
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to accept invitation";
      toast({
        title: "Failed to accept invitation",
        description: errorMessage.includes("different email") 
          ? "This invitation was sent to a different email address"
          : errorMessage.includes("expired")
          ? "This invitation has expired"
          : "An error occurred while accepting the invitation",
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleAccept = () => {
    acceptMutation.mutate();
  };

  // Loading state
  if (authLoading || invitationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center pt-20">
        <LoadingSpinner message="Loading invitation..." size="lg" />
      </div>
    );
  }

  // Error states
  if (error) {
    const errorMessage = (error as any)?.message || '';
    let errorTitle = "Invitation Not Found";
    let errorDescription = "This invitation is invalid or has expired";
    let errorIcon = <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;

    if (errorMessage.includes("expired")) {
      errorTitle = "Invitation Expired";
      errorDescription = "This invitation has expired. Please contact your school administrator for a new invitation.";
    } else if (errorMessage.includes("already been accepted")) {
      errorTitle = "Already Accepted";
      errorDescription = "This invitation has already been accepted.";
      errorIcon = <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center pt-20 px-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            {errorIcon}
            <h2 className="text-2xl font-bold text-navy mb-2" data-testid="text-error-title">
              {errorTitle}
            </h2>
            <p className="text-gray-600 mb-6" data-testid="text-error-description">
              {errorDescription}
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
              data-testid="button-go-home"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No invitation data
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center pt-20 px-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-navy mb-2" data-testid="text-no-invitation-title">
              Invitation Not Found
            </h2>
            <p className="text-gray-600 mb-6" data-testid="text-no-invitation-description">
              We couldn't find this invitation. It may have been removed or the link may be incorrect.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
              data-testid="button-go-home-no-invitation"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center pt-20 px-4">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-pcs_blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-pcs_blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-navy mb-2" data-testid="text-invitation-title">
              You've Been Invited!
            </CardTitle>
            <CardDescription className="text-base" data-testid="text-invitation-subtitle">
              Please log in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <School className="h-5 w-5 text-pcs_blue mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">School</p>
                  <p className="text-base font-semibold text-navy" data-testid="text-school-name">
                    {invitation.schoolName}
                  </p>
                  {invitation.schoolCountry && (
                    <p className="text-sm text-gray-600" data-testid="text-school-country">
                      {invitation.schoolCountry}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-pcs_blue mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Invited by</p>
                  <p className="text-base font-semibold text-navy" data-testid="text-inviter-name">
                    {invitation.inviterName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-pcs_blue mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Invitation sent to</p>
                  <p className="text-base font-semibold text-navy" data-testid="text-invitation-email">
                    {invitation.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4" data-testid="text-login-message">
                Please log in to accept this invitation
              </p>
              <Button 
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-login"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Log In with Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show invitation details and accept button
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center pt-20 px-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-navy mb-2" data-testid="text-invitation-title-auth">
            You've Been Invited!
          </CardTitle>
          <CardDescription className="text-base" data-testid="text-invitation-subtitle-auth">
            Accept this invitation to join the team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <School className="h-5 w-5 text-pcs_blue mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">School</p>
                <p className="text-base font-semibold text-navy" data-testid="text-school-name-auth">
                  {invitation.schoolName}
                </p>
                {invitation.schoolCountry && (
                  <p className="text-sm text-gray-600" data-testid="text-school-country-auth">
                    {invitation.schoolCountry}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-pcs_blue mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Invited by</p>
                <p className="text-base font-semibold text-navy" data-testid="text-inviter-name-auth">
                  {invitation.inviterName}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-pcs_blue mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Invitation sent to</p>
                <p className="text-base font-semibold text-navy" data-testid="text-invitation-email-auth">
                  {invitation.email}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800" data-testid="text-email-warning">
              Make sure you're logged in with <strong>{invitation.email}</strong> to accept this invitation
            </p>
          </div>

          <Button 
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
            className="w-full bg-gradient-to-r from-[#019ADE] to-[#019ADE]/80 hover:from-[#019ADE] hover:to-[#019ADE]/70 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-accept-invitation"
          >
            {acceptMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500" data-testid="text-expires-info">
            This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
