import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/states";
import { Mail, Globe, Shield, ArrowRight, School, User, LogOut, Eye, EyeOff, UserPlus, X, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createRegisterSchema, type RegisterForm } from "@shared/schema";
import MultiStepSchoolRegistration from "@/components/MultiStepSchoolRegistration";
import JoinSchoolFlow from "@/components/JoinSchoolFlow";
import logoUrl from "@assets/Logo_1757848498470.png";

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

export default function Register() {
  const { t, i18n } = useTranslation(['auth', 'forms', 'common']);
  const { user, isLoading, isAuthenticated, register, isRegistering } = useAuth();
  const [, setLocation] = useLocation();
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [showJoinSchoolFlow, setShowJoinSchoolFlow] = useState(false);
  
  const registerSchema = createRegisterSchema(t);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.isAdmin) {
      setLocation("/admin");
    }
  }, [isLoading, isAuthenticated, user, setLocation]);
  
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      preferredLanguage: i18n.language || "en",
    },
  });

  const handleEmailRegistration = (data: RegisterForm) => {
    register(data);
  };

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const handleStartRegistration = () => {
    setShowSchoolForm(true);
  };

  const handleCloseSchoolForm = () => {
    setShowSchoolForm(false);
  };

  const handleRequestJoinInstead = () => {
    setShowSchoolForm(false);
    setShowJoinSchoolFlow(true);
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        size="xl" 
        message={t('auth:register.loading_message')} 
        fullScreen={true}
        className="bg-gray-50"
      />
    );
  }

  // This is now handled inline with showSchoolForm state

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-ocean-light/20 to-navy-light/30 flex items-center justify-center p-4 pt-20">
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
          <h1 className="text-3xl font-bold text-navy leading-tight mb-2" data-testid="text-register-title">
            {isAuthenticated ? t('auth:register.complete_registration_title') : t('auth:register.title')}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed" data-testid="text-register-description">
            {isAuthenticated 
              ? t('auth:register.complete_registration_subtitle')
              : t('auth:register.subtitle')
            }
          </p>
        </div>

        {!isAuthenticated ? (
          /* Unauthenticated State - Show Login Options */
          <>
            {showEmailForm ? (
              /* Email Registration Form */
              <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-navy">{t('auth:register.form_title')}</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmailForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                      data-testid="button-back-to-signup-methods"
                    >
                      {t('auth:register.back_to_methods')}
                    </Button>
                  </div>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEmailRegistration)} className="space-y-4">
                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth:register.first_name_label')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('auth:register.first_name_placeholder')}
                                  {...field}
                                  data-testid="input-first-name"
                                  disabled={isRegistering}
                                />
                              </FormControl>
                              <FormMessage data-testid="error-first-name" />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth:register.last_name_label')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('auth:register.last_name_placeholder')}
                                  {...field}
                                  data-testid="input-last-name"
                                  disabled={isRegistering}
                                />
                              </FormControl>
                              <FormMessage data-testid="error-last-name" />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth:register.email_label')}</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder={t('auth:register.email_placeholder')}
                                {...field}
                                data-testid="input-email"
                                disabled={isRegistering}
                              />
                            </FormControl>
                            <FormMessage data-testid="error-email" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth:register.password_label')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder={t('auth:register.password_placeholder')}
                                  {...field}
                                  data-testid="input-password"
                                  disabled={isRegistering}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                  data-testid="button-toggle-password"
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
                            <FormMessage data-testid="error-password" />
                            <p className="text-xs text-gray-600 mt-1">
                              {t('auth:register.password_requirements')}
                            </p>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth:register.confirm_password_label')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder={t('auth:register.confirm_password_placeholder')}
                                  {...field}
                                  data-testid="input-confirm-password"
                                  disabled={isRegistering}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  data-testid="button-toggle-confirm-password"
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
                            <FormMessage data-testid="error-confirm-password" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="preferredLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('auth:register.preferred_language_label')}</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={isRegistering}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-preferred-language">
                                  <SelectValue placeholder={t('auth:register.preferred_language_placeholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
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
                            <FormMessage data-testid="error-preferred-language" />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowEmailForm(false)}
                          disabled={isRegistering}
                          data-testid="button-cancel-registration"
                          className="flex-1"
                        >
                          {t('auth:register.back_to_methods')}
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
                              {t('auth:register.creating_account')}
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              {t('auth:register.create_account_button')}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              /* Signup Methods Card */
              <Card className="bg-white rounded-lg shadow-lg border-0">
                <CardContent className="space-y-4 pt-6">
                  {/* Sign Up Buttons Together */}
                  <div className="space-y-3">
                    {/* Email Registration Button */}
                    <Button
                      size="lg"
                      className="w-full btn-primary group"
                      onClick={() => setShowEmailForm(true)}
                      data-testid="button-register-email"
                      disabled={isRegistering}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Mail className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-semibold">{t('auth:register.sign_up_email')}</span>
                        <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </Button>
                  </div>

                  {/* Why do I need an account divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-3 text-gray-600 font-medium">
                        {t('auth:register.why_account_title')}
                      </span>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <School className="h-4 w-4 text-teal flex-shrink-0" />
                      <p className="text-sm text-gray-700">{t('auth:register.benefit_1')}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-ocean-blue flex-shrink-0" />
                      <p className="text-sm text-gray-700">{t('auth:register.benefit_2')}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-navy flex-shrink-0" />
                      <p className="text-sm text-gray-700">{t('auth:register.benefit_3')}</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            )}

            {/* Footer Information */}
            <div className="text-center mt-8 space-y-2">
              <p className="caption text-gray-500">
                {t('auth:register.already_have_account')}{" "}
                <a 
                  href="/login" 
                  className="text-ocean-blue hover:text-navy font-medium transition-colors duration-200"
                  data-testid="link-login"
                >
                  {t('auth:register.sign_in_link')}
                </a>
              </p>
              <p className="caption text-gray-400">
                {t('auth:register.terms_agreement')}
              </p>
            </div>
          </>
        ) : (
          /* Authenticated State - Show Registration Options */
          <>
            {showJoinSchoolFlow ? (
              /* Join School Flow */
              <Card className="bg-white border border-gray-200 rounded-lg shadow-lg border-0 max-w-4xl w-full">
                <CardContent className="space-y-6 p-6">
                  <JoinSchoolFlow onClose={() => setShowJoinSchoolFlow(false)} inline={true} />
                </CardContent>
              </Card>
            ) : showSchoolForm ? (
              /* School Registration Form */
              <Card className="bg-white border border-gray-200 rounded-lg shadow-sm shadow-lg border-0 max-w-2xl w-full">
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-pcs_blue text-white p-2 rounded-lg">
                        <School className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-navy" data-testid="text-signup-title">
                          {t('forms:school_registration.title')}
                        </h2>
                        <p className="text-gray-600">{t('forms:school_registration.subtitle')}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSchoolForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                      data-testid="button-back-to-welcome"
                    >
                      {t('auth:register.back_to_methods')}
                    </Button>
                  </div>
                  
                  <MultiStepSchoolRegistration 
                    onClose={handleCloseSchoolForm}
                  />
                </CardContent>
              </Card>
            ) : (
              /* Welcome Card */
              <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <User className="h-5 w-5 text-teal" />
                    <CardTitle className="text-xl font-semibold text-navy">
                      {t('auth:register.welcome_user', { name: user?.firstName || 'Educator' })}
                    </CardTitle>
                  </div>
                  <p className="caption text-gray-500">
                    {t('auth:register.welcome_subtitle')}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* User Info */}
                  {user?.email && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-4 w-4 text-ocean-blue" />
                      <div>
                        <p className="text-sm font-medium text-navy">{t('auth:register.signed_in_as')}</p>
                        <p className="text-xs text-gray-600" data-testid="text-user-email">{user.email}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* Register School Button */}
                    <Button
                      size="lg"
                      className="w-full btn-primary group"
                      onClick={handleStartRegistration}
                      data-testid="button-start-school-registration"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <School className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-semibold">{t('auth:register.register_school_button')}</span>
                        <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </Button>
                  </div>

                  {/* Registration Benefits for Authenticated Users */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-teal/10 rounded-lg">
                      <School className="h-4 w-4 text-teal flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-navy">{t('auth:register.register_or_join_school')}</p>
                        <p className="text-xs text-gray-600">{t('auth:register.register_or_join_description')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-ocean-blue/10 rounded-lg">
                      <Globe className="h-4 w-4 text-ocean-blue flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-navy">{t('auth:register.access_full_platform')}</p>
                        <p className="text-xs text-gray-600">{t('auth:register.access_full_description')}</p>
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
                      <LogOut className="h-3 w-3" />
                      <span>{t('auth:register.sign_out')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/'}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-800 ml-auto"
                      data-testid="button-back-home"
                    >
                      <span>{t('auth:register.back_home')}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

    </div>
  );
}