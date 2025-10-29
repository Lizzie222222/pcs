import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, LogOut, User, Settings, Bell } from "lucide-react";
import logoUrl from "@assets/Logo_1757848498470.png";
import { LanguageSwitcher } from "./LanguageSwitcher";
import Avatar from "./Avatar";
import { NotificationDropdown } from "./NotificationDropdown";

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

  // Check for active banner to adjust navigation position
  const { data: activeBanner } = useQuery<any>({
    queryKey: ['/api/banners/active'],
  });

  // Get unread notification count
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  const unreadCount = unreadCountData?.count || 0;

  // Check if user is a head teacher
  const isHeadTeacher = dashboardData?.schoolUser?.role === 'head_teacher';

  // Create stable key mapping for test IDs based on href values
  const getStableKey = (href: string) => {
    const keyMap: Record<string, string> = {
      '/': 'home',
      '/dashboard': 'dashboard',
      '/resources': 'resources',
      '/inspiration': 'inspiration',
      '/help-center': 'help-center',
      '/contact': 'contact',
      '/schools-map': 'schools-map',
      '/search': 'search',
      '/dashboard/team-management': 'team-management',
      '/admin': 'admin'
    };
    return keyMap[href] || href.slice(1).replace(/\//g, '-');
  };

  const navItems = [
    { href: "/", label: t('navigation.home'), public: true },
    { href: "/resources", label: t('navigation.resources'), public: true },
    { href: "/inspiration", label: t('navigation.inspiration'), public: true },
    { href: "/schools-map", label: t('navigation.schools_map'), public: true },
    { href: "/search", label: t('navigation.search'), public: true },
    { href: "/help-center", label: t('navigation.help_center'), public: true },
  ];

  // Add dashboard link if user is authenticated
  if (isAuthenticated) {
    navItems.splice(1, 0, { href: "/dashboard", label: "Dashboard", public: false });
  }

  // Add team management link if user is head teacher
  if (isHeadTeacher) {
    navItems.splice(2, 0, { href: "/dashboard/team-management", label: "Team Management", public: false });
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

  const isAdminPage = location === '/admin';
  
  return (
    <nav 
      className={`shadow-sm border-b fixed left-0 right-0 z-50 transition-all duration-300 ${
        isAdminPage 
          ? 'bg-pcs_blue/5 border-pcs_blue/20' 
          : 'bg-white border-gray-200'
      }`} 
      style={{
        top: activeBanner ? '80px' : '0'
      }}
      role="navigation" 
      aria-label={t('navigation.main_navigation')}
    >
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
          <div className="hidden md:block flex-1">
            <div className="ml-4 flex items-baseline space-x-1 lg:space-x-2">
              {navItems.map((item) => {
                if (!item.public && !isAuthenticated) return null;
                
                const isActive = location === item.href;
                const isLowPriority = item.href === '/schools-map' || item.href === '/search';
                const responsiveClasses = isLowPriority ? 'hidden md:hidden lg:inline-block' : '';
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors focus-visible:focus-visible btn-animate relative overflow-hidden whitespace-nowrap ${responsiveClasses} ${
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
          <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <NotificationDropdown unreadCount={unreadCount} />
                {user?.isAdmin ? (
                  <Link 
                    href="/admin"
                    data-testid="badge-role-admin"
                  >
                    <Badge className="bg-pcs_blue text-white hover:bg-pcs_blue/90 cursor-pointer transition-colors text-xs">
                      Admin
                    </Badge>
                  </Link>
                ) : (
                  <>
                    <Badge className="bg-teal text-white text-xs px-2 py-0.5" data-testid="badge-role-teacher">
                      Teacher
                    </Badge>
                    {dashboardData?.school?.name && (
                      <Badge variant="outline" className="border-teal text-teal text-xs px-2 py-0.5" data-testid="badge-school-name">
                        {dashboardData.school.name}
                      </Badge>
                    )}
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="flex items-center gap-1.5 hover:bg-gray-100 rounded-md px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcs_blue"
                      data-testid="button-user-menu"
                      aria-label={t('navigation.user_menu')}
                    >
                      <Avatar 
                        seed={user?.email || ''} 
                        size={28}
                        dataTestId="img-avatar-desktop"
                        alt={`${user?.firstName || user?.email}'s avatar`}
                      />
                      <span className="text-gray-700 text-sm" data-testid="text-user-name">
                        {user?.firstName || user?.email}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" data-testid="menu-user-dropdown">
                    <DropdownMenuLabel data-testid="label-user-menu">
                      {t('navigation.my_account')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setLocation('/profile')}
                      data-testid="menu-item-profile"
                      className="cursor-pointer"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('navigation.profile')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLocation('/profile')}
                      data-testid="menu-item-settings"
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('navigation.settings')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleAuth}
                      data-testid="menu-item-logout"
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('navigation.logout')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                        <div className="flex gap-2 px-3 py-2">
                          {user?.isAdmin ? (
                            <Link 
                              href="/admin"
                              onClick={() => setIsMobileMenuOpen(false)}
                              data-testid="mobile-badge-role-admin"
                            >
                              <Badge className="bg-pcs_blue text-white hover:bg-pcs_blue/90 cursor-pointer transition-colors">
                                Admin
                              </Badge>
                            </Link>
                          ) : (
                            <>
                              <Badge className="bg-teal text-white" data-testid="mobile-badge-role-teacher">
                                Teacher
                              </Badge>
                              {dashboardData?.school?.name && (
                                <Badge variant="outline" className="border-teal text-teal" data-testid="mobile-badge-school-name">
                                  {dashboardData.school.name}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <button
                          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 hover:underline transition-colors focus-visible:focus-visible btn-animate min-h-[44px]"
                          onClick={() => {
                            setLocation('/profile');
                            setIsMobileMenuOpen(false);
                          }}
                          data-testid="mobile-button-profile"
                        >
                          <User className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                          {t('navigation.profile')}
                        </button>
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
