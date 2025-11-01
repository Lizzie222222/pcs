import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { Mail, ArrowLeft, CheckCircle, UserCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/Logo_1757848498470.png";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isMigratedUser, setIsMigratedUser] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // Check for email parameter in URL (for migrated users)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    
    if (emailParam) {
      setIsMigratedUser(true);
      form.setValue('email', emailParam);
    }
  }, [form]);

  const handleSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      const response = await res.json();

      if (response.success) {
        setSubmittedEmail(data.email);
        setEmailSent(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "Failed to send reset email. Please try again.",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-ocean-light/20 to-navy-light/30 flex items-center justify-center p-4 pt-28">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img 
                src={logoUrl} 
                alt="Plastic Clever Schools Logo" 
                className="h-20 w-auto"
              />
            </div>
          </div>

          {/* Success Card */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-semibold text-navy">
                Check Your Email
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4 text-center">
              <p className="text-gray-600">
                We've sent password reset instructions to:
              </p>
              
              <p className="text-navy font-semibold text-lg" data-testid="text-submitted-email">
                {submittedEmail}
              </p>

              <div className="bg-ocean-light/10 p-4 rounded-lg text-left">
                <p className="text-sm text-gray-600">
                  <strong>What to do next:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-2 list-disc list-inside">
                  <li>Check your inbox for an email from Plastic Clever Schools</li>
                  <li>Click the reset link in the email (valid for 1 hour)</li>
                  <li>Create your new password</li>
                  <li>Check spam folder if you don't see the email</li>
                </ul>
              </div>

              <div className="pt-4">
                <Link href="/login" data-testid="link-back-to-login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Didn't receive the email?{" "}
                  <button
                    onClick={() => {
                      setEmailSent(false);
                      form.reset();
                    }}
                    className="text-ocean hover:text-ocean-dark font-medium"
                    data-testid="button-try-again"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-ocean-light/20 to-navy-light/30 flex items-center justify-center p-4 pt-28">
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
          <h1 className="text-3xl font-bold text-navy leading-tight mb-2" data-testid="text-page-title">
            {isMigratedUser ? "Welcome Back!" : "Forgot Password?"}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed" data-testid="text-page-description">
            {isMigratedUser 
              ? "Reset your password to access your migrated account on our new platform." 
              : "No worries! Enter your email and we'll send you reset instructions."}
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-navy">
              Reset Your Password
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isMigratedUser && (
              <Alert className="bg-blue-50 border-blue-200" data-testid="alert-migrated-user">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Account Migration Detected</strong>
                  <p className="mt-1 text-sm">
                    Your account has been upgraded to our new platform. Please reset your password to continue.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="Enter your email address"
                            className="pl-10"
                            {...field}
                            data-testid="input-email"
                            disabled={isSubmitting}
                          />
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-email" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full btn-primary min-h-[44px]"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <ButtonSpinner />
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            </Form>

            <div className="pt-4 border-t border-gray-200 text-center">
              <Link href="/login" data-testid="link-back-to-login">
                <Button variant="link" className="text-gray-600 hover:text-navy">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            <strong>Note:</strong> For security, the reset link will expire after 1 hour. 
            If you need help, contact us at{" "}
            <a href="mailto:education@commonseas.com" className="text-ocean hover:text-ocean-dark font-medium">
              education@commonseas.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
