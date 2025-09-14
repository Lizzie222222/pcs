import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/states";
import { Mail, Globe, Shield, ArrowRight, School, User, LogOut, Eye, EyeOff, UserPlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { registerSchema, type RegisterForm } from "@shared/schema";
import SchoolSignUpForm from "@/components/SchoolSignUpForm";
import logoUrl from "@assets/Logo_1757848498470.png";

export default function Register() {
  const { user, isLoading, isAuthenticated, register, isRegistering } = useAuth();
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const handleEmailRegistration = (data: RegisterForm) => {
    register(data);
  };

  const handleGoogleRegistration = () => {
    window.location.href = `/api/auth/google?returnTo=/register`;
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const handleStartRegistration = () => {
    setShowSignUpForm(true);
  };

  const handleCloseSignUpForm = () => {
    setShowSignUpForm(false);
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        size="xl" 
        message="Loading registration page..." 
        fullScreen={true}
        className="bg-gray-50"
      />
    );
  }

  // Show signup form modal when authenticated user wants to register
  if (showSignUpForm && isAuthenticated) {
    return <SchoolSignUpForm onClose={handleCloseSignUpForm} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-ocean-light/20 to-navy-light/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src={logoUrl} 
              alt="Plastic Clever Schools Logo" 
              className="h-20 w-auto"
            />
          </div>
          <h1 className="heading-2 mb-2" data-testid="text-register-title">
            {isAuthenticated ? 'Register Your School' : 'Create Your Account'}
          </h1>
          <p className="body-text text-gray-600" data-testid="text-register-description">
            {isAuthenticated 
              ? 'Complete your school registration to access all program features'
              : 'Create an account to register your school for our sustainability program'
            }
          </p>
        </div>

        {!isAuthenticated ? (
          /* Unauthenticated State - Show Login Options */
          <>
            {/* Login Card */}
            <Card className="card-clean shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <CardTitle className="heading-4 text-navy">
                  Create Your Account
                </CardTitle>
                <p className="caption text-gray-500 mt-2">
                  Join our global community of sustainable schools
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Sign Up Buttons Together */}
                <div className="space-y-3">
                  {/* Continue with Google Button */}
                  <Button
                    size="lg"
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group shadow-sm hover:shadow-md"
                    onClick={handleGoogleRegistration}
                    data-testid="button-register-google"
                    disabled={isRegistering}
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
                      <span className="font-semibold">Sign Up with Google</span>
                      <ArrowRight className="icon-sm ml-auto transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </Button>

                  {/* Email Registration Button */}
                  <Button
                    size="lg"
                    className="w-full btn-primary group"
                    onClick={() => setShowEmailModal(true)}
                    data-testid="button-register-email"
                    disabled={isRegistering}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Mail className="icon-md transition-transform duration-300 group-hover:scale-110" />
                      <span className="font-semibold">Sign Up with Email</span>
                      <ArrowRight className="icon-sm ml-auto transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </Button>
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <School className="icon-sm text-teal flex-shrink-0" />
                    <p className="text-sm text-gray-700">School registration and dashboard tracking</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Globe className="icon-sm text-ocean-blue flex-shrink-0" />
                    <p className="text-sm text-gray-700">Access educational resources and curriculum materials</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="icon-sm text-navy flex-shrink-0" />
                    <p className="text-sm text-gray-700">Monitor impact and earn awards for sustainability efforts</p>
                  </div>
                </div>

                {/* Why do I need an account section */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-gray-600 font-medium">
                      Why do I need an account?
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-600">
                    Your account personalizes your experience, saves your school's progress, and provides secure access to resources.
                  </p>
                </div>

              </CardContent>
            </Card>

            {/* Footer Information */}
            <div className="text-center mt-8 space-y-2">
              <p className="caption text-gray-500">
                Already have an account?{" "}
                <a 
                  href="/login" 
                  className="text-ocean-blue hover:text-navy font-medium transition-colors duration-200"
                  data-testid="link-login"
                >
                  Sign in here
                </a>
              </p>
              <p className="caption text-gray-400">
                By registering, you agree to our terms of service and privacy policy
              </p>
            </div>
          </>
        ) : (
          /* Authenticated State - Show Registration Options */
          <>
            {/* Welcome Card */}
            <Card className="card-clean shadow-lg border-0">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User className="icon-md text-teal" />
                  <CardTitle className="heading-4 text-navy">
                    Welcome, {user?.firstName || 'Educator'}!
                  </CardTitle>
                </div>
                <p className="caption text-gray-500">
                  You're signed in and ready to register your school
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* User Info */}
                {user?.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="icon-sm text-ocean-blue" />
                    <div>
                      <p className="text-sm font-medium text-navy">Signed in as</p>
                      <p className="text-xs text-gray-600" data-testid="text-user-email">{user.email}</p>
                    </div>
                  </div>
                )}

                {/* Register School Button */}
                <Button
                  size="lg"
                  className="w-full btn-primary group"
                  onClick={handleStartRegistration}
                  data-testid="button-start-school-registration"
                >
                  <div className="flex items-center justify-center gap-3">
                    <School className="icon-md transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-semibold">Register Your School</span>
                    <ArrowRight className="icon-sm ml-auto transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Button>

                {/* Registration Benefits for Authenticated Users */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-teal/10 rounded-lg">
                    <School className="icon-sm text-teal flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-navy">Complete School Profile</p>
                      <p className="text-xs text-gray-600">Add your school details to join our global network</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-ocean-blue/10 rounded-lg">
                    <Globe className="icon-sm text-ocean-blue flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-navy">Access Full Platform</p>
                      <p className="text-xs text-gray-600">Unlock all tools, resources, and progress tracking features</p>
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = "/api/auth/logout";
                    }}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                    data-testid="button-logout"
                  >
                    <LogOut className="icon-xs" />
                    <span>Sign Out</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 ml-auto"
                    data-testid="button-back-home"
                  >
                    <span>Back to Home</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Email Registration Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="icon-md text-ocean-blue" />
              Create Your Account
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEmailRegistration)} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="First name"
                            {...field}
                            data-testid="input-first-name-modal"
                            disabled={isRegistering}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-first-name-modal" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Last name"
                            {...field}
                            data-testid="input-last-name-modal"
                            disabled={isRegistering}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-last-name-modal" />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                          data-testid="input-email-modal"
                          disabled={isRegistering}
                        />
                      </FormControl>
                      <FormMessage data-testid="error-email-modal" />
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
                            placeholder="Create a strong password"
                            {...field}
                            data-testid="input-password-modal"
                            disabled={isRegistering}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password-modal"
                            disabled={isRegistering}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-password-modal" />
                      <p className="text-xs text-gray-600 mt-1">
                        Must contain uppercase, lowercase, number, and be at least 8 characters
                      </p>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            {...field}
                            data-testid="input-confirm-password-modal"
                            disabled={isRegistering}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password-modal"
                            disabled={isRegistering}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-confirm-password-modal" />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailModal(false)}
                    disabled={isRegistering}
                    data-testid="button-cancel-registration"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={isRegistering}
                    data-testid="button-submit-registration"
                  >
                    {isRegistering ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="icon-sm mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}