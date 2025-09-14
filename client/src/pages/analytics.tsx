import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { useChartAnimation, useChartAnnouncement, chartA11y, getAnimProps } from '@/components/ui/AnimatedChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, School, FileText, Award, Mail, Globe,
  TrendingUp, BarChart3, PieChart as PieChartIcon,
  Download, Eye, MapPin
} from 'lucide-react';

// Analytics data types
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

interface ResourceAnalytics {
  downloadTrends: Array<{ month: string; downloads: number }>;
  popularResources: Array<{ title: string; downloads: number; stage: string }>;
  resourcesByStage: Array<{ stage: string; count: number; totalDownloads: number }>;
  resourcesByCountry: Array<{ country: string; resources: number; downloads: number }>;
}

interface EmailAnalytics {
  deliveryStats: Array<{ date: string; sent: number; delivered: number }>;
  templatePerformance: Array<{ template: string; sent: number; successRate: number }>;
  recentActivity: Array<{ date: string; template: string; recipient: string; status: string }>;
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
const COLORS = ['#0B3D5D', '#019ADE', '#02BBB4', '#FFC557', '#FF595A', '#6B7280', '#10B981', '#8B5CF6'];

export default function AnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Chart animation and accessibility hooks
  const chartAnimation = useChartAnimation();
  const { announceChart, AnnouncementRegion } = useChartAnnouncement();

  // Analytics queries
  const overviewQuery = useQuery<AnalyticsOverview>({
    queryKey: ['/api/admin/analytics/overview'],
    enabled: true
  });

  const schoolProgressQuery = useQuery<SchoolProgressAnalytics>({
    queryKey: ['/api/admin/analytics/school-progress'],
    enabled: selectedTab === 'schools'
  });

  const evidenceQuery = useQuery<EvidenceAnalytics>({
    queryKey: ['/api/admin/analytics/evidence'],
    enabled: selectedTab === 'evidence'
  });

  const userEngagementQuery = useQuery<UserEngagementAnalytics>({
    queryKey: ['/api/admin/analytics/user-engagement'],
    enabled: selectedTab === 'users'
  });

  const resourceQuery = useQuery<ResourceAnalytics>({
    queryKey: ['/api/admin/analytics/resources'],
    enabled: selectedTab === 'resources'
  });

  const emailQuery = useQuery<EmailAnalytics>({
    queryKey: ['/api/admin/analytics/email'],
    enabled: selectedTab === 'email'
  });

  const geographicQuery = useQuery<GeographicAnalytics>({
    queryKey: ['/api/admin/analytics/geographic'],
    enabled: selectedTab === 'geographic'
  });

  // Accessibility announcements for chart updates
  useEffect(() => {
    if (selectedTab !== 'schools' || !schoolProgressQuery.data) return;
    const msg = `Schools analytics updated: ${chartA11y.getChartDescription(schoolProgressQuery.data.progressRanges, 'bar', 'count')}`;
    announceChart(msg);
  }, [selectedTab, schoolProgressQuery.data, announceChart]);

  useEffect(() => {
    if (selectedTab !== 'evidence' || !evidenceQuery.data) return;
    const msg = `Evidence analytics updated: ${chartA11y.getChartDescription(evidenceQuery.data.submissionTrends, 'line', 'submissions')}`;
    announceChart(msg);
  }, [selectedTab, evidenceQuery.data, announceChart]);

