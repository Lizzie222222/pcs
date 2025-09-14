import { Switch, Route, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/states";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Resources from "@/pages/resources";
import Inspiration from "@/pages/inspiration";
import SchoolsMap from "@/pages/schools-map";
import Search from "@/pages/search";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Navigation from "@/components/Navigation";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  // Focus management for route changes
  useEffect(() => {
    if (mainRef.current) {
      // Reset scroll position
      window.scrollTo(0, 0);
      
      // Set focus to main content after route change for screen readers
      mainRef.current.focus();
      
      // Update page title for screen readers
      const pageTitles: Record<string, string> = {
        '/': isAuthenticated ? 'Dashboard - Plastic Clever Schools' : 'Home - Plastic Clever Schools',
        '/resources': 'Resources - Plastic Clever Schools',
        '/inspiration': 'Inspiration - Plastic Clever Schools',
        '/schools-map': 'Schools Map - Plastic Clever Schools',
        '/search': 'Search - Plastic Clever Schools',
        '/admin': 'Admin Panel - Plastic Clever Schools',
        '/login': 'Sign In - Plastic Clever Schools'
      };
      
      const title = pageTitles[location] || 'Page Not Found - Plastic Clever Schools';
      document.title = title;
    }
  }, [location, isAuthenticated]);

  // Skip to main content function
  const skipToMainContent = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mainRef.current) {
      mainRef.current.focus();
      mainRef.current.scrollIntoView();
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner 
        size="xl" 
        message="Loading application..." 
        fullScreen={true}
        className="bg-gray-50"
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Link for Screen Readers */}
      <a
        ref={skipLinkRef}
        href="#main-content"
        className="skip-link focus-visible:focus-visible"
        onClick={skipToMainContent}
        data-testid="link-skip-main"
      >
        Skip to main content
      </a>
      
      {/* Header with Navigation */}
      <header role="banner">
        <Navigation />
      </header>
      
      {/* Main Content Area */}
      <main 
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        role="main"
        className="focus:outline-none"
      >
        <Switch>
          {!isAuthenticated ? (
            <>
              <Route path="/" component={Landing} />
              <Route path="/login" component={Login} />
              <Route path="/resources" component={Resources} />
              <Route path="/inspiration" component={Inspiration} />
              <Route path="/schools-map" component={SchoolsMap} />
              <Route path="/search" component={Search} />
            </>
          ) : (
            <>
              <Route path="/" component={Home} />
              <Route path="/login" component={Login} />
              <Route path="/resources" component={Resources} />
              <Route path="/inspiration" component={Inspiration} />
              <Route path="/schools-map" component={SchoolsMap} />
              <Route path="/search" component={Search} />
              <Route path="/admin" component={Admin} />
            </>
          )}
          <Route component={NotFound} />
        </Switch>
      </main>
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
