import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Globe, Shield, ArrowRight, School } from "lucide-react";
import logoUrl from "@assets/Logo_1757848498470.png";

export default function Login() {
  const handleLogin = (provider: string) => {
    // Redirect to Google OAuth with returnTo parameter
    if (provider === 'google') {
      window.location.href = `/api/auth/google?returnTo=/`;
    }
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
          <h1 className="heading-2 mb-2" data-testid="text-login-title">
            Welcome to Plastic Clever Schools
          </h1>
          <p className="body-text text-gray-600" data-testid="text-login-description">
            Sign in to access your school's sustainability dashboard and resources
          </p>
        </div>

        {/* Login Card */}
        <Card className="card-clean shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="heading-4 text-navy">
              Sign In to Your Account
            </CardTitle>
            <p className="caption text-gray-500 mt-2">
              Choose your preferred sign-in method
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Continue with Google Button */}
            <Button
              size="lg"
              className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 group shadow-sm hover:shadow-md"
              onClick={() => handleLogin('google')}
              data-testid="button-login-google"
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
                <span className="font-semibold">Continue with Google</span>
                <ArrowRight className="icon-sm ml-auto transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Button>

            {/* Continue with Email Button */}
            <Button
              size="lg"
              className="w-full btn-primary group"
              onClick={() => handleLogin('email')}
              data-testid="button-login-email"
            >
              <div className="flex items-center justify-center gap-3">
                <Mail className="icon-md transition-transform duration-300 group-hover:scale-110" />
                <span className="font-semibold">Continue with Email</span>
                <ArrowRight className="icon-sm ml-auto transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 font-medium">
                  Secure Authentication
                </span>
              </div>
            </div>

            {/* Security Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="icon-sm text-teal flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-navy">Secure & Private</p>
                  <p className="text-xs text-gray-600">Your data is protected with enterprise-grade security</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <School className="icon-sm text-ocean-blue flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-navy">School-Focused</p>
                  <p className="text-xs text-gray-600">Designed specifically for educational environments</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Globe className="icon-sm text-coral flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-navy">Global Community</p>
                  <p className="text-xs text-gray-600">Join schools worldwide making a difference</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Information */}
        <div className="text-center mt-8 space-y-2">
          <p className="caption text-gray-500">
            New to Plastic Clever Schools?{" "}
            <a 
              href="/" 
              className="text-ocean-blue hover:text-navy font-medium transition-colors duration-200"
              data-testid="link-learn-more"
            >
              Learn more about our program
            </a>
          </p>
          <p className="caption text-gray-400">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </div>
  );
}