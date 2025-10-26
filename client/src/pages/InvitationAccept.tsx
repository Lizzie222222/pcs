import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/states";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  School, 
  User as UserIcon, 
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  ArrowRight,
  Globe
} from "lucide-react";
import { z } from "zod";

interface InvitationDetails {
  email: string;
  schoolName: string;
  schoolCountry?: string;
  inviterName: string;
  expiresAt: string;
  status: string;
  authMethod: 'none' | 'password';
  hasExistingAccount: boolean;
}

const languages = [
  { code: 'ar', nativeName: 'العربية' },
  { code: 'zh', nativeName: '中文' },
  { code: 'nl', nativeName: 'Nederlands' },
  { code: 'en', nativeName: 'English' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'el', nativeName: 'Ελληνικά' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'es', nativeName: 'Español' },
  { code: 'cy', nativeName: 'Cymraeg' },
];

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string(),
  preferredLanguage: z.string().min(1, "Please select a language"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function InvitationAccept() {
  const params = useParams();
  const token = params.token;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  // Fetch invitation details (public endpoint, no auth required)
  const { data: invitation, isLoading: invitationLoading, error } = useQuery<InvitationDetails>({
    queryKey: ['/api/invitations', token],
    enabled: !!token,
    retry: false,
  });

  // Registration form for new users
  const registrationForm = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      preferredLanguage: "en",
    },
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

  // Registration mutation for new users
  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        email: invitation?.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        preferredLanguage: data.preferredLanguage,
      });
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Registration failed");
      }
      
      return result.user;
    },
    onSuccess: async (newUser: User) => {
      // Update auth cache
      queryClient.setQueryData(["/api/auth/user"], newUser);
      
      toast({
        title: "Account created successfully!",
        description: "Accepting your invitation...",
      });
      
      // Wait a moment for the auth state to settle
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Accept the invitation automatically
      setTimeout(() => {
        acceptMutation.mutate();
      }, 500);
    },
    onError: (error: Error) => {
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.message.includes("already exists")) {
        errorMessage = "An account with this email already exists. Please log in instead.";
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    setLocation("/login");
  };

  const handleAccept = () => {
    acceptMutation.mutate();
  };

  const handleRegistration = (data: RegistrationForm) => {
    registrationMutation.mutate(data);
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

  // Not authenticated - show registration form for new users or login redirect for existing users
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
              {invitation.authMethod === 'none' 
                ? "Create your account to accept this invitation" 
                : "Please log in to accept this invitation"}
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
                <UserIcon className="h-5 w-5 text-pcs_blue mt-0.5" />
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

            {/* Show registration form for new users */}
            {invitation.authMethod === 'none' ? (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2 text-center" data-testid="text-signup-message">
                    Create your account to accept this invitation
                  </p>
                  <p className="text-xs text-gray-500 text-center" data-testid="text-email-notice">
                    Account will be created for <strong>{invitation?.email}</strong>
                  </p>
                </div>
                
                <Form {...registrationForm}>
                  <form onSubmit={registrationForm.handleSubmit(handleRegistration)} className="space-y-4">
                    <FormField
                      control={registrationForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter your first name"
                              {...field}
                              data-testid="input-teacher-firstname"
                              disabled={registrationMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-teacher-firstname" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registrationForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter your last name"
                              {...field}
                              data-testid="input-teacher-lastname"
                              disabled={registrationMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-teacher-lastname" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registrationForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password (min 8 characters)"
                                {...field}
                                data-testid="input-teacher-password"
                                disabled={registrationMutation.isPending}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-teacher-toggle-password"
                                disabled={registrationMutation.isPending}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage data-testid="error-teacher-password" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registrationForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your password"
                              {...field}
                              data-testid="input-teacher-confirm-password"
                              disabled={registrationMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage data-testid="error-teacher-confirm-password" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registrationForm.control}
                      name="preferredLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <Globe className="h-4 w-4 inline mr-1" />
                            Preferred Language
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={registrationMutation.isPending}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-teacher-language">
                                <SelectValue placeholder="Select your preferred language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {languages.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.nativeName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="error-teacher-language" />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit"
                      disabled={registrationMutation.isPending}
                      className="w-full bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="button-teacher-register-submit"
                    >
                      {registrationMutation.isPending ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-5 w-5 mr-2" />
                          Create Account & Accept Invitation
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            ) : (
              // Show login redirect for existing users
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
                  Log In
                </Button>
              </div>
            )}
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
              <UserIcon className="h-5 w-5 text-pcs_blue mt-0.5" />
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
