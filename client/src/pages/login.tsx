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
                  className="w-full btn-primary min-h-[44px]"
                  disabled={isLoggingIn}
                  data-testid="button-login-submit"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {isLoggingIn ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Mail className="h-5 w-5" />
                    )}
                    <span>{isLoggingIn ? t('auth:login.signing_in') : t('auth:login.sign_in_button')}</span>
                  </span>
                </Button>
              </form>
            </Form>
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