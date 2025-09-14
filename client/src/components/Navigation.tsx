import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Settings, LogOut } from "lucide-react";
import logoUrl from "@assets/Logo_1757848498470.png";

export default function Navigation() {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", public: false },
    { href: "/resources", label: "Resources", public: true },
    { href: "/inspiration", label: "Inspiration", public: true },
    { href: "/schools-map", label: "Schools Map", public: true },
    { href: "/search", label: "Search", public: true },
  ];

  // Add admin link if user is admin
  if (user?.isAdmin) {
    navItems.push({ href: "/admin", label: "Admin", public: false });
  }

  const handleNavClick = (href: string) => {
    setLocation(href);
    setIsMobileMenuOpen(false);
  };

  const handleAuth = () => {
    if (isAuthenticated) {
      window.location.href = "/api/logout";
    } else {
      window.location.href = "/api/login";
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50" role="navigation" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => handleNavClick('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:focus-visible"
              data-testid="button-logo"
              aria-label="Plastic Clever Schools - Go to homepage"
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
                        : 'text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
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
            {isAuthenticated ? (
              <>
                <span className="text-gray-700 text-sm" data-testid="text-user-name">
                  {user?.firstName || user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleAuth}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleAuth}
                  data-testid="button-login"
                >
                  Login
                </Button>
                <Button
                  className="bg-coral hover:bg-coral/90 text-white"
                  onClick={() => setLocation('/register')}
                  data-testid="button-register"
                >
                  Register Your School
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
                  aria-label="Open mobile navigation menu"
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
                aria-label="Mobile navigation menu"
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
                <div className="mt-8 space-y-4" aria-label="Mobile menu navigation">
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
                            : 'text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5'
                        }`}
                        data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  
                  {/* Mobile Auth */}
                  <div className="border-t border-gray-200 pt-4 mt-6">
                    {isAuthenticated ? (
                      <>
                        <div className="px-3 py-2 text-sm text-gray-700" data-testid="mobile-text-user-name">
                          {user?.firstName || user?.email}
                        </div>
                        <button
                          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-ocean-blue hover:bg-ocean-blue/5 transition-colors focus-visible:focus-visible btn-animate min-h-[44px]"
                          onClick={handleAuth}
                          data-testid="mobile-button-logout"
                        >
                          <LogOut className="h-4 w-4 mr-2 inline" aria-hidden="true" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <Button
                        className="w-full bg-coral hover:bg-coral/90 text-white focus-visible:focus-visible btn-animate min-h-[44px]"
                        onClick={handleAuth}
                        data-testid="mobile-button-login"
                      >
                        Register Your School Now
                      </Button>
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
