import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subDays, subMonths, subWeeks, subYears, format, isWithinInterval, areIntervalsOverlapping } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useCountries } from "@/hooks/useCountries";
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
  UserMinus,
  Filter
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
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
  lifetimeTotalUsers?: number;
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

interface ActiveUsersOverTimeAnalytics {
  monthly: Array<{ month: string; activeUsers: number; newUsers: number }>;
  weekly: Array<{ week: string; activeUsers: number }>;
}

interface StageFunnelAnalytics {
  stages: Array<{ stage: string; count: number; percentage: number }>;
  dropoffs: Array<{ from: string; to: string; dropoffRate: number }>;
}

interface TimeToCompletionAnalytics {
  averageDays: Array<{ stage: string; avgDays: number; schoolCount: number }>;
  distribution: Array<{ range: string; count: number }>;
}

interface CohortAnalysisAnalytics {
  cohorts: Array<{ month: string; registered: number; reachedInvestigate: number; reachedAct: number; completed: number; avgProgress: number }>;
}

interface ActivityHeatmapAnalytics {
  heatmap: Array<{ dayOfWeek: number; hour: number; count: number }>;
  peakTimes: { bestDay: string; bestHour: number };
}

interface ReactivationRateAnalytics {
  reactivatedSchools: number;
  totalDormantSchools: number;
  reactivationRate: number;
  stillDormant: number;
  activeFromStart: number;
  reactivations: Array<{ month: string; count: number }>;
}

interface EvidenceTypeBreakdownAnalytics {
  byRequirement: Array<{ requirement: string; total: number; approved: number; pending: number; rejected: number; approvalRate: number }>;
  byStage: Array<{ stage: string; total: number; approved: number; avgReviewDays: number }>;
}

interface PromiseCompletionAnalytics {
  overview: { total: number; completed: number; inProgress: number; notStarted: number; completionRate: number };
  byCategory: Array<{ category: string; total: number; completed: number; rate: number }>;
  trends: Array<{ month: string; created: number; completed: number }>;
}

interface ResourceEffectivenessAnalytics {
  resourceImpact: Array<{
    resourceId: string;
    resourceTitle: string;
    stage: string;
    downloads: number;
    schoolsProgressed: number;
    correlationScore: number;
  }>;
  stageCorrelation: Array<{
    stage: string;
    totalDownloads: number;
    avgDownloadsPerProgression: number;
  }>;
}

interface PlasticReductionTrendsAnalytics {
  monthlyReduction: Array<{
    month: string;
    estimatedReduction: number;
    schoolsWithReduction: number;
  }>;
  categoryReduction: Array<{
    category: string;
    totalReduction: number;
    promiseCount: number;
  }>;
  impactMetrics: {
    totalAnnualReduction: number;
    totalWeightKg: number;
    carbonSavedKg: number;
  };
}

