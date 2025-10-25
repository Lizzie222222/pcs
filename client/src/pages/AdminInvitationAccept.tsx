import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
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
  User as UserIcon, 
  AlertCircle,
  LogIn,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
  Globe
} from "lucide-react";
import { createLoginSchema, type LoginForm } from "@shared/schema";
import { z } from "zod";
import pcsLogoUrl from "@assets/PSC Logo - Blue_1761334524895.png";

interface InvitationDetails {
  email: string;
  inviterName: string;
  expiresAt: string;
  status: string;
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

const onboardingSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredLanguage: z.string().min(1, "Please select a language"),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export default function AdminInvitationAccept() {
  const params = useParams();
  const token = params.token;
  const { t } = useTranslation(['auth', 'forms']);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  
  const loginSchema = createLoginSchema(t);
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Onboarding form
  const onboardingForm = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      preferredLanguage: user?.preferredLanguage || "en",
    },
  });

  // Update onboarding form when user data loads
  useEffect(() => {
    if (user) {
      onboardingForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        preferredLanguage: user.preferredLanguage || "en",
      });
    }
  }, [user, onboardingForm]);

  // Fetch invitation details (public endpoint, no auth required)
  const { data: invitation, isLoading: invitationLoading, error } = useQuery<InvitationDetails>({
    queryKey: ['/api/admin-invitations', token],
    enabled: !!token,
    retry: false,
  });

  // Prefill email field when invitation data loads
  useEffect(() => {
    if (invitation?.email) {
      form.setValue('email', invitation.email);
    }
  }, [invitation, form]);

  // Custom login mutation that redirects to appropriate dashboard based on user role
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }
      
      return result.user;
    },
    onSuccess: async (loggedInUser: User) => {
      // Update auth cache
      queryClient.setQueryData(["/api/auth/user"], loggedInUser);
      
      // Store invitation token for later completion
      if (token) {
        sessionStorage.setItem('pendingAdminInvitation', token);
      }
      
      toast({
        title: "Signed in successfully!",
        description: "Please return to the invitation link to complete acceptance.",
      });
      
      // Force refetch to update the page state
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Redirect to appropriate dashboard based on user role
      const dashboardPath = loggedInUser.isAdmin ? '/admin' : '/dashboard';
      setTimeout(() => {
        setLocation(dashboardPath);
      }, 500);
    },
    onError: (error: Error) => {
      let errorMessage = "Login failed. Please try again.";
      
      if (error.message.includes("400:") || error.message.includes("401:")) {
        try {
          const errorData = JSON.parse(error.message.split(": ")[1]);
          errorMessage = errorData.message || "Invalid email or password";
        } catch {
          errorMessage = "Invalid email or password";
        }
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
      const response = await apiRequest("POST", `/api/admin-invitations/${token}/profile`, data);
      const result = await response.json();
      return result.user; // Return the user object from the response
    },
    onSuccess: async (updatedUser: User) => {
      // Update auth cache immediately with the returned user data
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully",
      });
      
      // Also invalidate and refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || "Failed to update profile";
      toast({
        title: "Failed to update profile",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin-invitations/${token}/accept`, {});
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Invitation accepted!",
        description: "You've successfully become an administrator",
      });
      // Invalidate auth user cache to refresh admin status
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      // Invalidate dashboard cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      // Redirect to admin dashboard
      setTimeout(() => {
        setLocation("/admin?welcomed=true");
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

  const handleEmailLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    // Preserve the token in the URL after Google OAuth redirect
    window.location.href = `/api/auth/google?returnTo=/admin-invitations/${token}`;
  };

  const handleOnboardingSubmit = (data: OnboardingForm) => {
    profileMutation.mutate(data);
  };

  const handleAccept = () => {
    acceptMutation.mutate();
  };

  // Check if user needs onboarding
  const needsOnboarding = user && (!user.firstName || !user.lastName || !user.hasSeenOnboarding);

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
      errorDescription = "This invitation has expired. Please contact an administrator for a new invitation.";
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
            <h2 className="text-2xl font-bold text-navy mb-2" data-testid="text-admin-error-title">
              {errorTitle}
            </h2>
            <p className="text-gray-600 mb-6" data-testid="text-admin-error-description">
              {errorDescription}
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
              data-testid="button-admin-go-home"
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
            <h2 className="text-2xl font-bold text-navy mb-2" data-testid="text-admin-no-invitation-title">
              Invitation Not Found
            </h2>
            <p className="text-gray-600 mb-6" data-testid="text-admin-no-invitation-description">
              We couldn't find this invitation. It may have been removed or the link may be incorrect.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
              data-testid="button-admin-go-home-no-invitation"
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
            <img 
              src={pcsLogoUrl} 
              alt="Plastic Clever Schools" 
              className="h-20 w-auto mx-auto mb-4"
              data-testid="img-admin-pcs-logo"
            />
            <div className="w-16 h-16 bg-pcs_blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-pcs_blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-navy mb-2" data-testid="text-admin-invitation-title">
              You've Been Invited to be an Administrator!
            </CardTitle>
            <p className="text-xl font-semibold bg-gradient-to-r from-pcs_blue to-teal bg-clip-text text-transparent mb-3" data-testid="text-admin-lucky-you">
              Lucky You!
            </p>
            <CardDescription className="text-base" data-testid="text-admin-invitation-subtitle">
              Accept this invitation to gain admin access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-pcs_blue mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Invited by</p>
                  <p className="text-base font-semibold text-navy" data-testid="text-admin-inviter-name">
                    Plastic Clever Schools
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-pcs_blue mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Invitation sent to</p>
                  <p className="text-base font-semibold text-navy" data-testid="text-admin-invitation-email">
                    {invitation.email}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2 text-center" data-testid="text-admin-login-message">
                  Please log in to accept this invitation
                </p>
                <p className="text-xs text-gray-500 text-center" data-testid="text-admin-email-notice">
                  You must log in with <strong>{invitation?.email}</strong>
                </p>
              </div>
              
              {/* Email/Password Login Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
                            {...field}
                            data-testid="input-admin-email"
                            disabled={true}
                            readOnly
                            className="bg-gray-50"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-admin-email" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              {...field}
                              data-testid="input-admin-password"
                              disabled={loginMutation.isPending}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-admin-toggle-password"
                              disabled={loginMutation.isPending}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage data-testid="error-admin-password" />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
                    disabled={loginMutation.isPending}
                    data-testid="button-admin-login-submit"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Mail className="h-5 w-5 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500 font-medium">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Continue with Google Button */}
              <Button
                size="lg"
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group shadow-sm hover:shadow-md"
                onClick={handleGoogleLogin}
                data-testid="button-admin-login-google"
                disabled={loginMutation.isPending}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold">Log In with Google</span>
                  <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show onboarding form or accept button
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 flex items-center justify-center pt-20 px-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <img 
            src={pcsLogoUrl} 
            alt="Plastic Clever Schools" 
            className="h-20 w-auto mx-auto mb-4"
            data-testid="img-admin-pcs-logo-auth"
          />
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-navy mb-2" data-testid="text-admin-invitation-title-auth">
            You've Been Invited to be an Administrator!
          </CardTitle>
          <p className="text-xl font-semibold bg-gradient-to-r from-pcs_blue to-teal bg-clip-text text-transparent mb-3" data-testid="text-admin-lucky-you-auth">
            Lucky You!
          </p>
          <CardDescription className="text-base" data-testid="text-admin-invitation-subtitle-auth">
            {needsOnboarding ? "Complete your profile to continue" : "Accept this invitation to gain admin access"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <UserIcon className="h-5 w-5 text-pcs_blue mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Invited by</p>
                <p className="text-base font-semibold text-navy" data-testid="text-admin-inviter-name-auth">
                  Plastic Clever Schools
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-pcs_blue mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Invitation sent to</p>
                <p className="text-base font-semibold text-navy" data-testid="text-admin-invitation-email-auth">
                  {invitation.email}
                </p>
              </div>
            </div>
          </div>

          {needsOnboarding ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Before accepting the invitation, please complete your profile information to personalize your admin experience.
                </p>
              </div>

              <Form {...onboardingForm}>
                <form onSubmit={onboardingForm.handleSubmit(handleOnboardingSubmit)} className="space-y-4">
                  <FormField
                    control={onboardingForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:firstName', 'First Name')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your first name"
                            {...field}
                            data-testid="input-onboarding-firstname"
                            disabled={profileMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-onboarding-firstname" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={onboardingForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:lastName', 'Last Name')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your last name"
                            {...field}
                            data-testid="input-onboarding-lastname"
                            disabled={profileMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-onboarding-lastname" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={onboardingForm.control}
                    name="preferredLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            {t('auth:preferredLanguage', 'Preferred Language')}
                          </div>
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={profileMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-onboarding-language">
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem 
                                key={lang.code} 
                                value={lang.code}
                                data-testid={`language-option-${lang.code}`}
                              >
                                {lang.nativeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="error-onboarding-language" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
                    disabled={profileMutation.isPending}
                    data-testid="button-submit-onboarding"
                  >
                    {profileMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Updating Profile...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-5 w-5 mr-2" />
                        Continue to Accept Invitation
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800" data-testid="text-admin-email-warning">
                  Make sure you're logged in with <strong>{invitation.email}</strong> to accept this admin invitation
                </p>
              </div>

              <Button 
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
                className="w-full bg-gradient-to-r from-[#019ADE] to-[#019ADE]/80 hover:from-[#019ADE] hover:to-[#019ADE]/70 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-accept-admin-invitation"
              >
                {acceptMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Admin Invitation
                  </>
                )}
              </Button>
            </>
          )}

          <p className="text-xs text-center text-gray-500" data-testid="text-admin-expires-info">
            This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
