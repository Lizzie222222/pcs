import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/states";
import { Mail, Globe, Shield, ArrowRight, School, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createLoginSchema, type LoginForm } from "@shared/schema";
import logoUrl from "@assets/Logo_1757848498470.png";

export default function Login() {
  const { t } = useTranslation(['auth', 'forms']);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn } = useAuth();
  
  const loginSchema = createLoginSchema(t);
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleEmailLogin = (data: LoginForm) => {
    login(data);
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?returnTo=/`;
  };

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
          <h1 className="text-3xl font-bold text-navy leading-tight mb-2" data-testid="text-login-title">
            {t('auth:login.title')}
          </h1>
          <p className="text-base text-gray-600 leading-relaxed" data-testid="text-login-description">
            {t('auth:login.subtitle')}
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white border border-gray-200 rounded-lg shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-navy">
              {t('auth:login.form_title')}
            </CardTitle>
            <p className="caption text-gray-500 mt-2">
              {t('auth:login.form_subtitle')}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Email/Password Login Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEmailLogin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth:login.email_label')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('auth:login.email_placeholder')}
                          {...field}
                          data-testid="input-email"
                          disabled={isLoggingIn}
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
                      <FormLabel>{t('auth:login.password_label')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={t('auth:login.password_placeholder')}
                            {...field}
                            data-testid="input-password"
                            disabled={isLoggingIn}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                            disabled={isLoggingIn}
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
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  size="lg"
                  className="w-full btn-primary"
                  disabled={isLoggingIn}
                  data-testid="button-login-submit"
                >
                  {isLoggingIn ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('auth:login.signing_in')}
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      {t('auth:login.sign_in_button')}
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
                  {t('auth:login.continue_with')}
                </span>
              </div>
            </div>

            {/* Continue with Google Button */}
            <Button
              size="lg"
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group shadow-sm hover:shadow-md"
              onClick={handleGoogleLogin}
              data-testid="button-login-google"
              disabled={isLoggingIn}
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
                <span className="font-semibold">{t('auth:login.google_button')}</span>
                <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Button>

          </CardContent>
        </Card>

        {/* Footer Information */}
        <div className="text-center mt-8 space-y-2">
          <p className="caption text-gray-500">
            {t('auth:login.no_account')}{" "}
            <a 
              href="/register" 
              className="text-ocean-blue hover:text-navy font-medium transition-colors duration-200"
              data-testid="link-register"
            >
              {t('auth:login.register_link')}
            </a>
          </p>
          <p className="caption text-gray-500">
            {t('auth:login.new_to_platform')}{" "}
            <a 
              href="/" 
              className="text-ocean-blue hover:text-navy font-medium transition-colors duration-200"
              data-testid="link-learn-more"
            >
              {t('auth:login.learn_more_link')}
            </a>
          </p>
          <p className="caption text-gray-400">
            {t('auth:login.terms_agreement')}
          </p>
        </div>
      </div>
    </div>
  );
}