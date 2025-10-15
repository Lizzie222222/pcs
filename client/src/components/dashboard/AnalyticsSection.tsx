import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/states";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, CheckCircle, X } from "lucide-react";

interface AnalyticsData {
  reviewStats: {
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    averageReviewTimeHours: number;
  };
  submissionTrends: Array<{
    month: string;
    count: number;
  }>;
  teamContributions: Array<{
    userId: string;
    userName: string;
    submissionCount: number;
    approvedCount: number;
  }>;
  stageTimeline: Array<{
    stage: string;
    completedAt: string | null;
    daysToComplete: number;
  }>;
  fileTypeDistribution: {
    images: number;
    videos: number;
    pdfs: number;
    other: number;
  };
}

interface AuditAnalyticsData {
  hasAudit: boolean;
  totalPlasticItems: number;
  locationBreakdown: {
    lunchroom: number;
    staffroom: number;
    classrooms: number;
    bathrooms: number;
  };
  topProblemPlastics: Array<{
    name: string;
    count: number;
  }>;
  wasteManagement: {
    hasRecycling: boolean;
    recyclingBinLocations: string | null;
    plasticWasteDestination: string | null;
    hasComposting: boolean;
    hasPolicy: boolean;
    policyDetails: string | null;
  };
}

interface AnalyticsSectionProps {
  schoolId: string;
  isActive: boolean;
}

export default function AnalyticsSection({ schoolId, isActive }: AnalyticsSectionProps) {
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/schools', schoolId, 'analytics'],
    enabled: isActive && !!schoolId,
  });

  const { data: auditAnalyticsData, isLoading: auditAnalyticsLoading } = useQuery<AuditAnalyticsData>({
    queryKey: ['/api/schools', schoolId, 'audit-analytics'],
    enabled: isActive && !!schoolId,
    retry: false,
  });

  if (auditAnalyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-64 bg-gray-100 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!auditAnalyticsData || !auditAnalyticsData.hasAudit) {
    return (
      <Card className="shadow-lg border-0">
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-2">No Analytics Available Yet</p>
          <p className="text-gray-600">Complete your plastic waste audit to see analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Total Plastic Items - Hero Stat */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-pcs_blue via-teal to-pcs_blue text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <CardContent className="p-12 relative z-10">
          <div className="text-center">
            <div className="text-sm font-semibold mb-2 text-white/80 uppercase tracking-wide">Plastic Waste Audit Results</div>
            <div className="text-7xl font-bold mb-3" data-testid="text-total-plastic-items">
              {auditAnalyticsData.totalPlasticItems}
            </div>
            <div className="text-2xl font-semibold">Total Plastic Items Identified</div>
          </div>
        </CardContent>
      </Card>

      {/* Location Breakdown - Bar Chart */}
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-navy">Plastic Items by Location</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { location: 'Lunchroom', count: auditAnalyticsData.locationBreakdown.lunchroom },
                { location: 'Staffroom', count: auditAnalyticsData.locationBreakdown.staffroom },
                { location: 'Classrooms', count: auditAnalyticsData.locationBreakdown.classrooms },
                { location: 'Bathrooms', count: auditAnalyticsData.locationBreakdown.bathrooms },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="location" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="count" fill="url(#locationGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="locationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#009ADE" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#00BBB4" stopOpacity={1}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Problem Plastics */}
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-navy">Top 5 Problem Plastics</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {auditAnalyticsData.topProblemPlastics.length > 0 ? (
            <div className="space-y-4">
              {auditAnalyticsData.topProblemPlastics.map((plastic, index) => (
                <div key={index} className="flex items-center gap-4" data-testid={`problem-plastic-${index}`}>
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-coral to-red-400 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-navy text-lg">{plastic.name}</div>
                    <div className="h-3 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-coral to-red-400"
                        style={{ 
                          width: `${(plastic.count / auditAnalyticsData.topProblemPlastics[0].count) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-coral">{plastic.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No plastic items identified</p>
          )}
        </CardContent>
      </Card>

      {/* Waste Management Practices */}
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-navy">Waste Management Practices</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-xl border-2 ${auditAnalyticsData.wasteManagement.hasRecycling ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full ${auditAnalyticsData.wasteManagement.hasRecycling ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center`}>
                  {auditAnalyticsData.wasteManagement.hasRecycling ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : (
                    <X className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="font-semibold text-lg text-navy">Recycling</div>
              </div>
              <div className="text-sm text-gray-700">
                {auditAnalyticsData.wasteManagement.hasRecycling 
                  ? `Available${auditAnalyticsData.wasteManagement.recyclingBinLocations ? `: ${auditAnalyticsData.wasteManagement.recyclingBinLocations}` : ''}`
                  : 'Not available'}
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${auditAnalyticsData.wasteManagement.hasComposting ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full ${auditAnalyticsData.wasteManagement.hasComposting ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center`}>
                  {auditAnalyticsData.wasteManagement.hasComposting ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : (
                    <X className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="font-semibold text-lg text-navy">Composting</div>
              </div>
              <div className="text-sm text-gray-700">
                {auditAnalyticsData.wasteManagement.hasComposting ? 'Available' : 'Not available'}
              </div>
            </div>

            <div className={`p-6 rounded-xl border-2 ${auditAnalyticsData.wasteManagement.hasPolicy ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full ${auditAnalyticsData.wasteManagement.hasPolicy ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center`}>
                  {auditAnalyticsData.wasteManagement.hasPolicy ? (
                    <CheckCircle className="h-6 w-6 text-white" />
                  ) : (
                    <X className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="font-semibold text-lg text-navy">Reduction Policy</div>
              </div>
              <div className="text-sm text-gray-700">
                {auditAnalyticsData.wasteManagement.hasPolicy 
                  ? `In place${auditAnalyticsData.wasteManagement.policyDetails ? `: ${auditAnalyticsData.wasteManagement.policyDetails}` : ''}`
                  : 'Not in place'}
              </div>
            </div>
          </div>

          {auditAnalyticsData.wasteManagement.plasticWasteDestination && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-semibold text-navy mb-2">Plastic Waste Destination</div>
              <div className="text-sm text-gray-700">{auditAnalyticsData.wasteManagement.plasticWasteDestination}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
