import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, LoginForm, RegisterForm } from "@shared/schema";

export function useAuth() {
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Login failed");
      }
      
      return result.user;
    },
    onSuccess: (user: User) => {
      // Update the user query cache
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Welcome back!",
        description: `Successfully signed in as ${user.firstName || user.email}`,
      });
      // Redirect to home page
      window.location.href = "/";
    },
    onError: (error: Error) => {
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
    onSuccess: (user: User) => {
      // Update the user query cache
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: "Account created successfully!",
        description: `Welcome to Plastic Clever Schools, ${user.firstName}!`,
      });
      // Redirect to register page for school signup or home
      window.location.href = "/register";
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
      // Clear the user query cache
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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
