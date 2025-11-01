import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserCheck, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function MigratedUserOnboarding() {
  const { t } = useTranslation("auth");
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Step 1: Password Reset
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Step 2: Name Confirmation
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  
  // State management - skip password step if already reset via forgot password
  const needsPasswordReset = user?.needsPasswordReset ?? true;
  const [currentStep, setCurrentStep] = useState<1 | 2>(needsPasswordReset ? 1 : 2);
  const [passwordResetComplete, setPasswordResetComplete] = useState(!needsPasswordReset);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      
      // If user already reset password via forgot password flow, skip to step 2
      if (!user.needsPasswordReset && currentStep === 1) {
        setCurrentStep(2);
        setPasswordResetComplete(true);
      }
    }
  }, [user]);

  const resetPasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const response = await apiRequest("POST", "/api/auth/reset-migrated-password", {
        password: newPassword
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPasswordResetComplete(true);
        setCurrentStep(2);
        toast({
          title: t("migratedUser.onboarding.toast_password_updated_title"),
          description: t("migratedUser.onboarding.toast_password_updated_description"),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        toast({
          title: t("migratedUser.onboarding.toast_password_error_title"),
          description: data.message || t("migratedUser.onboarding.toast_password_error_description"),
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t("migratedUser.onboarding.toast_password_error_title"),
        description: error.message || t("migratedUser.onboarding.toast_password_error_description"),
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const response = await apiRequest("POST", "/api/auth/complete-migrated-onboarding", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t("migratedUser.onboarding.toast_welcome_title"),
          description: t("migratedUser.onboarding.toast_welcome_description"),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        toast({
          title: t("migratedUser.onboarding.toast_profile_error_title"),
          description: data.message || t("migratedUser.onboarding.toast_profile_error_description"),
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t("migratedUser.onboarding.toast_profile_error_title"),
        description: error.message || t("migratedUser.onboarding.toast_profile_error_description"),
        variant: "destructive",
      });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: t("migratedUser.onboarding.toast_password_short_title"),
        description: t("migratedUser.onboarding.toast_password_short_description"),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t("migratedUser.onboarding.toast_password_mismatch_title"),
        description: t("migratedUser.onboarding.toast_password_mismatch_description"),
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate(password);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast({
        title: t("migratedUser.onboarding.toast_first_name_required_title"),
        description: t("migratedUser.onboarding.toast_first_name_required_description"),
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  // Calculate progress based on whether password reset is needed
  const totalSteps = needsPasswordReset ? 2 : 1;
  const progress = needsPasswordReset 
    ? (currentStep === 1 ? 50 : 100)
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("migratedUser.forgotPassword.welcome_title")}</h1>
          <p className="text-gray-600">
            {needsPasswordReset 
              ? t("migratedUser.onboarding.welcome_message_with_password")
              : t("migratedUser.onboarding.welcome_message_without_password")}
          </p>
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-500 mt-2">
              {needsPasswordReset ? t("migratedUser.onboarding.step_progress", { current: currentStep, total: totalSteps }) : t("migratedUser.onboarding.almost_done")}
            </p>
          </div>
        </div>

        {currentStep === 1 && (
          <Card data-testid="card-password-reset">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{t("migratedUser.onboarding.step1_title")}</CardTitle>
                  <CardDescription>
                    {t("migratedUser.onboarding.step1_description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-gray-700">
                  {t("migratedUser.onboarding.temp_password_info")}
                </AlertDescription>
              </Alert>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t("migratedUser.onboarding.password_label")} *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("migratedUser.onboarding.password_placeholder")}
                      className="pr-10"
                      minLength={8}
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t("migratedUser.onboarding.password_requirements")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("migratedUser.onboarding.confirm_password_label")} *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("migratedUser.onboarding.confirm_password_placeholder")}
                      className="pr-10"
                      minLength={8}
                      required
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-pcs_blue hover:bg-blue-600"
                  disabled={resetPasswordMutation.isPending}
                  data-testid="button-submit-password"
                >
                  {resetPasswordMutation.isPending ? (
                    t("migratedUser.onboarding.updating_button")
                  ) : (
                    <>
                      {t("migratedUser.onboarding.continue_button")} <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card data-testid="card-name-confirmation">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>{t("migratedUser.onboarding.step2_title")}</CardTitle>
                  <CardDescription>
                    {t("migratedUser.onboarding.step2_description")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {passwordResetComplete && needsPasswordReset && (
                <Alert className="mb-6 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>{t("migratedUser.onboarding.password_updated_alert_title")}</AlertTitle>
                  <AlertDescription className="text-sm text-gray-700">
                    {t("migratedUser.onboarding.password_updated_alert_description")}
                  </AlertDescription>
                </Alert>
              )}

              {!needsPasswordReset && (
                <Alert className="mb-6 bg-blue-50 border-blue-200">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <AlertTitle>{t("migratedUser.onboarding.password_already_set_alert_title")}</AlertTitle>
                  <AlertDescription className="text-sm text-gray-700">
                    {t("migratedUser.onboarding.password_already_set_alert_description")}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    {t("migratedUser.onboarding.first_name_label")} * 
                    {!firstName && <span className="text-xs text-red-600 ml-1">{t("migratedUser.onboarding.first_name_required")}</span>}
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={firstName ? t("migratedUser.onboarding.first_name_placeholder_update") : t("migratedUser.onboarding.first_name_placeholder_enter")}
                    required
                    data-testid="input-first-name"
                    className={!firstName ? "border-red-300 focus:border-red-500" : ""}
                  />
                  {firstName && (
                    <p className="text-xs text-gray-500">{t("migratedUser.onboarding.first_name_current", { name: firstName })}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    {t("migratedUser.onboarding.last_name_label")}
                    {!lastName && <span className="text-xs text-gray-500 ml-1">{t("migratedUser.onboarding.last_name_optional")}</span>}
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={lastName ? t("migratedUser.onboarding.last_name_placeholder_update") : t("migratedUser.onboarding.last_name_placeholder_enter")}
                    data-testid="input-last-name"
                  />
                  {lastName && (
                    <p className="text-xs text-gray-500">{t("migratedUser.onboarding.last_name_current", { name: lastName })}</p>
                  )}
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-gray-700">
                    {t("migratedUser.onboarding.all_set_message")}
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full bg-pcs_blue hover:bg-blue-600"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-complete-onboarding"
                >
                  {updateProfileMutation.isPending ? (
                    t("migratedUser.onboarding.completing_setup_button")
                  ) : (
                    <>
                      {t("migratedUser.onboarding.complete_setup_button")} <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
