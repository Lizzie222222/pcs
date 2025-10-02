import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TestLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const performTestLogin = async () => {
      if (!import.meta.env.DEV) {
        setError("Test login is only available in development mode");
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const email = params.get("email");
        const firstName = params.get("firstName");
        const lastName = params.get("lastName");
        const sub = params.get("sub");
        const isAdmin = params.get("isAdmin") === "true";
        const redirect = params.get("redirect") || "/";

        if (!email || !firstName || !lastName || !sub) {
          setError("Missing required parameters: email, firstName, lastName, sub");
          setIsLoading(false);
          return;
        }

        await apiRequest("POST", "/api/test-auth/login", {
          email,
          firstName,
          lastName,
          sub,
          isAdmin,
        });

        sessionStorage.setItem('pcs_auth_hint', 'true');
        
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });

        setLocation(redirect);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
        setIsLoading(false);
      }
    };

    performTestLogin();
  }, [setLocation]);

  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600" data-testid="text-test-login-error">
            Test login is only available in development mode
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {isLoading ? (
          <p data-testid="status-test-login">Logging in for testing...</p>
        ) : error ? (
          <p className="text-red-600" data-testid="text-test-login-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