interface GeographicAnalytics {
  schoolsByRegion: Array<{ country: string; schools: number; students: number; progress: number }>;
  globalReach: {
    totalCountries: number;
    totalCities: number;
    coordinates: Array<{ lat: number; lng: number; schoolCount: number; country: string }>;
  };
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

interface UKSchoolHoliday {
  name: string;
  getDateRange: (year: number) => { start: Date; end: Date };
}

const UK_SCHOOL_HOLIDAYS: UKSchoolHoliday[] = [
  {
    name: 'Christmas Break',
    getDateRange: (year: number) => ({
      start: new Date(year, 11, 20),
      end: new Date(year + 1, 0, 4)
    })
  },
  {
    name: 'February Half-term',
    getDateRange: (year: number) => ({
      start: new Date(year, 1, 10),
      end: new Date(year, 1, 18)
    })
  },
  {
    name: 'Easter Break',
    getDateRange: (year: number) => ({
      start: new Date(year, 2, 25),
      end: new Date(year, 3, 10)
    })
  },
  {
    name: 'May Half-term',
    getDateRange: (year: number) => ({
      start: new Date(year, 4, 24),
      end: new Date(year, 5, 1)
    })
  },
  {
    name: 'Summer Break',
    getDateRange: (year: number) => ({
      start: new Date(year, 6, 20),
      end: new Date(year, 8, 3)
    })
  },
  {
    name: 'October Half-term',
    getDateRange: (year: number) => ({
      start: new Date(year, 9, 21),
      end: new Date(year, 9, 29)
    })
  }
];

const getHolidaysInRange = (startDate: Date | undefined, endDate: Date | undefined): string[] => {
  if (!startDate || !endDate) {
    return [];
  }
  
  const holidays: string[] = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  for (let year = startYear - 1; year <= endYear + 1; year++) {
    for (const holiday of UK_SCHOOL_HOLIDAYS) {
      const holidayRange = holiday.getDateRange(year);
      
      try {
        const overlaps = areIntervalsOverlapping(
          { start: startDate, end: endDate },
          { start: holidayRange.start, end: holidayRange.end }
        );
        
        if (overlaps && !holidays.includes(holiday.name)) {
          holidays.push(holiday.name);
        }
      } catch {
        continue;
      }
    }
  }
  
  return holidays;
};

const StatTooltip = ({ explanation }: { explanation: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-gray-400 cursor-help ml-1 inline-block" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">
        <p>{explanation}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const STAT_EXPLANATIONS = {
  totalSchools: "Count of all registered schools in the system. Filtered by registration date if a date range is selected.",
  totalUsers: "Count of all registered user accounts (teachers and administrators). Filtered by account creation date if a date range is selected.",
  totalEvidence: "Count of unique evidence submissions (deduplicated by school + requirement + round). Includes legacy imported evidence when viewing all time.",
  completedAwards: "Total number of completed rounds across all schools. One school completing 3 rounds counts as 3 awards.",
  schoolsCompleted: "Number of schools that have completed at least one full round of the programme.",
  pendingEvidence: "Evidence submissions waiting to be reviewed by an administrator. Filtered by submission date if a date range is selected.",
  averageProgress: "Average completion percentage across all participating schools. Based on the progress_percentage field which tracks overall programme completion.",
  studentsImpacted: "Sum of student counts reported by all registered schools. Filtered by school registration date if a date range is selected.",
  countriesReached: "Number of unique countries with at least one registered school. Filtered by school registration date if a date range is selected.",
  activeSchoolsLastMonth: "Schools with any recorded activity in the past 30 days. This always shows the current rolling 30-day window regardless of date filter selection.",
  lifetimeTotalUsers: "Total registered users (excludes deleted accounts).",
  interactedUsers: "Users who have any recorded activity. Includes both legacy users (imported with historical activity data) and new users who have logged in.",
  notInteractedUsers: "Users with no recorded activity. These are accounts that were created but have never been active.",
  interactionRate: "Percentage of users with any recorded activity (Ever Logged In / Total Users).",
  totalResourceDownloads: "Total download count across all resources and resource packs.",
};

interface AnalyticsContentProps {
  activeTab: string;
}

export default function AnalyticsContent({ activeTab }: AnalyticsContentProps) {
  const { toast } = useToast();
  
  // Date range state - default to All Time (undefined means no date filtering)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Filter state for Country, School Type, and Round
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  
  // Get countries for filter dropdown
  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];
  
  // Build filter params for API calls
  const filterParams = {
    startDate: dateRange?.from?.toISOString(), 
    endDate: dateRange?.to?.toISOString(),
    country: countryFilter !== 'all' ? countryFilter : undefined,
    schoolType: schoolTypeFilter !== 'all' ? schoolTypeFilter : undefined,
    round: roundFilter !== 'all' ? roundFilter : undefined
  };

  // Analytics queries - only load when this component is mounted (overview tab is active)
  // Date filtering is optional - defaults to All Time (undefined) which shows lifetime totals
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview', filterParams],
    enabled: activeTab === 'overview'
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress', filterParams],
    enabled: activeTab === 'overview'
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence', filterParams],
    enabled: activeTab === 'overview'
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement', filterParams],
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
    queryKey: ['/api/admin/analytics/school-activity-aging', filterParams],
    enabled: activeTab === 'overview' // Loads when overview tab is active, displayed in schools-evidence tab
  });

  const referralSourceQuery = useQuery<ReferralSourceAnalytics>({
    queryKey: ['/api/admin/analytics/referral-sources'],
  });

  const resourceAnalyticsQuery = useQuery<ResourceAnalytics>({
    queryKey: ['/api/admin/analytics/resources', filterParams],
  });

  const activeUsersOverTimeQuery = useQuery<ActiveUsersOverTimeAnalytics>({
    queryKey: ['/api/admin/analytics/active-users-over-time'],
    enabled: activeTab === 'overview'
  });

  const stageFunnelQuery = useQuery<StageFunnelAnalytics>({
    queryKey: ['/api/admin/analytics/stage-funnel'],
    enabled: activeTab === 'overview'
  });

  const timeToCompletionQuery = useQuery<TimeToCompletionAnalytics>({
    queryKey: ['/api/admin/analytics/time-to-completion'],
    enabled: activeTab === 'overview'
  });

  const cohortAnalysisQuery = useQuery<CohortAnalysisAnalytics>({
    queryKey: ['/api/admin/analytics/cohort-analysis'],
    enabled: activeTab === 'overview'
  });

  // Heatmap date range state - default to All Time for complete data view
  const [heatmapDateRange, setHeatmapDateRange] = useState<string>("all");

  // Helper function to compute start/end dates from heatmap preset
  const getHeatmapDateParams = () => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;
    
    switch (heatmapDateRange) {
      case "1week":
        startDate = subWeeks(now, 1);
        break;
      case "1month":
        startDate = subMonths(now, 1);
        break;
      case "3months":
        startDate = subMonths(now, 3);
        break;
      case "6months":
        startDate = subMonths(now, 6);
        break;
      case "1year":
        startDate = subYears(now, 1);
        break;
      case "all":
        startDate = undefined;
        endDate = undefined;
        break;
      default:
        startDate = subMonths(now, 6);
    }
    
