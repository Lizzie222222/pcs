import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/states";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, School, Users, Trophy, Clock, Download } from "lucide-react";
import type { AdminStats, PendingAudit } from "@/lib/admin/types";

interface AdminShellProps {
  initialTab?: string;
  children: (props: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    stats: AdminStats | undefined;
    pendingAuditsCount: number;
  }) => React.ReactNode;
}

export function AdminShell({ initialTab = 'overview', children }: AdminShellProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    console.log('Admin page - access check:', {
      isLoading,
      isAuthenticated,
      user: user ? { id: user.id, email: user.email, role: user.role, isAdmin: user.isAdmin } : null,
      hasAdminAccess: user?.role === 'admin' || user?.isAdmin
    });
    
    if (isLoading) {
      console.log('Admin page: Still loading auth state, waiting...');
      return;
    }
    
    if (isAuthenticated && !user) {
      console.log('Admin page: Authenticated but user object not yet loaded, waiting...');
      return;
    }
    
    if (!isAuthenticated || !(user?.role === 'admin' || user?.isAdmin)) {
      console.log('Admin page: Access denied, redirecting to /');
      toast({
        title: "Access Denied",
        description: "Admin access required",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
    
    console.log('Admin page: Access granted');
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin)),
    retry: false,
  });

  const { data: pendingAudits = [] } = useQuery<PendingAudit[]>({
    queryKey: ['/api/admin/audits/pending'],
    enabled: Boolean(isAuthenticated && (user?.role === 'admin' || user?.isAdmin)),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading admin panel..." />
      </div>
    );
  }

  if (!isAuthenticated || !(user?.role === 'admin' || user?.isAdmin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Stats Cards */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-navy" data-testid="page-title">Admin Panel</h1>
                <p className="text-gray-600 mt-1">Manage schools, evidence, and content</p>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Schools</p>
                      <p className="text-2xl font-bold text-pcs_blue" data-testid="stat-total-schools">
                        {stats.totalSchools}
                      </p>
                    </div>
                    <School className="h-8 w-8 text-pcs_blue" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Evidence</p>
                      <p className="text-2xl font-bold text-amber-600" data-testid="stat-pending-evidence">
                        {stats.pendingEvidence}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-amber-600" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Featured Case Studies</p>
                      <p className="text-2xl font-bold text-pcs_teal" data-testid="stat-featured-case-studies">
                        {stats.featuredCaseStudies}
                      </p>
                    </div>
                    <Trophy className="h-8 w-8 text-pcs_teal" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-purple-600" data-testid="stat-active-users">
                        {stats.activeUsers}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8">
          {/* Dashboard */}
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('overview')}
            data-testid="tab-dashboard"
          >
            Dashboard
          </button>

          {/* Schools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  ['schools', 'teams', 'users'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-schools"
              >
                Schools
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('schools')}
                className={activeTab === 'schools' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-schools"
              >
                Schools
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('teams')}
                className={activeTab === 'teams' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-teams"
              >
                Teams
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('users')}
                className={activeTab === 'users' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-schools-users"
              >
                User Management
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Content Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  ['resources', 'resource-packs', 'case-studies', 'events', 'media-library'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-content"
              >
                Content
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('resources')}
                className={activeTab === 'resources' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-resources"
              >
                Resources
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('resource-packs')}
                className={activeTab === 'resource-packs' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-resource-packs"
              >
                Resource Packs
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('case-studies')}
                className={activeTab === 'case-studies' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-case-studies"
              >
                Case Studies
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('events')}
                className={activeTab === 'events' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-events"
              >
                Events
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('media-library')}
                className={activeTab === 'media-library' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-content-evidence-gallery"
              >
                Evidence Gallery
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Program Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 relative ${
                  ['evidence-requirements', 'reviews', 'printable-forms'].includes(activeTab)
                    ? 'bg-white text-navy shadow-sm' 
                    : 'text-gray-600 hover:text-navy'
                }`}
                data-testid="tab-program"
              >
                Program
                <ChevronDown className="h-4 w-4" />
                {((stats && stats.pendingEvidence > 0) || pendingAudits.length > 0) && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    data-testid="badge-pending-reviews-count"
                  >
                    {(stats?.pendingEvidence || 0) + pendingAudits.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onClick={() => setActiveTab('evidence-requirements')}
                className={activeTab === 'evidence-requirements' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-evidence-requirements"
              >
                Evidence Requirements
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('reviews')}
                className={`${activeTab === 'reviews' ? 'bg-gray-100 font-medium' : ''} relative`}
                data-testid="tab-program-review-queue"
              >
                Review Queue
                {((stats && stats.pendingEvidence > 0) || pendingAudits.length > 0) && (
                  <Badge className="ml-2 bg-red-500 text-white">
                    {(stats?.pendingEvidence || 0) + pendingAudits.length}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setActiveTab('printable-forms')}
                className={activeTab === 'printable-forms' ? 'bg-gray-100 font-medium' : ''}
                data-testid="tab-program-printable-forms"
              >
                Printable Forms
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Communications */}
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'email-test' 
                ? 'bg-white text-navy shadow-sm' 
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveTab('email-test')}
            data-testid="tab-communications"
          >
            Communications
          </button>
        </div>

        {/* Render children with context */}
        {children({
          activeTab,
          setActiveTab,
          stats,
          pendingAuditsCount: pendingAudits.length,
        })}
      </div>
    </div>
  );
}
