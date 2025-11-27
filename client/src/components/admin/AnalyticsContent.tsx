import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { 
  School, 
  Clock, 
  Users, 
  Trophy,
  XCircle,
  Download,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Globe,
  FileText,
  Award,
  Target,
  TrendingDown,
  Droplets,
  Fish,
  Heart,
  Leaf,
  Factory,
  Trash,
  UserCheck,
  UserMinus
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Analytics interfaces
interface AnalyticsOverview {
  totalSchools: number;
  totalUsers: number;
  totalEvidence: number;
  completedAwards: number;
  schoolsCompleted: number;
  pendingEvidence: number;
  averageProgress: number;
  studentsImpacted: number;
  countriesReached: number;
  interactedUsers?: number;
  notInteractedUsers?: number;
  interactionRate?: number;
  totalResourceDownloads?: number;
  activeSchoolsLastMonth?: number;
}

interface SchoolProgressAnalytics {
  stageDistribution: Array<{ stage: string; count: number }>;
  progressRanges: Array<{ range: string; count: number }>;
  completionRates: Array<{ metric: string; rate: number }>;
  monthlyRegistrations: Array<{ month: string; count: number }>;
  schoolsByCountry: Array<{ country: string; count: number; students: number }>;
}

interface EvidenceAnalytics {
  submissionTrends: Array<{ month: string; submissions: number; approvals: number; rejections: number }>;
  stageBreakdown: Array<{ stage: string; total: number; approved: number; pending: number; rejected: number }>;
  reviewTurnaround: Array<{ range: string; count: number }>;
  topSubmitters: Array<{ schoolName: string; submissions: number; approvalRate: number }>;
}

interface UserEngagementAnalytics {
  registrationTrends: Array<{ month: string; teachers: number; admins: number }>;
  roleDistribution: Array<{ role: string; count: number }>;
  activeUsers: Array<{ period: string; active: number }>;
  schoolEngagement: Array<{ schoolName: string; users: number; evidence: number; lastActivity: Date }>;
}

interface AuditOverviewAnalytics {
  totalSchoolsAudited: number;
  totalPlasticItems: number;
  averageItemsPerSchool: number;
  topProblemPlastics: Array<{ name: string; count: number }>;
}

interface AuditBySchoolAnalytics {
  schoolId: string;
  schoolName: string;
  country: string;
  totalPlasticItems: number;
  topProblemPlastic: string | null;
  auditDate: string;
  hasRecycling: boolean;
  hasComposting: boolean;
  hasPolicy: boolean;
}

interface WasteTrendsAnalytics {
  monthlySubmissions: Array<{ month: string; count: number }>;
  plasticItemsTrend: Array<{ month: string; totalItems: number }>;
  wasteReductionSchools: Array<{ month: string; count: number }>;
}

interface AdminPromiseMetrics {
  totalPromises: number;
  totalSchoolsWithPromises: number;
  totalAnnualReduction: number;
  totalAnnualWeightKg: number;
  funMetrics: {
    oceanPlasticBottles: number;
    fishSaved: number;
    seaTurtles: number;
    dolphins: number;
    plasticBags: number;
  };
  seriousMetrics: {
    co2Prevented: number;
    oilSaved: number;
    tons: number;
  };
}

interface SchoolActivityAging {
  ranges: Array<{
    range: string;
    count: number;
    schools: Array<{
      id: string;
      name: string;
      country: string;
      lastActiveAt: Date | null;
      currentStage: string;
      progressPercentage: number;
      lastActiveByName: string | null;
      lastActiveByRole: string | null;
      lastActiveByEmail: string | null;
      lastActionType: string | null;
    }>;
  }>;
}

interface ReferralSourceAnalytics {
  distribution: Array<{ source: string; count: number; percentage: number }>;
  totalResponses: number;
  noResponseCount: number;
}

interface ResourceAnalytics {
  downloadTrends: Array<{ month: string; downloads: number }>;
  popularResources: Array<{ title: string; downloads: number; stage: string }>;
  resourcesByStage: Array<{ stage: string; count: number; totalDownloads: number }>;
  resourcesByCountry: Array<{ country: string; resources: number; downloads: number }>;
}

// Color palette for charts
const ANALYTICS_COLORS = ['#0B3D5D', '#019ADE', '#02BBB4', '#FFC557', '#FF595A', '#6B7280', '#10B981', '#8B5CF6'];

const formatReferralSource = (source: string): string => {
  const sourceLabels: Record<string, string> = {
    'google_search': 'Google Search',
    'social_media': 'Social Media',
    'colleague': 'Colleague',
    'conference': 'Conference/Event',
    'email': 'Email',
    'website': 'Website',
    'other': 'Other',
  };
  return sourceLabels[source] || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

interface AnalyticsContentProps {
  activeTab: string;
}

export default function AnalyticsContent({ activeTab }: AnalyticsContentProps) {
  const { toast } = useToast();
  
  // Date range state - default to Last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }));

  // Analytics queries - only load when this component is mounted (overview tab is active)
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }],
    enabled: activeTab === 'overview'
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }],
    enabled: activeTab === 'overview'
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }],
    enabled: activeTab === 'overview'
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }],
    enabled: activeTab === 'overview'
  });

  const auditOverviewQuery = useQuery<AuditOverviewAnalytics>({
    queryKey: ['/api/admin/analytics/audit-overview'],
    enabled: activeTab === 'overview'
  });

  const auditBySchoolQuery = useQuery<AuditBySchoolAnalytics[]>({
    queryKey: ['/api/admin/analytics/audit-by-school'],
    enabled: activeTab === 'overview'
  });

  const wasteTrendsQuery = useQuery<WasteTrendsAnalytics>({
    queryKey: ['/api/admin/analytics/waste-trends'],
    enabled: activeTab === 'overview'
  });

  const adminPromiseMetricsQuery = useQuery<AdminPromiseMetrics>({
    queryKey: ['/api/admin/reduction-promises/metrics'],
    enabled: activeTab === 'overview'
  });

  const schoolActivityAgingQuery = useQuery<SchoolActivityAging>({
    queryKey: ['/api/admin/analytics/school-activity-aging'],
    enabled: activeTab === 'overview' // Loads when overview tab is active, displayed in schools-evidence tab
  });

  const referralSourceQuery = useQuery<ReferralSourceAnalytics>({
    queryKey: ['/api/admin/analytics/referral-sources'],
  });

  const resourceAnalyticsQuery = useQuery<ResourceAnalytics>({
    queryKey: ['/api/admin/analytics/resources'],
  });

  const [analyticsSubTab, setAnalyticsSubTab] = useState("overview");
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedActivityRange, setSelectedActivityRange] = useState<{ range: string; count: number; schools: Array<{ id: string; name: string; country: string; lastActiveAt: Date | null; currentStage: string; progressPercentage: number; lastActiveByName: string | null; lastActiveByRole: string | null; lastActiveByEmail: string | null; lastActionType: string | null }> } | null>(null);
  const [includeAIInsights, setIncludeAIInsights] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Section selections for PDF export
  const [selectedSections, setSelectedSections] = useState({
    overview: true,
    scoresEvidence: true,
    plasticWasteAudits: true,
    userEngagement: true,
    aiInsights: true,
  });

  const exportAnalytics = async (format: 'csv' | 'excel') => {
    try {
      const response = await fetch(`/api/admin/export/analytics?format=${format}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleActivityBarClick = (data: any) => {
    if (!schoolActivityAgingQuery.data) return;
    const rangeData = schoolActivityAgingQuery.data.ranges.find(r => r.range === data.range);
    if (rangeData) {
      setSelectedActivityRange(rangeData);
      setActivityDialogOpen(true);
    }
  };

  const exportActivityRangeCSV = () => {
    if (!selectedActivityRange) return;
    
    const headers = ['School Name', 'Country', 'Last Active', 'Current Stage', 'Progress %', 'Last Active By Name', 'User Role', 'User Email', 'Action Type'];
    const rows = selectedActivityRange.schools.map(school => [
      school.name,
      school.country,
      school.lastActiveAt ? new Date(school.lastActiveAt).toLocaleDateString() : 'Never',
      school.currentStage,
      `${school.progressPercentage}%`,
      school.lastActiveByName || 'N/A',
      school.lastActiveByRole || 'N/A',
      school.lastActiveByEmail || 'N/A',
      school.lastActionType || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schools_${selectedActivityRange.range.replace(/ /g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPDFMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error('Please select a date range');
      }

      const response = await apiRequest('POST', '/api/admin/analytics/export-pdf', {
        dateRange: {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString()
        },
        sections: selectedSections
      });

      const blob = await response.blob();
      return blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${Date.now()}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);

      setShowExportDialog(false);

      toast({
        title: "Report downloaded successfully",
        description: "Your PDF analytics report has been downloaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export PDF report",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4 sm:space-y-6" data-refactor-source="AnalyticsContent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-navy">Analytics Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Comprehensive insights and metrics for Plastic Clever Schools</p>
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => exportAnalytics('csv')}
            data-testid="button-export-csv"
            className="min-h-11 text-xs sm:text-sm px-3 sm:px-4"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportAnalytics('excel')}
            data-testid="button-export-excel"
            className="min-h-11 text-xs sm:text-sm px-3 sm:px-4"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* Date Range Picker and PDF Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button
                  disabled={!dateRange?.from || !dateRange?.to}
                  data-testid="button-export-pdf"
                  className="bg-pcs_blue hover:bg-pcs_navy min-h-11 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4"
                >
                  <Download className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export PDF Report</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-export-pdf">
                <DialogHeader>
                  <DialogTitle>Export PDF Report</DialogTitle>
                  <DialogDescription>
                    Select which sections to include in your analytics report. The report will include data from{' '}
                    {dateRange?.from && dateRange?.to && (
                      <span className="font-medium text-gray-900">
                        {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="section-overview"
                      checked={selectedSections.overview}
                      onCheckedChange={(checked) => 
                        setSelectedSections({ ...selectedSections, overview: checked as boolean })
                      }
                      data-testid="checkbox-section-overview"
                    />
                    <label
                      htmlFor="section-overview"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Overview
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="section-scores-evidence"
                      checked={selectedSections.scoresEvidence}
                      onCheckedChange={(checked) => 
                        setSelectedSections({ ...selectedSections, scoresEvidence: checked as boolean })
                      }
                      data-testid="checkbox-section-scores-evidence"
                    />
                    <label
                      htmlFor="section-scores-evidence"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Schools & Evidence
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="section-plastic-waste"
                      checked={selectedSections.plasticWasteAudits}
                      onCheckedChange={(checked) => 
                        setSelectedSections({ ...selectedSections, plasticWasteAudits: checked as boolean })
                      }
                      data-testid="checkbox-section-plastic-waste"
                    />
                    <label
                      htmlFor="section-plastic-waste"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Plastic Waste Audits
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="section-user-engagement"
                      checked={selectedSections.userEngagement}
                      onCheckedChange={(checked) => 
                        setSelectedSections({ ...selectedSections, userEngagement: checked as boolean })
                      }
                      data-testid="checkbox-section-user-engagement"
                    />
                    <label
                      htmlFor="section-user-engagement"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      User Engagement
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="section-ai-insights"
                      checked={selectedSections.aiInsights}
                      onCheckedChange={(checked) => 
                        setSelectedSections({ ...selectedSections, aiInsights: checked as boolean })
                      }
                      data-testid="checkbox-section-ai-insights"
                    />
                    <label
                      htmlFor="section-ai-insights"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include AI Insights
                    </label>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExportDialog(false)}
                    data-testid="button-cancel-export"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => exportPDFMutation.mutate()}
                    disabled={exportPDFMutation.isPending}
                    data-testid="button-confirm-export"
                    className="bg-pcs_blue hover:bg-pcs_navy"
                  >
                    {exportPDFMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Nested Tabs for Analytics Sections */}
      <Tabs value={analyticsSubTab} onValueChange={setAnalyticsSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="analytics-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schools-evidence" data-testid="tab-schools-evidence">
            <School className="w-4 h-4 mr-2" />
            Schools & Evidence
          </TabsTrigger>
          <TabsTrigger value="audits" data-testid="tab-audits">
            <PieChartIcon className="w-4 h-4 mr-2" />
            Plastic Waste Audits
          </TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement">
            <Users className="w-4 h-4 mr-2" />
            User Engagement
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
          {/* Overview Cards */}
          {overviewQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : overviewQuery.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card 
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={() => setAnalyticsSubTab("schools-evidence")}
                data-testid="card-total-schools"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                  <School className="h-4 w-4 text-pcs_blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-schools">
                    {overviewQuery.data.totalSchools.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Click to view details →</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={() => setAnalyticsSubTab("engagement")}
                data-testid="card-active-users"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-pcs_teal" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-users">
                    {overviewQuery.data.totalUsers.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Click to view details →</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={() => setAnalyticsSubTab("schools-evidence")}
                data-testid="card-evidence-submissions"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Evidence Submissions</CardTitle>
                  <FileText className="h-4 w-4 text-pcs_yellow" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-evidence">
                    {overviewQuery.data.totalEvidence.toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Click to view details →</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
                onClick={() => setAnalyticsSubTab("schools-evidence")}
                data-testid="card-global-reach"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Global Reach</CardTitle>
                  <Globe className="h-4 w-4 text-pcs_coral" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-countries-reached">
                    {overviewQuery.data.countriesReached.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Click to view details →</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Key Metrics Summary */}
          {overviewQuery.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <School className="h-4 w-4 text-pcs_blue" />
                      Total Schools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pcs_blue">{overviewQuery.data.totalSchools}</div>
                    <p className="text-xs text-gray-500 mt-1">Participating schools</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-pcs_teal" />
                      Total Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pcs_teal">{overviewQuery.data.totalEvidence}</div>
                    <p className="text-xs text-gray-500 mt-1">Submissions received</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-pcs_teal" />
                      Awards Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pcs_teal" data-testid="metric-awards-completed">{overviewQuery.data.completedAwards.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Total rounds completed across all schools</p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-pcs_yellow"
                  onClick={() => {
                    window.location.href = '/api/admin/analytics/schools-completed/csv';
                  }}
                  data-testid="card-schools-completed"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-pcs_yellow" />
                      Schools Completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pcs_yellow" data-testid="metric-schools-completed">{overviewQuery.data.schoolsCompleted.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Schools with at least one award - Click to download CSV</p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-green-500"
                  onClick={() => {
                    window.location.href = '/api/admin/analytics/active-schools/csv';
                  }}
                  data-testid="card-active-schools"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Active Schools (Last Month)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="metric-active-schools">{(overviewQuery.data.activeSchoolsLastMonth || 0).toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Schools with activity in past 30 days - Click to download CSV</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pcs_blue" />
                      Students Impacted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pcs_blue">{overviewQuery.data.studentsImpacted.toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Lives changed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600 font-medium flex items-center gap-2">
                      <Download className="h-4 w-4 text-pcs_coral" />
                      Resource Downloads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-pcs_coral" data-testid="metric-resource-downloads">{(overviewQuery.data.totalResourceDownloads || 0).toLocaleString()}</div>
                    <p className="text-xs text-gray-500 mt-1">Total resources downloaded</p>
                  </CardContent>
                </Card>
              </div>

              {/* User Interaction Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-pcs_blue" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="metric-total-registered-users">
                      {overviewQuery.data.totalUsers.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Registered users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Interacted Users</CardTitle>
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="metric-interacted-users">
                      {(overviewQuery.data.interactedUsers || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {overviewQuery.data.interactionRate || 0}% interaction rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Not Interacted</CardTitle>
                    <UserMinus className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600" data-testid="metric-not-interacted-users">
                      {(overviewQuery.data.notInteractedUsers || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {overviewQuery.data.totalUsers > 0 
                        ? Math.round(((overviewQuery.data.notInteractedUsers || 0) / overviewQuery.data.totalUsers) * 100)
                        : 0}% not yet active
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Referral Source Summary */}
              {referralSourceQuery.data && referralSourceQuery.data.distribution.length > 0 && (
                <Card 
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]"
                  onClick={() => setAnalyticsSubTab("engagement")}
                  data-testid="card-referral-sources-overview"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-pcs_blue" />
                        How Did You Hear About Us?
                      </div>
                      <Badge variant="secondary">{referralSourceQuery.data.totalResponses} responses</Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-500">Click for detailed breakdown →</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {referralSourceQuery.data.distribution.slice(0, 7).map((item, index) => (
                        <div 
                          key={item.source}
                          className="text-center p-3 bg-gray-50 rounded-lg"
                          data-testid={`overview-referral-${item.source}`}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mx-auto mb-2" 
                            style={{ backgroundColor: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length] }}
                          />
                          <div className="text-lg font-bold">{item.percentage}%</div>
                          <div className="text-xs text-gray-600 truncate">{formatReferralSource(item.source)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Most Downloaded Resources */}
              <Card data-testid="card-most-downloaded-resources">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Download className="w-5 h-5 mr-2 text-pcs_coral" />
                      Most Downloaded Resources
                    </div>
                    <Badge variant="secondary">Top 10</Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-500">Resources with the highest download counts</p>
                </CardHeader>
                <CardContent>
                  {resourceAnalyticsQuery.isLoading ? (
                    <div className="space-y-3" data-testid="loading-resources">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full" />
                            <div>
                              <div className="h-4 bg-gray-200 rounded w-40 mb-1" />
                              <div className="h-3 bg-gray-200 rounded w-20" />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="h-5 bg-gray-200 rounded w-12 mb-1" />
                            <div className="h-3 bg-gray-200 rounded w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : resourceAnalyticsQuery.data && resourceAnalyticsQuery.data.popularResources.length > 0 ? (
                    <div className="space-y-3" data-testid="resources-list">
                      {resourceAnalyticsQuery.data.popularResources.map((resource, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          data-testid={`resource-rank-${index + 1}`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: index < 3 ? ANALYTICS_COLORS[index] : '#6B7280' }}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900" data-testid={`resource-title-${index + 1}`}>{resource.title}</div>
                              <div className="text-xs text-gray-500 capitalize" data-testid={`resource-stage-${index + 1}`}>{resource.stage || 'All Stages'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-pcs_coral" data-testid={`resource-downloads-${index + 1}`}>{resource.downloads.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">downloads</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500" data-testid="no-resources">
                      <Download className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No resource downloads yet</p>
                      <p className="text-sm">Downloads will appear here once resources are accessed</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Schools & Evidence Tab */}
        <TabsContent value="schools-evidence" className="space-y-6" data-testid="content-schools-evidence">
          {/* School Analytics */}
          {schoolProgressQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Schools by Stage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="w-5 h-5 mr-2 text-pcs_blue" />
                    Schools by Stage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={schoolProgressQuery.data.stageDistribution}
                        dataKey="count"
                        nameKey="stage"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.stage}: ${entry.count}`}
                      >
                        {schoolProgressQuery.data.stageDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly School Registrations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-pcs_teal" />
                    Monthly School Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={schoolProgressQuery.data.monthlyRegistrations}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#019ADE" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Progress Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>School Progress Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={schoolProgressQuery.data.progressRanges}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#019ADE" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Completion Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Completion Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={schoolProgressQuery.data.completionRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#02BBB4" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* School Activity Aging */}
          {schoolActivityAgingQuery.data && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-pcs_blue" />
                  School Activity Aging
                </CardTitle>
                <p className="text-sm text-gray-500 mt-2">Click on a bar to view schools in that date range</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={schoolActivityAgingQuery.data.ranges}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      fill="#02BBB4"
                      onClick={handleActivityBarClick}
                      cursor="pointer"
                      data-testid="bar-school-activity-aging"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Evidence Analytics */}
          {evidenceQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evidence by Stage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-pcs_blue" />
                    Evidence by Stage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={evidenceQuery.data.stageBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" fill="#10B981" name="Approved" />
                      <Bar dataKey="pending" fill="#FFC557" name="Pending" />
                      <Bar dataKey="rejected" fill="#FF595A" name="Rejected" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Review Turnaround Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Review Turnaround Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {evidenceQuery.data.reviewTurnaround.length === 0 ? (
                    <div 
                      className="flex flex-col items-center justify-center h-[250px] text-center"
                      data-testid="review-turnaround-insufficient-data"
                    >
                      <Clock className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Insufficient Data</p>
                      <p className="text-sm text-gray-400 mt-1">
                        At least 5 reviewed evidence items are required to display turnaround metrics
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={evidenceQuery.data.reviewTurnaround}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {evidenceQuery.data.reviewTurnaround.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Submission Trends */}
              {evidenceQuery.data.submissionTrends && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Evidence Submission Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={evidenceQuery.data.submissionTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="submissions" stroke="#0B3D5D" strokeWidth={2} name="Submissions" />
                        <Line type="monotone" dataKey="approvals" stroke="#10B981" strokeWidth={2} name="Approvals" />
                        <Line type="monotone" dataKey="rejections" stroke="#FF595A" strokeWidth={2} name="Rejections" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Top Performing Schools Table */}
          {evidenceQuery.data && evidenceQuery.data.topSubmitters && evidenceQuery.data.topSubmitters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-gold" />
                  Top Performing Schools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">School Name</th>
                        <th className="text-center py-3 px-4">Submissions</th>
                        <th className="text-center py-3 px-4">Approval Rate</th>
                        <th className="text-center py-3 px-4">Performance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceQuery.data.topSubmitters.slice(0, 5).map((school: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{school.schoolName}</td>
                          <td className="text-center py-3 px-4">{school.submissions}</td>
                          <td className="text-center py-3 px-4">{school.approvalRate}%</td>
                          <td className="text-center py-3 px-4">
                            <Badge 
                              className={
                                school.approvalRate >= 80 ? 'bg-green-500' :
                                school.approvalRate >= 60 ? 'bg-yellow-500' :
                                'bg-orange-500'
                              }
                            >
                              {school.approvalRate >= 80 ? 'Excellent' :
                               school.approvalRate >= 60 ? 'Good' :
                               'Needs Improvement'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plastic Waste Audits Tab */}
        <TabsContent value="audits" className="space-y-6" data-testid="content-audits">
          {/* Audit Overview */}
          {auditOverviewQuery.data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Schools Audited</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-pcs_blue" data-testid="metric-schools-audited">
                    {auditOverviewQuery.data.totalSchoolsAudited}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total audits completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Plastic Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-pcs_blue" data-testid="metric-total-plastic-items">
                    {auditOverviewQuery.data.totalPlasticItems.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Items identified</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average Items per School</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-pcs_blue" data-testid="metric-avg-items-per-school">
                    {auditOverviewQuery.data.averageItemsPerSchool.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Per audit average</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Problem Plastics */}
          {auditOverviewQuery.data && auditOverviewQuery.data.topProblemPlastics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trash className="w-5 h-5 mr-2 text-pcs_coral" />
                  Top Problem Plastics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={auditOverviewQuery.data.topProblemPlastics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#FF595A" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Audits by School */}
          {auditBySchoolQuery.data && auditBySchoolQuery.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <School className="w-5 h-5 mr-2 text-pcs_blue" />
                  Audits by School
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">School Name</th>
                        <th className="text-left py-2 px-3">Country</th>
                        <th className="text-center py-2 px-3">Items Found</th>
                        <th className="text-left py-2 px-3">Top Problem</th>
                        <th className="text-center py-2 px-3">Audit Date</th>
                        <th className="text-center py-2 px-3">Waste Mgmt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditBySchoolQuery.data.map((school) => (
                        <tr key={school.schoolId} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{school.schoolName}</td>
                          <td className="py-2 px-3">{school.country}</td>
                          <td className="text-center py-2 px-3">{school.totalPlasticItems}</td>
                          <td className="py-2 px-3">{school.topProblemPlastic || 'N/A'}</td>
                          <td className="text-center py-2 px-3">{format(new Date(school.auditDate), 'dd/MM/yyyy')}</td>
                          <td className="text-center py-2 px-3">
                            <div className="flex justify-center gap-1">
                              {school.hasRecycling && (
                                <Badge className="bg-green-500 text-white text-xs">R</Badge>
                              )}
                              {school.hasComposting && (
                                <Badge className="bg-blue-500 text-white text-xs">C</Badge>
                              )}
                              {school.hasPolicy && (
                                <Badge className="bg-purple-500 text-white text-xs">P</Badge>
                              )}
                              {!school.hasRecycling && !school.hasComposting && !school.hasPolicy && (
                                <span className="text-gray-400 text-xs">None</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Waste Management: R = Recycling, C = Composting, P = Policy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reduction Promises Impact Section */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-pcs_teal" />
              <h3 className="text-xl font-bold text-navy">Global Action Plan Impact</h3>
            </div>
            <p className="text-gray-600 mb-6">Track the collective impact of all schools' action plans</p>

            {adminPromiseMetricsQuery.isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pcs_blue mr-3"></div>
                <span className="text-gray-600">Loading reduction metrics...</span>
              </div>
            )}

            {adminPromiseMetricsQuery.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-800 font-medium">Failed to load action plan metrics</p>
                <p className="text-red-600 text-sm mt-1">Please try refreshing the page</p>
              </div>
            )}

            {adminPromiseMetricsQuery.data && (
              <>
                {adminPromiseMetricsQuery.data.totalPromises === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium text-lg">No action plans have been created yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Encourage schools to create their first action plan!</p>
                  </div>
                ) : (
                  <>
                    {/* Overview Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Total Action Items</CardTitle>
                      <Target className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-total-promises">
                        {(adminPromiseMetricsQuery.data.totalPromises || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Commitments made</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Schools Participating</CardTitle>
                      <School className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-schools-participating">
                        {(adminPromiseMetricsQuery.data.totalSchoolsWithPromises || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Making a difference</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Items Reduced Annually</CardTitle>
                      <TrendingDown className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-items-reduced">
                        {(adminPromiseMetricsQuery.data.totalAnnualReduction || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Items per year</p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-pcs_blue">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">Weight Reduced</CardTitle>
                      <Trophy className="h-5 w-5 text-pcs_blue" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="admin-metric-weight-reduced">
                        {(adminPromiseMetricsQuery.data.totalAnnualWeightKg || 0).toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">kg per year</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Ocean Impact Row */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-navy mb-3 flex items-center">
                    <Droplets className="w-5 h-5 mr-2 text-pcs_teal" />
                    Ocean Impact
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-l-4 border-l-pcs_teal bg-gradient-to-br from-white to-teal-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Ocean Bottles Prevented</CardTitle>
                        <Droplets className="h-5 w-5 text-pcs_teal" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pcs_teal" data-testid="admin-metric-ocean-bottles">
                          {((adminPromiseMetricsQuery.data.funMetrics?.oceanPlasticBottles || 0).toFixed(0)).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Plastic bottles saved from oceans</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-pcs_teal bg-gradient-to-br from-white to-teal-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Fish Saved</CardTitle>
                        <Fish className="h-5 w-5 text-pcs_teal" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pcs_teal" data-testid="admin-metric-fish-saved">
                          {((adminPromiseMetricsQuery.data.funMetrics?.fishSaved || 0).toFixed(0)).toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Potential fish saved from plastic</p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-pcs_teal bg-gradient-to-br from-white to-teal-50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Sea Turtles Saved</CardTitle>
                        <Heart className="h-5 w-5 text-pcs_teal" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-pcs_teal" data-testid="admin-metric-sea-turtles">
                          {(adminPromiseMetricsQuery.data.funMetrics?.seaTurtles || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Sea turtle equivalents protected</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                    {/* Environmental Impact Row */}
                    <div>
                      <h4 className="text-lg font-semibold text-navy mb-3 flex items-center">
                        <Leaf className="w-5 h-5 mr-2 text-green-600" />
                        Environmental Impact
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-white to-green-50">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">CO₂ Prevented</CardTitle>
                            <Factory className="h-5 w-5 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600" data-testid="admin-metric-co2-prevented">
                              {((adminPromiseMetricsQuery.data.seriousMetrics?.co2Prevented || 0).toFixed(2)).toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">kg of CO₂ emissions prevented</p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-white to-green-50">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Oil Saved</CardTitle>
                            <Droplets className="h-5 w-5 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600" data-testid="admin-metric-oil-saved">
                              {((adminPromiseMetricsQuery.data.seriousMetrics?.oilSaved || 0).toFixed(2)).toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">liters of oil conserved</p>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-600 bg-gradient-to-br from-white to-green-50">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-700">Waste Prevented</CardTitle>
                            <Trash className="h-5 w-5 text-green-600" />
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600" data-testid="admin-metric-waste-prevented">
                              {(adminPromiseMetricsQuery.data.seriousMetrics?.tons || 0).toFixed(4)}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">tons of plastic waste avoided</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6" data-testid="content-engagement">
          {userEngagementQuery.data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Registration Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-pcs_blue" />
                    User Registration Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={userEngagementQuery.data.registrationTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="teachers" stroke="#019ADE" strokeWidth={2} name="Teachers" />
                      <Line type="monotone" dataKey="admins" stroke="#02BBB4" strokeWidth={2} name="Admins" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Role Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>User Role Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={userEngagementQuery.data.roleDistribution}
                        dataKey="count"
                        nameKey="role"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.role}: ${entry.count}`}
                      >
                        {userEngagementQuery.data.roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Referral Sources - How Did You Hear About Us */}
          {referralSourceQuery.data && (
            <Card data-testid="card-referral-sources">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-pcs_blue" />
                  How Did You Hear About Us?
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Breakdown of referral sources from registration ({referralSourceQuery.data.totalResponses} responses)
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={referralSourceQuery.data.distribution}
                          dataKey="count"
                          nameKey="source"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry) => `${entry.percentage}%`}
                        >
                          {referralSourceQuery.data.distribution.map((entry, index) => (
                            <Cell key={`referral-cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value} (${referralSourceQuery.data?.distribution.find(d => d.source === name)?.percentage || 0}%)`,
                            formatReferralSource(name)
                          ]}
                        />
                        <Legend formatter={(value) => formatReferralSource(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Detailed Breakdown Table */}
                  <div>
                    <div className="space-y-3">
                      {referralSourceQuery.data.distribution.map((item, index) => (
                        <div 
                          key={item.source} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          data-testid={`referral-item-${item.source}`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length] }}
                            />
                            <span className="font-medium">{formatReferralSource(item.source)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg">{item.count}</span>
                            <span className="text-gray-500 ml-2">({item.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                      {referralSourceQuery.data.noResponseCount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg text-gray-500">
                          <span>No response provided</span>
                          <span>{referralSourceQuery.data.noResponseCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Activity Aging Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Schools - {selectedActivityRange?.range}</DialogTitle>
            <DialogDescription>
              {selectedActivityRange?.count} school(s) in this activity range
            </DialogDescription>
          </DialogHeader>
          
          {selectedActivityRange && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={exportActivityRangeCSV} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active By</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Role</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedActivityRange.schools.map((school, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{school.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{school.country}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {school.lastActiveAt ? new Date(school.lastActiveAt).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{school.currentStage}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{school.progressPercentage}%</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{school.lastActiveByName || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 capitalize">{school.lastActiveByRole || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{school.lastActiveByEmail || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{school.lastActionType || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