    return {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString()
    };
  };

  const heatmapDateParams = getHeatmapDateParams();

  const activityHeatmapQuery = useQuery<ActivityHeatmapAnalytics>({
    queryKey: ['/api/admin/analytics/activity-heatmap', { 
      startDate: heatmapDateParams.startDate, 
      endDate: heatmapDateParams.endDate 
    }],
    enabled: activeTab === 'overview'
  });

  const reactivationRateQuery = useQuery<ReactivationRateAnalytics>({
    queryKey: ['/api/admin/analytics/reactivation-rate'],
    enabled: activeTab === 'overview'
  });

  const evidenceTypeBreakdownQuery = useQuery<EvidenceTypeBreakdownAnalytics>({
    queryKey: ['/api/admin/analytics/evidence-type-breakdown'],
    enabled: activeTab === 'overview'
  });

  const promiseCompletionQuery = useQuery<PromiseCompletionAnalytics>({
    queryKey: ['/api/admin/analytics/promise-completion'],
    enabled: activeTab === 'overview'
  });

  const resourceEffectivenessQuery = useQuery<ResourceEffectivenessAnalytics>({
    queryKey: ['/api/admin/analytics/resource-effectiveness'],
    enabled: activeTab === 'overview'
  });

  const plasticReductionTrendsQuery = useQuery<PlasticReductionTrendsAnalytics>({
    queryKey: ['/api/admin/analytics/plastic-reduction-trends'],
    enabled: activeTab === 'overview'
  });

  const geographicAnalyticsQuery = useQuery<GeographicAnalytics>({
    queryKey: ['/api/admin/analytics/geographic'],
    enabled: activeTab === 'overview'
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
    advancedAnalytics: true,
    aiInsights: true,
  });

  const heatmapHolidays = useMemo(() => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;
    
    switch (heatmapDateRange) {
      case "1week":
        startDate = subWeeks(now, 1);
        break;
      case "1month":
        startDate = subMonths(now, 1);
        break;
      case "3months":
        startDate = subMonths(now, 3);
        break;
      case "6months":
        startDate = subMonths(now, 6);
        break;
      case "1year":
        startDate = subYears(now, 1);
        break;
      case "all":
        startDate = new Date(2020, 0, 1);
        endDate = now;
        break;
      default:
        startDate = subMonths(now, 6);
    }
    
    return getHolidaysInRange(startDate, endDate);
  }, [heatmapDateRange]);

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
      a.download = `pcs_full_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
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
      const response = await apiRequest('POST', '/api/admin/analytics/export-pdf', {
        dateRange: dateRange?.from && dateRange?.to ? {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString()
        } : null,
        filters: {
          country: countryFilter !== 'all' ? countryFilter : undefined,
          schoolType: schoolTypeFilter !== 'all' ? schoolTypeFilter : undefined,
          round: roundFilter !== 'all' ? roundFilter : undefined
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
            title="Export all schools and users data as CSV"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export All Data (CSV)</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => exportAnalytics('excel')}
            data-testid="button-export-excel"
            className="min-h-11 text-xs sm:text-sm px-3 sm:px-4"
            title="Export all schools and users data as Excel with multiple sheets"
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export All Data (Excel)</span>
            <span className="sm:hidden">Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
        </div>
        
        {/* Country Filter */}
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-country-filter">
            <Globe className="w-4 h-4 mr-2 text-gray-500" />
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.filter(c => c.value !== 'all').map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* School Type Filter */}
        <Select value={schoolTypeFilter} onValueChange={setSchoolTypeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-school-type-filter">
            <School className="w-4 h-4 mr-2 text-gray-500" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="kindergarten">Kindergarten</SelectItem>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="high_school">High School</SelectItem>
            <SelectItem value="international">International</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Round Filter */}
        <Select value={roundFilter} onValueChange={setRoundFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-round-filter">
            <Award className="w-4 h-4 mr-2 text-gray-500" />
            <SelectValue placeholder="All Rounds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rounds</SelectItem>
            <SelectItem value="1">Round 1</SelectItem>
            <SelectItem value="2">Round 2</SelectItem>
            <SelectItem value="3">Round 3</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Clear Filters Button */}
        {(countryFilter !== 'all' || schoolTypeFilter !== 'all' || roundFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCountryFilter('all');
              setSchoolTypeFilter('all');
              setRoundFilter('all');
            }}
            data-testid="button-clear-filters"
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
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
                    Select which sections to include in your analytics report.{' '}
                    {dateRange?.from && dateRange?.to ? (
                      <>
                        The report will include data from{' '}
                        <span className="font-medium text-gray-900">
                          {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-gray-900">The report will include all time data.</span>
                    )}
                    {(countryFilter !== 'all' || schoolTypeFilter !== 'all' || roundFilter !== 'all') && (
                      <span className="block mt-2 text-sm">
                        <span className="font-medium">Active filters:</span>{' '}
                        {countryFilter !== 'all' && <Badge variant="secondary" className="mr-1">{countryFilter}</Badge>}
                        {schoolTypeFilter !== 'all' && <Badge variant="secondary" className="mr-1">{schoolTypeFilter}</Badge>}
                        {roundFilter !== 'all' && <Badge variant="secondary">Round {roundFilter}</Badge>}
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
                      id="section-advanced-analytics"
                      checked={selectedSections.advancedAnalytics}
                      onCheckedChange={(checked) => 
                        setSelectedSections({ ...selectedSections, advancedAnalytics: checked as boolean })
                      }
                      data-testid="checkbox-section-advanced-analytics"
                    />
                    <label
                      htmlFor="section-advanced-analytics"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Advanced Analytics (Stage Funnel, Cohort, Resources, Geographic)
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
        <TabsList className="grid w-full grid-cols-5" data-testid="analytics-tabs">
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
          <TabsTrigger value="advanced" data-testid="tab-advanced">
            <TrendingUp className="w-4 h-4 mr-2" />
            Advanced Analytics
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
                  <CardTitle className="text-sm font-medium flex items-center">
                    Total Schools
                    <StatTooltip explanation={STAT_EXPLANATIONS.totalSchools} />
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium flex items-center">
                    Active Users
                    <StatTooltip explanation={STAT_EXPLANATIONS.totalUsers} />
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium flex items-center">
                    Evidence Submissions
                    <StatTooltip explanation={STAT_EXPLANATIONS.totalEvidence} />
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium flex items-center">
                    Global Reach
                    <StatTooltip explanation={STAT_EXPLANATIONS.countriesReached} />
                  </CardTitle>
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.totalSchools} />
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.totalEvidence} />
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.completedAwards} />
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.schoolsCompleted} />
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.activeSchoolsLastMonth} />
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.studentsImpacted} />
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
                      <StatTooltip explanation={STAT_EXPLANATIONS.totalResourceDownloads} />
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
                    <CardTitle className="text-sm font-medium flex items-center">
                      Total Users
                      <StatTooltip explanation={STAT_EXPLANATIONS.lifetimeTotalUsers} />
                    </CardTitle>
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
                    <CardTitle className="text-sm font-medium flex items-center">
                      Ever Logged In
                      <StatTooltip explanation={STAT_EXPLANATIONS.interactedUsers} />
                    </CardTitle>
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="metric-interacted-users">
                      {(overviewQuery.data.interactedUsers || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {overviewQuery.data.interactionRate || 0}% of all users (lifetime)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      Never Logged In
                      <StatTooltip explanation={STAT_EXPLANATIONS.notInteractedUsers} />
                    </CardTitle>
                    <UserMinus className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600" data-testid="metric-not-interacted-users">
                      {(overviewQuery.data.notInteractedUsers || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(overviewQuery.data.lifetimeTotalUsers || overviewQuery.data.totalUsers) > 0 
                        ? Math.round(((overviewQuery.data.notInteractedUsers || 0) / (overviewQuery.data.lifetimeTotalUsers || overviewQuery.data.totalUsers)) * 100)
                        : 0}% awaiting first login
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
                    <BarChart data={
                      // Sort progress ranges in logical order
                      [...schoolProgressQuery.data.progressRanges].sort((a, b) => {
                        const order = ['Not Started', '1-25%', '26-50%', '51-75%', '76-99%', 'Completed'];
                        return order.indexOf(a.range) - order.indexOf(b.range);
                      })
                    }>
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
                        <RechartsTooltip 
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

        {/* Advanced Analytics Tab */}
        <TabsContent value="advanced" className="space-y-6" data-testid="content-advanced">
          {/* Active Users Over Time */}
          <Card data-testid="card-active-users-over-time">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-pcs_blue" />
                Active Users Over Time
              </CardTitle>
              <p className="text-sm text-gray-500">Monthly active and new user trends</p>
            </CardHeader>
            <CardContent>
              {activeUsersOverTimeQuery.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                </div>
              ) : activeUsersOverTimeQuery.data?.monthly && activeUsersOverTimeQuery.data.monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activeUsersOverTimeQuery.data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="activeUsers" stroke={ANALYTICS_COLORS[0]} strokeWidth={2} name="Active Users" />
                    <Line yAxisId="right" type="monotone" dataKey="newUsers" stroke={ANALYTICS_COLORS[2]} strokeWidth={2} name="New Users" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No user activity data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stage Progression Funnel */}
          <Card data-testid="card-stage-funnel">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-pcs_teal" />
                Stage Progression Funnel
              </CardTitle>
              <p className="text-sm text-gray-500">School progression through each stage</p>
            </CardHeader>
            <CardContent>
              {stageFunnelQuery.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_teal"></div>
                </div>
              ) : stageFunnelQuery.data?.stages && stageFunnelQuery.data.stages.length > 0 ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stageFunnelQuery.data.stages} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="stage" type="category" width={100} />
                      <RechartsTooltip formatter={(value: number, name: string) => [value, name === 'count' ? 'Schools' : name]} />
                      <Bar dataKey="count" fill={ANALYTICS_COLORS[1]}>
                        {stageFunnelQuery.data.stages.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {stageFunnelQuery.data.dropoffs && stageFunnelQuery.data.dropoffs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {stageFunnelQuery.data.dropoffs.map((dropoff, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg" data-testid={`dropoff-${dropoff.from}-${dropoff.to}`}>
                          <div className="text-sm text-gray-600">{dropoff.from} → {dropoff.to}</div>
                          <div className="text-lg font-bold text-pcs_coral">{dropoff.dropoffRate.toFixed(1)}% drop-off</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No funnel data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time to Completion - Average Days */}
            <Card data-testid="card-time-to-completion">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-pcs_blue" />
                  Time to Reach Each Stage
                </CardTitle>
                <p className="text-sm text-gray-500">Average days from registration to first evidence in each stage</p>
              </CardHeader>
              <CardContent>
                {timeToCompletionQuery.isLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                  </div>
                ) : timeToCompletionQuery.data?.averageDays && timeToCompletionQuery.data.averageDays.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={timeToCompletionQuery.data.averageDays}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                      <RechartsTooltip formatter={(value: number) => [`${value} days`, 'Avg Days from Registration']} />
                      <Bar dataKey="avgDays" fill={ANALYTICS_COLORS[0]} name="Avg Days" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No completion time data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time to Completion - Distribution */}
            <Card data-testid="card-completion-distribution">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-pcs_teal" />
                  Completion Time Distribution
                </CardTitle>
                <p className="text-sm text-gray-500">Schools by completion time range</p>
              </CardHeader>
              <CardContent>
                {timeToCompletionQuery.isLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_teal"></div>
                  </div>
                ) : timeToCompletionQuery.data?.distribution && timeToCompletionQuery.data.distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={timeToCompletionQuery.data.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={ANALYTICS_COLORS[2]} name="Schools" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No distribution data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cohort Analysis */}
          <Card data-testid="card-cohort-analysis">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-pcs_blue" />
                Cohort Analysis
              </CardTitle>
              <p className="text-sm text-gray-500">Monthly registration cohorts and their progression</p>
            </CardHeader>
            <CardContent>
              {cohortAnalysisQuery.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                </div>
              ) : cohortAnalysisQuery.data?.cohorts && cohortAnalysisQuery.data.cohorts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cohortAnalysisQuery.data.cohorts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="registered" fill={ANALYTICS_COLORS[0]} name="Registered" />
                    <Bar dataKey="reachedInvestigate" fill={ANALYTICS_COLORS[1]} name="Reached Investigate" />
                    <Bar dataKey="reachedAct" fill={ANALYTICS_COLORS[2]} name="Reached Act" />
                    <Bar dataKey="completed" fill={ANALYTICS_COLORS[6]} name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No cohort data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Heatmap */}
          <Card data-testid="card-activity-heatmap">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-pcs_coral" />
                  Activity Heatmap
                </CardTitle>
                <Select value={heatmapDateRange} onValueChange={setHeatmapDateRange}>
                  <SelectTrigger className="w-[160px]" data-testid="select-heatmap-date-range">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1week">Last Week</SelectItem>
                    <SelectItem value="1month">Last Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-500">
                Shows when teachers submit evidence (by day of week and hour). Darker = more submissions.
                {activityHeatmapQuery.data?.peakTimes && (
                  <span className="ml-2 text-pcs_blue font-medium">
                    Peak: {activityHeatmapQuery.data.peakTimes.bestDay} at {activityHeatmapQuery.data.peakTimes.bestHour}:00
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              {activityHeatmapQuery.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_coral"></div>
                </div>
              ) : activityHeatmapQuery.data?.heatmap && activityHeatmapQuery.data.heatmap.length > 0 ? (
                <>
                  {/* Show info message when data is sparse */}
                  {(() => {
                    const totalSubmissions = activityHeatmapQuery.data.heatmap.reduce((sum, h) => sum + h.count, 0);
                    if (totalSubmissions < 10 && heatmapDateRange !== 'all') {
                      return (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
                          <Info className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Only {totalSubmissions} evidence submission{totalSubmissions !== 1 ? 's' : ''} in this period. 
                            Try selecting "All Time" for a complete activity picture.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="flex">
                      <div className="w-20"></div>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 text-center text-xs text-gray-500">
                          {i}
                        </div>
                      ))}
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                      <div key={day} className="flex items-center">
                        <div className="w-20 text-sm text-gray-600 font-medium">{day}</div>
                        {Array.from({ length: 24 }, (_, hour) => {
                          const cell = activityHeatmapQuery.data?.heatmap.find(
                            h => h.dayOfWeek === dayIndex && h.hour === hour
                          );
                          const count = cell?.count || 0;
                          const maxCount = Math.max(...(activityHeatmapQuery.data?.heatmap.map(h => h.count) || [1]));
                          const intensity = maxCount > 0 ? count / maxCount : 0;
                          return (
                            <TooltipProvider key={hour}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="flex-1 h-8 m-0.5 rounded cursor-pointer transition-all hover:scale-105"
                                    style={{
                                      backgroundColor: `rgba(1, 154, 222, ${Math.max(0.1, intensity)})`,
                                    }}
                                    data-testid={`heatmap-cell-${dayIndex}-${hour}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="text-sm">
                                    <p className="font-medium">{day} at {hour}:00</p>
                                    <p className="text-gray-300">{count} evidence submission{count !== 1 ? 's' : ''}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      Based on when teachers submit evidence to the platform
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                </>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No activity heatmap data available</p>
                  </div>
                </div>
              )}
              
              {/* UK School Holiday Context Panel */}
              <div className="mt-4 pt-3 border-t border-gray-100" data-testid="holiday-context-panel">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-gray-500">
                    {heatmapHolidays.length > 0 ? (
                      <span>
                        <span className="text-gray-600 font-medium">UK school holidays in this period: </span>
                        {heatmapHolidays.join(', ')}
                      </span>
                    ) : (
                      <span>No major UK school holidays in this period</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reactivation Rate */}
            <Card data-testid="card-reactivation-rate">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  School Engagement Rate
                </CardTitle>
                <p className="text-sm text-gray-500">
                  How quickly schools start participating after registering
                </p>
              </CardHeader>
              <CardContent>
                {reactivationRateQuery.isLoading ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : reactivationRateQuery.data ? (
                  <div className="space-y-4">
                    {/* Show explanatory message when we have data but totalDormantSchools is 0 (meaning no schools are 90+ days old yet) */}
                    {reactivationRateQuery.data.totalDormantSchools === 0 && 
                     reactivationRateQuery.data.activeFromStart === 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-sm text-blue-800">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          This metric tracks schools registered 90+ days ago. All registered schools are 
                          still in their initial engagement period. Data will appear as schools reach 90 days.
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-3 bg-green-50 rounded-lg cursor-help" data-testid="metric-active-from-start">
                            <div className="text-2xl font-bold text-green-600">
                              {reactivationRateQuery.data.activeFromStart}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                              Active From Start
                              <Info className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Schools that submitted evidence within 30 days of registering - highly engaged from the start</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-3 bg-blue-50 rounded-lg cursor-help" data-testid="metric-reactivated-schools">
                            <div className="text-2xl font-bold text-pcs_blue">
                              {reactivationRateQuery.data.reactivatedSchools}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                              Reactivated
                              <Info className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Schools that were dormant for 30+ days after registering but then came back and submitted evidence</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-3 bg-orange-50 rounded-lg cursor-help" data-testid="metric-still-dormant">
                            <div className="text-2xl font-bold text-orange-600">
                              {reactivationRateQuery.data.stillDormant}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                              Still Dormant
                              <Info className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Schools registered 90+ days ago that have never submitted any evidence - potential re-engagement targets</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-3 bg-teal-50 rounded-lg cursor-help" data-testid="metric-reactivation-rate">
                            <div className="text-2xl font-bold text-pcs_teal">
                              {reactivationRateQuery.data.reactivationRate.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                              Win-Back Rate
                              <Info className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Of schools that didn't engage immediately, what percentage were eventually won back? (Reactivated ÷ Total Dormant)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {reactivationRateQuery.data.reactivations && reactivationRateQuery.data.reactivations.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Monthly reactivations trend</p>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={reactivationRateQuery.data.reactivations}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RechartsTooltip />
                            <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} name="Reactivations" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No engagement data available</p>
                      <p className="text-xs mt-1">This metric appears once schools have been registered for 90+ days</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promise Completion Overview */}
            <Card data-testid="card-promise-completion">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2 text-pcs_yellow" />
                  Promise Completion
                </CardTitle>
                <p className="text-sm text-gray-500">Action plan completion status</p>
              </CardHeader>
              <CardContent>
                {promiseCompletionQuery.isLoading ? (
                  <div className="h-[250px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_yellow"></div>
                  </div>
                ) : promiseCompletionQuery.data?.overview ? (
                  <div className="space-y-4">
                    {/* Show explanatory message when there are in-progress promises but none completed yet */}
                    {promiseCompletionQuery.data.overview.inProgress > 0 &&
                     promiseCompletionQuery.data.overview.completed === 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          No promises have been marked as achieved yet. Teachers update promise status 
                          to "achieved" when their plastic reduction targets are met.
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-green-50 rounded-lg" data-testid="metric-completion-rate">
                        <div className="text-2xl font-bold text-green-600">
                          {promiseCompletionQuery.data.overview.completionRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">Completion Rate</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg" data-testid="metric-total-promises">
                        <div className="text-2xl font-bold text-pcs_blue">
                          {promiseCompletionQuery.data.overview.total}
                        </div>
                        <div className="text-xs text-gray-600">Total Promises</div>
                      </div>
                      <div className="text-center p-3 bg-teal-50 rounded-lg" data-testid="metric-completed-promises">
                        <div className="text-2xl font-bold text-pcs_teal">
                          {promiseCompletionQuery.data.overview.completed}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg" data-testid="metric-in-progress-promises">
                        <div className="text-2xl font-bold text-pcs_yellow">
                          {promiseCompletionQuery.data.overview.inProgress}
                        </div>
                        <div className="text-xs text-gray-600">In Progress</div>
                      </div>
                    </div>
                    {promiseCompletionQuery.data.byCategory && promiseCompletionQuery.data.byCategory.length > 0 && (
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={promiseCompletionQuery.data.byCategory}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            label={(entry) => entry.category}
                          >
                            {promiseCompletionQuery.data.byCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number, name: string) => [value, 'Promises']} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No promise completion data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submissions by Requirement - Total Count Chart */}
          <Card data-testid="card-submissions-by-requirement">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-pcs_blue" />
                Submissions by Requirement
              </CardTitle>
              <p className="text-sm text-gray-500">Total evidence submissions for each program step</p>
            </CardHeader>
            <CardContent>
              {evidenceTypeBreakdownQuery.isLoading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                </div>
              ) : evidenceTypeBreakdownQuery.data?.byRequirement && evidenceTypeBreakdownQuery.data.byRequirement.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple bar list showing totals prominently */}
                  <div className="space-y-3">
                    {evidenceTypeBreakdownQuery.data.byRequirement.map((req, index) => {
                      const maxTotal = Math.max(...evidenceTypeBreakdownQuery.data!.byRequirement.map(r => r.total));
                      const percentage = maxTotal > 0 ? (req.total / maxTotal) * 100 : 0;
                      return (
                        <div key={index} className="space-y-1" data-testid={`submission-row-${index}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">{req.requirement}</span>
                            <span className="text-lg font-bold text-pcs_blue">{req.total}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-6 relative overflow-hidden">
                            <div 
                              className="h-full rounded-full flex items-center transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]
                              }}
                            >
                              {percentage > 15 && (
                                <span className="text-white text-xs font-medium pl-2">
                                  {req.approved} approved
                                </span>
                              )}
                            </div>
                            {req.pending > 0 && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-600 font-medium">
                                {req.pending} pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-pcs_blue">
                        {evidenceTypeBreakdownQuery.data.byRequirement.reduce((sum, r) => sum + r.total, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Total Submissions</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {evidenceTypeBreakdownQuery.data.byRequirement.reduce((sum, r) => sum + r.approved, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Approved</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {evidenceTypeBreakdownQuery.data.byRequirement.reduce((sum, r) => sum + r.pending, 0)}
                      </div>
                      <div className="text-xs text-gray-600">Pending Review</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No evidence submissions data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schools by Country */}
          <Card data-testid="card-schools-by-country">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2 text-pcs_teal" />
                Schools by Country
              </CardTitle>
              <p className="text-sm text-gray-500">
                Geographic distribution of registered schools
                {geographicAnalyticsQuery.data?.globalReach && (
                  <span className="ml-2 text-pcs_blue font-medium">
                    ({geographicAnalyticsQuery.data.globalReach.totalCountries} countries)
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              {geographicAnalyticsQuery.isLoading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_teal"></div>
                </div>
              ) : geographicAnalyticsQuery.data?.schoolsByRegion && geographicAnalyticsQuery.data.schoolsByRegion.length > 0 ? (
                <div className="space-y-4">
                  {/* Top 10 countries bar chart */}
                  <div className="space-y-3">
                    {geographicAnalyticsQuery.data.schoolsByRegion.slice(0, 10).map((region, index) => {
                      const maxSchools = Math.max(...geographicAnalyticsQuery.data!.schoolsByRegion.map(r => r.schools));
                      const percentage = maxSchools > 0 ? (region.schools / maxSchools) * 100 : 0;
                      return (
                        <div key={index} className="space-y-1" data-testid={`country-row-${index}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">{region.country}</span>
                            <span className="text-lg font-bold text-pcs_teal">{region.schools}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                            <div 
                              className="h-full rounded-full flex items-center transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]
                              }}
                            >
                              {percentage > 20 && region.students > 0 && (
                                <span className="text-white text-xs font-medium pl-2">
                                  {region.students.toLocaleString()} students
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <div className="text-2xl font-bold text-pcs_teal">
                        {geographicAnalyticsQuery.data.schoolsByRegion.reduce((sum, r) => sum + r.schools, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Total Schools</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-pcs_blue">
                        {geographicAnalyticsQuery.data.globalReach.totalCountries}
                      </div>
                      <div className="text-xs text-gray-600">Countries</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {geographicAnalyticsQuery.data.schoolsByRegion.reduce((sum, r) => sum + (r.students || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Total Students</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No geographic data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence by Stage Summary */}
          {evidenceTypeBreakdownQuery.data?.byStage && evidenceTypeBreakdownQuery.data.byStage.length > 0 && (
            <Card data-testid="card-evidence-by-stage">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-pcs_teal" />
                  Evidence by Stage
                </CardTitle>
                <p className="text-sm text-gray-500">Evidence submission and review metrics per stage</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {evidenceTypeBreakdownQuery.data.byStage.map((stage, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg" data-testid={`stage-summary-${stage.stage}`}>
                      <div className="font-medium text-gray-800 capitalize mb-2">{stage.stage}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">{stage.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Approved:</span>
                          <span className="font-medium text-green-600">{stage.approved}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Review:</span>
                          <span className="font-medium">{stage.avgReviewDays.toFixed(1)} days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promise Completion Trends */}
          {promiseCompletionQuery.data?.trends && promiseCompletionQuery.data.trends.length > 0 && (
            <Card data-testid="card-promise-trends">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-pcs_blue" />
                  Promise Completion Trends
                </CardTitle>
                <p className="text-sm text-gray-500">Monthly promise creation and completion</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={promiseCompletionQuery.data.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke={ANALYTICS_COLORS[0]} strokeWidth={2} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke={ANALYTICS_COLORS[6]} strokeWidth={2} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Resource Effectiveness */}
          <Card data-testid="card-resource-effectiveness">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-pcs_teal" />
                Resource Effectiveness
              </CardTitle>
              <p className="text-sm text-gray-500">Most downloaded resources and their correlation with school progression</p>
            </CardHeader>
            <CardContent>
              {resourceEffectivenessQuery.isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_teal"></div>
                </div>
              ) : resourceEffectivenessQuery.data?.resourceImpact && resourceEffectivenessQuery.data.resourceImpact.length > 0 ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resourceEffectivenessQuery.data.resourceImpact} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="resourceTitle" type="category" width={200} tick={{ fontSize: 10 }} />
                      <RechartsTooltip 
                        formatter={(value: number, name: string) => [
                          name === 'downloads' ? `${value} downloads` : `${value}%`,
                          name === 'downloads' ? 'Downloads' : 'Correlation Score'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="downloads" fill={ANALYTICS_COLORS[1]} name="Downloads" />
                    </BarChart>
                  </ResponsiveContainer>
                  {resourceEffectivenessQuery.data.stageCorrelation && resourceEffectivenessQuery.data.stageCorrelation.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {resourceEffectivenessQuery.data.stageCorrelation.map((stage, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg" data-testid={`resource-stage-${stage.stage}`}>
                          <div className="font-medium text-gray-800 capitalize mb-2">{stage.stage}</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Downloads:</span>
                              <span className="font-medium">{stage.totalDownloads}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Avg per School:</span>
                              <span className="font-medium text-pcs_teal">{stage.avgDownloadsPerProgression}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No resource effectiveness data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plastic Reduction Trends */}
          <Card data-testid="card-plastic-reduction-trends">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Leaf className="w-5 h-5 mr-2 text-green-600" />
                Plastic Reduction Trends
              </CardTitle>
              <p className="text-sm text-gray-500">Estimated plastic reduction from action plans over time</p>
            </CardHeader>
            <CardContent>
              {plasticReductionTrendsQuery.isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : plasticReductionTrendsQuery.data ? (
                <div className="space-y-6">
                  {/* Impact Metrics Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-center" data-testid="metric-annual-reduction">
                      <div className="text-2xl font-bold text-green-600">
                        {plasticReductionTrendsQuery.data.impactMetrics.totalAnnualReduction.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Annual Items Reduced</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center" data-testid="metric-weight-kg">
                      <div className="text-2xl font-bold text-pcs_blue">
                        {plasticReductionTrendsQuery.data.impactMetrics.totalWeightKg.toLocaleString()} kg
                      </div>
                      <div className="text-xs text-gray-600">Plastic Weight Saved</div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-4 bg-teal-50 rounded-lg text-center cursor-help" data-testid="metric-carbon-saved">
                            <div className="text-2xl font-bold text-pcs_teal">
                              {plasticReductionTrendsQuery.data.impactMetrics.carbonSavedKg.toLocaleString()} kg
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                              CO₂ Saved
                              <Info className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-4">
                          <div className="space-y-2 text-sm">
                            <p className="font-semibold">Why track carbon?</p>
                            <p className="text-gray-300">Reducing plastic use helps fight climate change because plastic production is energy-intensive and releases greenhouse gases.</p>
                            <p className="font-semibold mt-2">How it's calculated:</p>
                            <p className="text-gray-300">Every 1 kg of plastic reduced prevents approximately 6 kg of CO₂ emissions from production, processing, and transport.</p>
                            <p className="text-xs text-gray-400 mt-2 italic">Based on European Commission lifecycle assessment studies</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Monthly Reduction Chart */}
                  {plasticReductionTrendsQuery.data.monthlyReduction && plasticReductionTrendsQuery.data.monthlyReduction.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={plasticReductionTrendsQuery.data.monthlyReduction}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="estimatedReduction" stroke={ANALYTICS_COLORS[6]} strokeWidth={2} name="Items Reduced" />
                        <Line yAxisId="right" type="monotone" dataKey="schoolsWithReduction" stroke={ANALYTICS_COLORS[1]} strokeWidth={2} name="Schools" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {/* Category Breakdown */}
                  {plasticReductionTrendsQuery.data.categoryReduction && plasticReductionTrendsQuery.data.categoryReduction.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Reduction by Plastic Category</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={plasticReductionTrendsQuery.data.categoryReduction}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="totalReduction" fill={ANALYTICS_COLORS[6]} name="Items Reduced">
                            {plasticReductionTrendsQuery.data.categoryReduction.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Leaf className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No plastic reduction data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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
