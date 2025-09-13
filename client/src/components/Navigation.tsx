import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Settings, LogOut } from "lucide-react";

export default function Navigation() {
  const { isAuthenticated, user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", public: false },
    { href: "/resources", label: "Resources", public: true },
    { href: "/inspiration", label: "Inspiration", public: true },
    { href: "/schools-map", label: "Schools Map", public: true },
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
    <nav className="bg-navy text-white shadow-lg fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => handleNavClick('/')}
              className="text-2xl font-bold text-white hover:text-yellow transition-colors"
              data-testid="button-logo"
            >
              🌱 Plastic Clever Schools
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                if (!item.public && !isAuthenticated) return null;
                
                const isActive = location === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/90 hover:text-yellow hover:bg-white/10'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-white/90 text-sm" data-testid="text-user-name">
                  {user?.firstName || user?.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10 hover:text-white"
                  onClick={handleAuth}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                className="bg-coral hover:bg-coral/90 text-white"
                onClick={handleAuth}
                data-testid="button-login"
              >
                Login
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/10"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-navy text-white border-navy">
                <SheetHeader>
                  <SheetTitle className="text-white">
                    🌱 Plastic Clever Schools
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-8 space-y-4">
                  {navItems.map((item) => {
                    if (!item.public && !isAuthenticated) return null;
                    
                    const isActive = location === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'text-white/90 hover:text-yellow hover:bg-white/10'
                        }`}
                        data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  
                  {/* Mobile Auth */}
                  <div className="border-t border-white/20 pt-4 mt-6">
                    {isAuthenticated ? (
                      <>
                        <div className="px-3 py-2 text-sm text-white/90" data-testid="mobile-text-user-name">
                          {user?.firstName || user?.email}
                        </div>
                        <button
                          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-yellow hover:bg-white/10 transition-colors"
                          onClick={handleAuth}
                          data-testid="mobile-button-logout"
                        >
                          <LogOut className="h-4 w-4 mr-2 inline" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <Button
                        className="w-full bg-coral hover:bg-coral/90 text-white"
                        onClick={handleAuth}
                        data-testid="mobile-button-login"
                      >
                        Login
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
