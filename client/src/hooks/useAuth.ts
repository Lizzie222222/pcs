import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, LoginForm, RegisterForm } from "@shared/schema";
import i18n from "@/lib/i18n";

// Authentication state management to prevent unnecessary API calls
const AUTH_HINT_KEY = 'pcs_auth_hint';
const AUTH_CHECK_KEY = 'pcs_auth_check';

// Safe sessionStorage wrapper with error handling
function safeSessionStorage() {
  try {
    return {
      getItem: (key: string) => sessionStorage.getItem(key),
      setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
      removeItem: (key: string) => sessionStorage.removeItem(key),
    };
  } catch {
    // Fallback for environments without sessionStorage or when disabled
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
}

function getAuthHint(): boolean {
  const storage = safeSessionStorage();
  const hint = storage.getItem(AUTH_HINT_KEY);
  return hint === 'true';
}

// Check if we should attempt authentication (e.g., after OAuth return)
function shouldCheckAuth(): boolean {
  try {
    const url = new URL(window.location.href);
    const storage = safeSessionStorage();
    
    // Check for OAuth return indicators including our custom auth flag
    const hasOAuthParams = url.searchParams.has('code') || 
                          url.searchParams.has('state') || 
                          url.searchParams.has('auth') || // Our custom flag from server
                          url.pathname.includes('/callback');
    
    // Check if we've already done an initial check this session
    const hasChecked = storage.getItem(AUTH_CHECK_KEY) === 'true';
    
    // Only check auth if we have OAuth indicators (don't check on first load without them)
    return hasOAuthParams && !hasChecked;
  } catch {
    // Fallback: don't check auth if we can't detect properly
    return false;
  }
}

function markAuthChecked() {
  const storage = safeSessionStorage();
  storage.setItem(AUTH_CHECK_KEY, 'true');
}

function setAuthHint(isAuthenticated: boolean) {
  const storage = safeSessionStorage();
  if (isAuthenticated) {
    storage.setItem(AUTH_HINT_KEY, 'true');
  } else {
    storage.removeItem(AUTH_HINT_KEY);
  }
}

function clearAuthHint() {
  const storage = safeSessionStorage();
  storage.removeItem(AUTH_HINT_KEY);
}

export function useAuth() {
  const { toast } = useToast();
  const authHint = getAuthHint();
  const shouldCheck = shouldCheckAuth();

  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      const user = data.user || null;
      
      // Apply user's preferred language if available
      if (user?.preferredLanguage && user.preferredLanguage !== i18n.language) {
        i18n.changeLanguage(user.preferredLanguage);
      }
      
      // Extract user from the response wrapper
      return user;
    },
    retry: false,
    enabled: true, // Always check auth on initial load to detect existing sessions
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Fallback mechanism: if we successfully get a user, set the auth hint
  if (user && !authHint) {
    setAuthHint(true);
  }
  
  // Mark that we've done an initial auth check
  if (shouldCheck && !isLoading) {
    markAuthChecked();
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginForm) => {
      try {
        const response = await apiRequest("POST", "/api/auth/login", credentials);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || "Login failed");
        }
        
        return result.user;
      } catch (error: any) {
        // Check if this is a 403 error (migrated user needs password reset)
        if (error.message?.includes('403:')) {
          try {
            // Extract JSON from error message (format: "403: {...}")
            const jsonMatch = error.message.match(/403:\s*(.+)$/);
            if (jsonMatch) {
              const errorData = JSON.parse(jsonMatch[1]);
              
              if (errorData.isMigratedUser && errorData.email) {
                // Create a special error object that onError can detect
                const migratedError = new Error('MIGRATED_USER');
                (migratedError as any).email = errorData.email;
                (migratedError as any).isMigratedUser = true;
                throw migratedError;
              }
            }
          } catch (parseError) {
            // Only continue if parseError is from JSON parsing, not from our throw
            if (parseError instanceof SyntaxError) {
              // JSON parse failed, continue with normal error handling
            } else {
              // This was our custom error being thrown, re-throw it
              throw parseError;
            }
          }
        }
        
        // Re-throw the original error for normal error handling
        throw error;
      }
    },
    onSuccess: async (user: User) => {
      // Set authentication hint and update cache
      setAuthHint(true);
      queryClient.setQueryData(["/api/auth/user"], user);
      
      // Apply user's preferred language and wait for it to complete
      if (user.preferredLanguage && user.preferredLanguage !== i18n.language) {
        await i18n.changeLanguage(user.preferredLanguage);
      }
      
      toast({
        title: "Welcome back!",
        description: `Successfully signed in as ${user.firstName || user.email}`,
      });
      // Redirect based on user role
      if (user.isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    },
    onError: (error: any) => {
      // Check if this is a migrated user error (custom error from mutationFn)
      if (error.message === 'MIGRATED_USER' && error.isMigratedUser && error.email) {
        toast({
          title: "Welcome back!",
          description: "We see you're from our old platform. Please reset your password to continue.",
        });
        // Redirect to forgot password with email pre-filled
        const encodedEmail = encodeURIComponent(error.email);
        window.location.href = `/forgot-password?email=${encodedEmail}`;
        return;
      }
      
      let errorMessage = "Login failed. Please try again.";
      
      // Handle validation errors or specific backend errors
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

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterForm) => {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Registration failed");
      }
      
      return result.user;
    },
    onSuccess: async (user: User) => {
      // Set authentication hint and update cache
      setAuthHint(true);
      queryClient.setQueryData(["/api/auth/user"], user);
      
      // Apply user's preferred language and wait for it to complete
      if (user.preferredLanguage && user.preferredLanguage !== i18n.language) {
        await i18n.changeLanguage(user.preferredLanguage);
      }
      
      toast({
        title: "Account created successfully!",
        description: `Welcome to Plastic Clever Schools, ${user.firstName}!`,
      });
      // Redirect based on user role
      if (user.isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/register";
      }
    },
    onError: (error: Error) => {
      let errorMessage = "Registration failed. Please try again.";
      
      // Handle validation errors or specific backend errors
      if (error.message.includes("400:")) {
        try {
          const errorData = JSON.parse(error.message.split(": ")[1]);
          if (errorData.errors && Array.isArray(errorData.errors)) {
            // Handle Zod validation errors
            errorMessage = errorData.errors.map((err: any) => err.message).join(", ");
          } else {
            errorMessage = errorData.message || "Registration failed";
          }
        } catch {
          errorMessage = "Registration failed";
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout");
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Logout failed");
      }
      
      return result;
    },
    onSuccess: () => {
      // Clear authentication hint and cache
      clearAuthHint();
      queryClient.setQueryData(["/api/auth/user"], null);
      // Invalidate all queries to clear any user-specific data
      queryClient.invalidateQueries();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
      // Redirect to home page
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: "There was an issue signing you out. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Method to manually check authentication status (for OAuth returns, etc.)
  const checkAuthStatus = () => {
    setAuthHint(true);
    refetch();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    checkAuthStatus,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
