import { Switch, Route, useLocation } from "wouter";
import { useEffect, useRef, Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/states";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { updatePageSEO, addStructuredData, defaultStructuredData } from "@/lib/seoUtils";
import { useTranslation } from "react-i18next";

// Page Loading Component
const PageLoadingFallback = () => (
  <div className="flex justify-center items-center min-h-[50vh]">
    <LoadingSpinner size="lg" message="Loading page..." />
  </div>
);

// Direct lazy imports - proper approach
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const Resources = lazy(() => import("@/pages/resources"));
const Inspiration = lazy(() => import("@/pages/inspiration"));
const CaseStudyDetail = lazy(() => import("@/pages/case-study-detail"));
const SchoolsMap = lazy(() => import("@/pages/schools-map"));
const Search = lazy(() => import("@/pages/search"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const Admin = lazy(() => import("@/pages/admin"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const InvitationAccept = lazy(() => import("@/pages/InvitationAccept"));
const AdminInvitationAccept = lazy(() => import("@/pages/AdminInvitationAccept"));
const TestLogin = lazy(() => import("@/pages/TestLogin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  // Focus management and SEO for route changes
  useEffect(() => {
    if (mainRef.current) {
      // Reset scroll position
      window.scrollTo(0, 0);
      
      // Set focus to main content after route change for screen readers
      mainRef.current.focus();
      
      // Update comprehensive SEO for the current page
      updatePageSEO(location, isAuthenticated);
    }
  }, [location, isAuthenticated]);

  // Initialize structured data on app load
  useEffect(() => {
    addStructuredData('EducationalOrganization', defaultStructuredData);
  }, []);

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
        {t('accessibility.skip_to_main_content')}
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
        <Suspense fallback={<PageLoadingFallback />}>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/invitations/:token" component={InvitationAccept} />
            <Route path="/admin-invitations/:token" component={AdminInvitationAccept} />
            {import.meta.env.DEV && <Route path="/test-login" component={TestLogin} />}
            <Route path="/resources" component={Resources} />
            <Route path="/inspiration" component={Inspiration} />
            <Route path="/case-study/:id" component={CaseStudyDetail} />
            <Route path="/schools-map" component={SchoolsMap} />
            <Route path="/search" component={Search} />
            {isAuthenticated && (
              <>
                <Route path="/dashboard">
                  {() => {
                    if (user?.isAdmin) {
                      window.location.href = "/admin";
                      return null;
                    }
                    return <Home />;
                  }}
                </Route>
                <Route path="/dashboard/team-management" component={TeamManagement} />
                <Route path="/admin" component={Admin} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
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
