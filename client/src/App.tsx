import { Switch, Route, useLocation } from "wouter";
import { useEffect, useRef, Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/states";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { updatePageSEO, addStructuredData, defaultStructuredData } from "@/lib/seoUtils";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getGradientById } from "@shared/gradients";
import { CollaborationProvider } from "@/contexts/CollaborationContext";

// Page Loading Component
const PageLoadingFallback = () => (
  <div className="flex justify-center items-center min-h-[50vh]">
    <LoadingSpinner size="lg" />
  </div>
);

// Direct lazy imports - proper approach
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const Resources = lazy(() => import("@/pages/resources"));
const ResourceView = lazy(() => import("@/pages/ResourceView"));
const Inspiration = lazy(() => import("@/pages/inspiration"));
const CaseStudyDetail = lazy(() => import("@/pages/case-study-detail"));
const EvidenceDetail = lazy(() => import("@/pages/evidence-detail"));
const SchoolsMap = lazy(() => import("@/pages/schools-map"));
const Search = lazy(() => import("@/pages/search"));
const Events = lazy(() => import("@/pages/events"));
const EventLive = lazy(() => import("@/pages/event-live"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const Admin = lazy(() => import("@/pages/admin"));
const SchoolProfile = lazy(() => import("@/pages/SchoolProfile"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Contact = lazy(() => import("@/pages/contact"));
const HelpCenter = lazy(() => import("@/pages/help-center"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Profile = lazy(() => import("@/pages/profile"));
const InvitationAccept = lazy(() => import("@/pages/InvitationAccept"));
const AdminInvitationAccept = lazy(() => import("@/pages/AdminInvitationAccept"));
const MigrateAccount = lazy(() => import("@/pages/MigrateAccount"));
const MigratedUserOnboarding = lazy(() => import("@/pages/MigratedUserOnboarding"));
const TestLogin = lazy(() => import("@/pages/TestLogin"));
const HowItWorks = lazy(() => import("@/pages/how-it-works"));
const AwardCriteria = lazy(() => import("@/pages/award-criteria"));
const Partners = lazy(() => import("@/pages/partners"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  // Redirect migrated users who need password reset
  useEffect(() => {
    if (isAuthenticated && user?.isMigrated && user?.needsPasswordReset && location !== '/migrated-onboarding') {
      setLocation('/migrated-onboarding');
    }
  }, [isAuthenticated, user, location, setLocation]);

  // Fetch active event banner - MUST be before any conditional returns
  const { data: activeBanner } = useQuery<any>({
    queryKey: ['/api/banners/active'],
  });

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
    <CollaborationProvider user={user} isAuthenticated={isAuthenticated}>
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
      
      {/* Global Event Banner */}
      {activeBanner && (
        <div 
          className="w-full px-3 text-center fixed top-0 left-0 right-0 z-[60] shadow-md flex items-center justify-center"
          style={{
            backgroundImage: getGradientById(activeBanner.gradient)?.gradient || `linear-gradient(135deg, ${activeBanner.backgroundColor} 0%, ${activeBanner.backgroundColor} 100%)`,
            color: activeBanner.textColor,
            height: '48px',
          }}
          data-testid="event-banner"
        >
          <div className="max-w-7xl mx-auto flex flex-row items-center justify-center gap-2 text-sm h-full">
            <Badge 
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-0.5 text-[10px] leading-tight font-bold shadow-sm border-0"
              data-testid="badge-new-event-banner"
            >
              ✨ NEW
            </Badge>
            <p className="font-semibold leading-snug">
              {activeBanner.text}
            </p>
            <Button
              onClick={() => window.location.href = `/events/${activeBanner.event.publicSlug || activeBanner.event.id}`}
              className="bg-white hover:bg-gray-100 text-pcs_blue hover:text-ocean-blue font-semibold px-4 py-1 text-xs leading-tight rounded-md transition-all duration-200 shadow-sm hover:shadow-md h-auto"
              data-testid="button-banner-event"
            >
              Learn More →
            </Button>
          </div>
        </div>
      )}
      
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
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/contact" component={Contact} />
              <Route path="/help-center" component={HelpCenter} />
              <Route path="/terms" component={Terms} />
              <Route path="/privacy" component={Privacy} />
              <Route path="/how-it-works" component={HowItWorks} />
              <Route path="/award-criteria" component={AwardCriteria} />
              <Route path="/partners" component={Partners} />
              <Route path="/invitations/:token" component={InvitationAccept} />
              <Route path="/admin-invitations/:token" component={AdminInvitationAccept} />
              {import.meta.env.DEV && <Route path="/test-login" component={TestLogin} />}
              <Route path="/resources" component={Resources} />
              <Route path="/resources/view/:id" component={ResourceView} />
              <Route path="/inspiration" component={Inspiration} />
              <Route path="/case-study/:id" component={CaseStudyDetail} />
              <Route path="/evidence/:id" component={EvidenceDetail} />
              <Route path="/schools-map" component={SchoolsMap} />
              <Route path="/search" component={Search} />
              <Route path="/events" component={Events} />
              <Route path="/events/:slug" component={EventLive} />
              {isAuthenticated && (
                <>
                  <Route path="/profile" component={Profile} />
                  <Route path="/migrate-account" component={MigrateAccount} />
                  <Route path="/migrated-onboarding" component={MigratedUserOnboarding} />
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
                  <Route path="/admin/evidence-requirements">
                    {() => <Admin initialTab="evidence-requirements" />}
                  </Route>
                  <Route path="/admin/school/:id" component={SchoolProfile} />
                  <Route path="/admin">
                    {() => <Admin />}
                  </Route>
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </main>
      </div>
    </CollaborationProvider>
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
