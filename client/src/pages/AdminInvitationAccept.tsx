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
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
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
  authMethod: 'none' | 'password';
  hasExistingAccount: boolean;
  role?: 'admin' | 'partner';
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
      
      toast({
        title: "Signed in successfully!",
        description: "Proceeding with your admin invitation...",
      });
      
      // Force refetch to update the page state
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // DO NOT redirect - let the page naturally show the acceptance or onboarding form
      // The component will re-render with isAuthenticated=true and show the appropriate next step
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
        description: "Accepting your invitation...",
      });
      
      // Automatically accept the invitation after profile update to avoid showing intermediate state
      setTimeout(() => {
        acceptMutation.mutate();
      }, 500);
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

  const handleOnboardingSubmit = (data: OnboardingForm) => {
    profileMutation.mutate(data);
  };

  const handleAccept = () => {
    acceptMutation.mutate();
  };

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
        description: "Accepting your admin invitation...",
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

  const handleRegistration = (data: RegistrationForm) => {
    registrationMutation.mutate(data);
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
    const isPartner = invitation?.role === 'partner';
    
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
            <div className={`w-16 h-16 ${isPartner ? 'bg-teal/10' : 'bg-pcs_blue/10'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <Shield className={`h-8 w-8 ${isPartner ? 'text-teal' : 'text-pcs_blue'}`} />
            </div>
            <CardTitle className="text-2xl font-bold text-navy mb-2" data-testid="text-admin-invitation-title">
              {isPartner 
                ? "You've Been Invited to be a Partner!"
                : "You've Been Invited to be an Administrator!"}
            </CardTitle>
            <p className={`text-xl font-semibold bg-gradient-to-r ${isPartner ? 'from-teal to-pcs_blue' : 'from-pcs_blue to-teal'} bg-clip-text text-transparent mb-3`} data-testid="text-admin-lucky-you">
              {isPartner ? "You're Making a Difference!" : "Lucky You!"}
            </p>
            <CardDescription className="text-base" data-testid="text-admin-invitation-subtitle">
              {isPartner
                ? "Accept this invitation to join as a partner"
                : "Accept this invitation to gain admin access"}
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
              {/* Show registration form for new users */}
              {invitation.authMethod === 'none' && (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2 text-center" data-testid="text-admin-signup-message">
                      Create your account to accept this invitation
                    </p>
                    <p className="text-xs text-gray-500 text-center" data-testid="text-admin-email-notice">
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
                                data-testid="input-admin-firstname"
                                disabled={registrationMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage data-testid="error-admin-firstname" />
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
                                data-testid="input-admin-lastname"
                                disabled={registrationMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage data-testid="error-admin-lastname" />
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
                                  data-testid="input-admin-password"
                                  disabled={registrationMutation.isPending}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                  data-testid="button-admin-toggle-password"
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
                            <FormMessage data-testid="error-admin-password" />
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
                                data-testid="input-admin-confirm-password"
                                disabled={registrationMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage data-testid="error-admin-confirm-password" />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-admin-language">
                                  <SelectValue placeholder="Select a language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {languages.map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code} data-testid={`option-language-${lang.code}`}>
                                    {lang.nativeName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage data-testid="error-admin-language" />
                          </FormItem>
                        )}
                      />
                      
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-to-r from-pcs_blue to-pcs_blue/80 hover:from-pcs_blue hover:to-pcs_blue/70 text-white"
                        disabled={registrationMutation.isPending}
                        data-testid="button-admin-register-submit"
                      >
                        {registrationMutation.isPending ? (
                          <>
                            <ButtonSpinner size="sm" className="mr-2" />
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
                </>
              )}
              
              {/* Show login form for existing users */}
              {invitation.authMethod === 'password' && (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2 text-center" data-testid="text-admin-login-message">
                      Please log in to accept this invitation
                    </p>
                    <p className="text-xs text-gray-500 text-center" data-testid="text-admin-email-notice">
                      You must log in with <strong>{invitation?.email}</strong>
                    </p>
                  </div>
                  
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
                            <ButtonSpinner size="sm" className="mr-2" />
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
                </>
              )}
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

          {/* Check if logged in with correct email FIRST, before showing any forms */}
          {user && user.email.toLowerCase() !== invitation.email.toLowerCase() ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-1">Wrong Account</p>
                    <p className="text-sm text-red-800" data-testid="text-admin-email-mismatch">
                      You're currently logged in as <strong>{user.email}</strong>, but this invitation was sent to <strong>{invitation.email}</strong>.
                    </p>
                    <p className="text-sm text-red-800 mt-2">
                      Please log out and sign in with the correct email address to accept this invitation.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/auth/logout", {});
                    queryClient.setQueryData(["/api/auth/user"], null);
                    await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                    
                    toast({
                      title: "Logged out successfully",
                      description: "You can now log in with the correct account",
                    });
                    
                    // Stay on the same page - it will show the login form now that user is logged out
                  } catch (error) {
                    console.error('Logout error:', error);
                    toast({
                      title: "Logout failed",
                      description: "Please refresh the page and try again",
                      variant: "destructive",
                    });
                  }
                }}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-logout-wrong-account"
              >
                <LogIn className="h-5 w-5 mr-2 rotate-180" />
                Log Out & Try Again
              </Button>
            </>
          ) : needsOnboarding ? (
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
                        <ButtonSpinner size="sm" className="mr-2" />
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
                    <ButtonSpinner size="sm" className="mr-2" />
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
