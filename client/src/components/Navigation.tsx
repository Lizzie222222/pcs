import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut } from "lucide-react";
import logoUrl from "@assets/Logo_1757848498470.png";
import { LanguageSwitcher } from "./LanguageSwitcher";
import Avatar from "./Avatar";

interface DashboardData {
  school: {
    id: string;
    name: string;
  };
  schoolUser?: {
    role: 'head_teacher' | 'teacher';
  };
}

export default function Navigation() {
  const { t } = useTranslation('common');
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Query dashboard to get user's school role
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated && !user?.isAdmin,
    retry: false,
  });

  // Check if user is a head teacher
  const isHeadTeacher = dashboardData?.schoolUser?.role === 'head_teacher';

  // Create stable key mapping for test IDs based on href values
  const getStableKey = (href: string) => {
    const keyMap: Record<string, string> = {
      '/': 'home',
      '/resources': 'resources',
      '/inspiration': 'inspiration',
      '/schools-map': 'schools-map',
      '/search': 'search',
      '/dashboard/team-management': 'team-management',
      '/admin': 'admin'
    };
    return keyMap[href] || href.slice(1).replace(/\//g, '-');
  };

  const navItems = [
    { href: "/", label: t('navigation.home'), public: false },
    { href: "/resources", label: t('navigation.resources'), public: true },
    { href: "/inspiration", label: t('navigation.inspiration'), public: true },
    { href: "/schools-map", label: t('navigation.schools_map'), public: true },
    { href: "/search", label: t('navigation.search'), public: true },
  ];

  // Add team management link if user is head teacher
  if (isHeadTeacher) {
    navItems.splice(1, 0, { href: "/dashboard/team-management", label: "Team Management", public: false });
  }

  // Add admin link if user is admin
  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: t('navigation.admin'), public: false });
  }

  const handleNavClick = (href: string) => {
    setLocation(href);
    setIsMobileMenuOpen(false);
  };

  const handleAuth = () => {
    if (isAuthenticated) {
      window.location.href = "/api/auth/logout";
    } else {
      setLocation("/login");
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50" role="navigation" aria-label={t('navigation.main_navigation')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => handleNavClick('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:focus-visible"
              data-testid="button-logo"
              aria-label={t('navigation.go_to_homepage')}
            >
              <img 
                src={logoUrl} 
                alt="Plastic Clever Schools" 
                className="h-10 w-auto" 
              />
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                if (!item.public && !isAuthenticated) return null;
                
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:focus-visible btn-animate relative overflow-hidden ${
                      isActive
                        ? 'bg-ocean-blue text-white'
                        : 'text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 hover:underline'
                    }`}
                    data-testid={`nav-${getStableKey(item.href)}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2" data-testid="container-user-profile">
                  <Avatar 
                    seed={user?.email || ''} 
                    size={32}
                    dataTestId="img-avatar-desktop"
                    alt={`${user?.firstName || user?.email}'s avatar`}
                  />
                  <span className="text-gray-700 text-sm" data-testid="text-user-name">
                    {user?.firstName || user?.email}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleAuth}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('navigation.logout')}
                </Button>
              </>
            ) : (
              <>
                <button
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 hover:underline focus-visible:focus-visible"
                  onClick={handleAuth}
                  data-testid="button-login"
                >
                  {t('navigation.login')}
                </button>
                <Button
                  className="btn-primary"
                  onClick={() => setLocation('/register')}
                  data-testid="button-register"
                >
                  {t('navigation.register')}
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-gray-700 hover:bg-gray-100 focus-visible:focus-visible"
                  data-testid="button-mobile-menu"
                  aria-label={t('navigation.open_mobile_menu')}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-menu"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="bg-white text-gray-900 border-gray-200"
                id="mobile-menu"
                aria-label={t('navigation.mobile_menu')}
              >
                <SheetHeader>
                  <SheetTitle className="text-gray-900 text-left flex items-center gap-2">
                    <img 
                      src={logoUrl} 
                      alt="Plastic Clever Schools" 
                      className="h-8 w-auto" 
                    />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 space-y-4" aria-label={t('navigation.mobile_menu_navigation')}>
                  {navItems.map((item) => {
                    if (!item.public && !isAuthenticated) return null;
                    
                    const isActive = location === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:focus-visible btn-animate min-h-[44px] relative overflow-hidden ${
                          isActive
                            ? 'bg-ocean-blue text-white'
                            : 'text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 hover:underline'
                        }`}
                        data-testid={`mobile-nav-${getStableKey(item.href)}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  
                  {/* Mobile Language Switcher */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700 mb-2" data-testid="mobile-language-switcher-label">
                        {t('language.language_switcher_label')}
                      </div>
                      <div data-testid="mobile-language-switcher">
                        <LanguageSwitcher />
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Auth */}
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-2 px-3 py-2" data-testid="mobile-container-user-profile">
                          <Avatar 
                            seed={user?.email || ''} 
                            size={32}
                            dataTestId="img-avatar-mobile"
                            alt={`${user?.firstName || user?.email}'s avatar`}
                          />
                          <span className="text-sm text-gray-700" data-testid="mobile-text-user-name">
                            {user?.firstName || user?.email}
                          </span>
                        </div>
                        <button
                          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 hover:underline transition-colors focus-visible:focus-visible btn-animate min-h-[44px]"
                          onClick={handleAuth}
                          data-testid="mobile-button-logout"
                        >
                          <LogOut className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                          {t('navigation.logout')}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <button
                          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 hover:underline transition-colors focus-visible:focus-visible btn-animate min-h-[44px]"
                          onClick={handleAuth}
                          data-testid="mobile-button-login"
                        >
                          {t('navigation.login')}
                        </button>
                        <Button
                          className="w-full btn-primary focus-visible:focus-visible btn-animate min-h-[44px]"
                          onClick={() => setLocation('/register')}
                          data-testid="mobile-button-register"
                        >
                          {t('navigation.register')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
