import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Resources from "@/pages/resources";
import Inspiration from "@/pages/inspiration";
import SchoolsMap from "@/pages/schools-map";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Navigation from "@/components/Navigation";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/resources" component={Resources} />
            <Route path="/inspiration" component={Inspiration} />
            <Route path="/schools-map" component={SchoolsMap} />
          </>
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/resources" component={Resources} />
            <Route path="/inspiration" component={Inspiration} />
            <Route path="/schools-map" component={SchoolsMap} />
            <Route path="/admin" component={Admin} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
