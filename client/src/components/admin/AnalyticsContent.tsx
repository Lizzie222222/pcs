import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { subDays } from "date-fns";
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
  Trash
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
  pendingEvidence: number;
  averageProgress: number;
  studentsImpacted: number;
  countriesReached: number;
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
  };
  seriousMetrics: {
    co2Prevented: number;
    oilSaved: number;
    tons: number;
  };
}

// Color palette for charts
const ANALYTICS_COLORS = ['#0B3D5D', '#019ADE', '#02BBB4', '#FFC557', '#FF595A', '#6B7280', '#10B981', '#8B5CF6'];

export default function AnalyticsContent() {
  const { toast } = useToast();
  
  // Date range state - default to Last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 30),
    to: new Date(),
  }));

  // Analytics queries - all enabled
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement', { 
      startDate: dateRange?.from?.toISOString(), 
      endDate: dateRange?.to?.toISOString() 
    }]
  });

  const auditOverviewQuery = useQuery<AuditOverviewAnalytics>({
    queryKey: ['/api/admin/analytics/audit-overview']
  });

  const auditBySchoolQuery = useQuery<AuditBySchoolAnalytics[]>({
    queryKey: ['/api/admin/analytics/audit-by-school']
  });

  const wasteTrendsQuery = useQuery<WasteTrendsAnalytics>({
    queryKey: ['/api/admin/analytics/waste-trends']
  });

  const adminPromiseMetricsQuery = useQuery<AdminPromiseMetrics>({
    queryKey: ['/api/admin/reduction-promises/metrics']
  });

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
    <div className="space-y-6" data-refactor-source="AnalyticsContent">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Comprehensive insights and metrics for Plastic Clever Schools</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportAnalytics('csv')}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportAnalytics('excel')}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Date Range Picker and PDF Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button
                  disabled={!dateRange?.from || !dateRange?.to}
                  data-testid="button-export-pdf"
                  className="bg-pcs_blue hover:bg-pcs_navy"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-export-pdf">
                <DialogHeader>
                  <DialogTitle>Export PDF Report</DialogTitle>
                  <DialogDescription>
                    Select which sections to include in your analytics report. The report will include data from{' '}
                    {dateRange?.from && dateRange?.to && (
                      <span className="font-medium text-gray-900">
                        {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
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
      <Tabs defaultValue="overview" className="w-full">
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
          {overviewQuery.data && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                  <School className="h-4 w-4 text-pcs_blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-schools">
                    {overviewQuery.data.totalSchools.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Registered institutions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-pcs_teal" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-users">
                    {overviewQuery.data.totalUsers.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Teachers and administrators</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Evidence Submissions</CardTitle>
                  <FileText className="h-4 w-4 text-pcs_yellow" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-total-evidence">
                    {overviewQuery.data.totalEvidence.toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>{overviewQuery.data.pendingEvidence} pending review</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Global Reach</CardTitle>
                  <Globe className="h-4 w-4 text-pcs_coral" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="metric-countries-reached">
                    {overviewQuery.data.countriesReached.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500">Countries with participating schools</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Key Metrics Summary */}
          {overviewQuery.data && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600 font-medium">Total Schools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pcs_blue">{overviewQuery.data.totalSchools}</div>
                  <p className="text-xs text-gray-500 mt-1">Participating schools</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600 font-medium">Total Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-teal">{overviewQuery.data.totalEvidence}</div>
                  <p className="text-xs text-gray-500 mt-1">Submissions received</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600 font-medium">Awards Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-coral">{overviewQuery.data.completedAwards}</div>
                  <p className="text-xs text-gray-500 mt-1">Schools with awards</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600 font-medium">Students Impacted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pcs_blue">{overviewQuery.data.studentsImpacted.toLocaleString()}</div>
                  <p className="text-xs text-gray-500 mt-1">Lives changed</p>
                </CardContent>
              </Card>
            </div>
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
                          <td className="text-center py-2 px-3">{new Date(school.auditDate).toLocaleDateString()}</td>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