  useEffect(() => {
    if (selectedTab !== 'users' || !userEngagementQuery.data) return;
    const msg = `User analytics updated: ${chartA11y.getChartDescription(userEngagementQuery.data.registrationTrends, 'line', 'teachers')}`;
    announceChart(msg);
  }, [selectedTab, userEngagementQuery.data, announceChart]);

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Accessibility Announcement Region */}
      <AnnouncementRegion />
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Comprehensive insights and metrics for Plastic Clever Schools</p>
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

        {/* Overview Cards */}
        {overviewQuery.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students Impacted</CardTitle>
                <Users className="h-4 w-4 text-pcs_blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-students-impacted">
                  {overviewQuery.data.studentsImpacted.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Total students reached</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Awards Completed</CardTitle>
                <Award className="h-4 w-4 text-pcs_teal" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-completed-awards">
                  {overviewQuery.data.completedAwards.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Schools with completed programs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-pcs_yellow" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-average-progress">
                  {Math.round(overviewQuery.data.averageProgress)}%
                </div>
                <p className="text-xs text-gray-500">Across all participating schools</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <Eye className="h-4 w-4 text-pcs_coral" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-pending-evidence">
                  {overviewQuery.data.pendingEvidence.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">Evidence awaiting admin review</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Analytics Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:grid-cols-6">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="schools" data-testid="tab-schools">Schools</TabsTrigger>
            <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="resources" data-testid="tab-resources">Resources</TabsTrigger>
            <TabsTrigger value="geographic" data-testid="tab-geographic">Geographic</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-pcs_blue" />
                    Platform Growth Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    Select a specific analytics tab to view detailed charts and insights
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-pcs_teal" />
                    Key Performance Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overviewQuery.data && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Program Completion Rate</span>
                          <span className="font-semibold">
                            {Math.round((overviewQuery.data.completedAwards / overviewQuery.data.totalSchools) * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Evidence Approval Rate</span>
                          <span className="font-semibold">Coming Soon</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">User Engagement</span>
                          <span className="font-semibold">High Activity</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schools">
            {schoolProgressQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stage Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>School Stage Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={schoolProgressQuery.data.stageDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          isAnimationActive={chartAnimation.isAnimationActive}
                          animationBegin={chartAnimation.animationBegin}
                          animationDuration={chartAnimation.animationDuration}
                        >
                          {schoolProgressQuery.data.stageDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Progress Ranges */}
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={schoolProgressQuery.data.progressRanges}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="count" 
                          fill="#019ADE"
                          isAnimationActive={chartAnimation.isAnimationActive}
                          animationBegin={chartAnimation.animationBegin}
                          animationDuration={chartAnimation.animationDuration}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Monthly Registrations */}
                <Card>
                  <CardHeader>
                    <CardTitle>School Registration Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={schoolProgressQuery.data.monthlyRegistrations}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#02BBB4" 
                          strokeWidth={2}
                          isAnimationActive={chartAnimation.isAnimationActive}
                          animationBegin={chartAnimation.animationBegin + 100}
                          animationDuration={chartAnimation.animationDuration}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Completion Rates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stage Completion Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={schoolProgressQuery.data.completionRates}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${Math.round(value as number)}%`, 'Completion Rate']} />
                        <Bar 
                          dataKey="rate" 
                          fill="#FFC557"
                          isAnimationActive={chartAnimation.isAnimationActive}
                          animationBegin={chartAnimation.animationBegin}
                          animationDuration={chartAnimation.animationDuration}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Countries */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Schools by Country (Top 10)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={schoolProgressQuery.data.schoolsByCountry.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="country" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#0B3D5D" name="Schools" />
                        <Bar dataKey="students" fill="#FF595A" name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="evidence">
            {evidenceQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Submission Trends */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Evidence Submission Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={evidenceQuery.data.submissionTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="submissions" stroke="#0B3D5D" name="Submissions" />
                        <Line type="monotone" dataKey="approvals" stroke="#02BBB4" name="Approvals" />
                        <Line type="monotone" dataKey="rejections" stroke="#FF595A" name="Rejections" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Stage Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Evidence by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={evidenceQuery.data.stageBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="approved" stackId="a" fill="#02BBB4" name="Approved" />
                        <Bar dataKey="pending" stackId="a" fill="#FFC557" name="Pending" />
                        <Bar dataKey="rejected" stackId="a" fill="#FF595A" name="Rejected" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Review Turnaround */}
                <Card>
                  <CardHeader>
                    <CardTitle>Review Turnaround Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
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
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Submitting Schools */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Top Submitting Schools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={evidenceQuery.data.topSubmitters}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="schoolName" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="submissions" fill="#019ADE" name="Submissions" />
                        <Bar dataKey="approvalRate" fill="#02BBB4" name="Approval Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {userEngagementQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Registration Trends */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>User Registration Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userEngagementQuery.data.registrationTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="teachers" stroke="#019ADE" name="Teachers" />
                        <Line type="monotone" dataKey="admins" stroke="#FF595A" name="Admins" />
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
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={userEngagementQuery.data.roleDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {userEngagementQuery.data.roleDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Active Users */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={userEngagementQuery.data.activeUsers}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="active" fill="#02BBB4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources">
            {resourceQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Download Trends */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Resource Download Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={resourceQuery.data.downloadTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="downloads" stroke="#FFC557" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Resources by Stage */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resources by Program Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={resourceQuery.data.resourcesByStage}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stage" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#0B3D5D" name="Count" />
                        <Bar dataKey="totalDownloads" fill="#019ADE" name="Downloads" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Popular Resources */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Downloaded Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resourceQuery.data.popularResources.slice(0, 5).map((resource, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{resource.title}</p>
                            <p className="text-xs text-gray-500">{resource.stage}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-pcs_blue">{resource.downloads}</p>
                            <p className="text-xs text-gray-500">downloads</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="geographic">
            {geographicQuery.data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Global Reach Summary */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-pcs_blue" />
                      Global Reach Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pcs_blue">
                          {geographicQuery.data.globalReach.totalCountries}
                        </div>
                        <p className="text-sm text-gray-600">Countries Reached</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pcs_teal">
                          {geographicQuery.data.globalReach.totalCities}
                        </div>
                        <p className="text-sm text-gray-600">Cities/Regions</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-pcs_yellow">
                          {geographicQuery.data.globalReach.coordinates.length}
                        </div>
                        <p className="text-sm text-gray-600">Mapped Locations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Schools by Region */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Schools by Region</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={geographicQuery.data.schoolsByRegion.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="country" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="schools" fill="#0B3D5D" name="Schools" />
                        <Bar dataKey="students" fill="#019ADE" name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* School Distribution Scatter Plot */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>School Distribution (Sample Coordinates)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart data={geographicQuery.data.globalReach.coordinates.slice(0, 50)}>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="lng" name="Longitude" />
                        <YAxis type="number" dataKey="lat" name="Latitude" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Schools" data={geographicQuery.data.globalReach.coordinates.slice(0, 50)} fill="#02BBB4" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}