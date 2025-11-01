import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/Logo_1757848498470.png";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const { t, i18n } = useTranslation("auth");
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const { toast } = useToast();

  // Create schema with translations - updates when language changes
  const resetPasswordSchema = useMemo(() => z.object({
    newPassword: z
      .string()
      .min(8, t("migratedUser.resetPassword.validation_password_min_length"))
      .regex(/[A-Z]/, t("migratedUser.resetPassword.validation_password_uppercase"))
      .regex(/[a-z]/, t("migratedUser.resetPassword.validation_password_lowercase"))
      .regex(/[0-9]/, t("migratedUser.resetPassword.validation_password_number")),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t("migratedUser.resetPassword.validation_passwords_match"),
    path: ["confirmPassword"],
  }), [t, i18n.language]);

  type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

  useEffect(() => {
    // Extract token from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      setInvalidToken(true);
    } else {
      setToken(tokenParam);
    }
  }, []);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: t("migratedUser.resetPassword.error_title"),
        description: t("migratedUser.resetPassword.error_invalid_token"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.newPassword,
      });
      const response = await res.json();

      if (response.success) {
        setResetSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        // Only show error page if it's specifically a token issue
        const message = response.message || "";
        if (message.toLowerCase().includes("invalid") || message.toLowerCase().includes("expired")) {
          setInvalidToken(true);
        }
        toast({
          variant: "destructive",
          title: t("migratedUser.resetPassword.error_title"),
          description: message || t("migratedUser.resetPassword.error_reset_failed"),
        });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        variant: "destructive",
        title: t("migratedUser.resetPassword.error_title"),
        description: t("migratedUser.resetPassword.error_generic"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (invalidToken) {
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

          {/* Error Card */}
          <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl font-semibold text-navy">
                {t("migratedUser.resetPassword.invalidToken_title")}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4 text-center">
              <p className="text-gray-600">
                {t("migratedUser.resetPassword.invalidToken_description")}
              </p>

              <div className="bg-red-50 p-4 rounded-lg text-left">
                <p className="text-sm text-gray-600">
                  <strong>{t("migratedUser.resetPassword.invalidToken_reasons_title")}</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-2 list-disc list-inside">
                  <li>{t("migratedUser.resetPassword.invalidToken_reason_1")}</li>
                  <li>{t("migratedUser.resetPassword.invalidToken_reason_2")}</li>
                  <li>{t("migratedUser.resetPassword.invalidToken_reason_3")}</li>
                </ul>
              </div>

              <div className="pt-4 space-y-2">
                <Link href="/forgot-password" data-testid="link-request-new">
                  <Button className="w-full bg-ocean hover:bg-ocean-dark text-white">
                    {t("migratedUser.resetPassword.invalidToken_request_new_button")}
                  </Button>
                </Link>
                
                <Link href="/login" data-testid="link-back-to-login">
                  <Button variant="outline" className="w-full">
                    {t("migratedUser.resetPassword.invalidToken_back_to_login_button")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
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
                {t("migratedUser.resetPassword.success_title")}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4 text-center">
              <p className="text-gray-600">
                {t("migratedUser.resetPassword.success_description")}
              </p>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  {t("migratedUser.resetPassword.success_redirect_message")}
                </p>
              </div>

              <div className="pt-4">
                <Link href="/login" data-testid="link-login-now">
                  <Button className="w-full bg-ocean hover:bg-ocean-dark text-white">
                    {t("migratedUser.resetPassword.success_login_button")}
                  </Button>
                </Link>
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
            {t("migratedUser.resetPassword.page_title")}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed" data-testid="text-page-description">
            {t("migratedUser.resetPassword.page_description")}
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-navy">
              {t("migratedUser.resetPassword.card_title")}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("migratedUser.resetPassword.new_password_label")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t("migratedUser.resetPassword.new_password_placeholder")}
                            className="pl-10 pr-10"
                            {...field}
                            data-testid="input-new-password"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                            disabled={isSubmitting}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-new-password" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("migratedUser.resetPassword.confirm_password_label")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t("migratedUser.resetPassword.confirm_password_placeholder")}
                            className="pl-10 pr-10"
                            {...field}
                            data-testid="input-confirm-password"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password"
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage data-testid="error-confirm-password" />
                    </FormItem>
                  )}
                />

                <div className="bg-ocean-light/10 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>{t("migratedUser.resetPassword.requirements_title")}</strong>
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                    <li>{t("migratedUser.resetPassword.requirement_1")}</li>
                    <li>{t("migratedUser.resetPassword.requirement_2")}</li>
                    <li>{t("migratedUser.resetPassword.requirement_3")}</li>
                    <li>{t("migratedUser.resetPassword.requirement_4")}</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-pcs_blue hover:bg-blue-600 text-white font-semibold"
                  disabled={isSubmitting}
                  data-testid="button-submit"
                >
                  {isSubmitting ? (
                    <>
                      <ButtonSpinner />
                      {t("migratedUser.resetPassword.submit_button_loading")}
                    </>
                  ) : (
                    t("migratedUser.resetPassword.submit_button")
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
