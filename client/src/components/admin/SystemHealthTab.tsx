import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/states";
import { Activity, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from "date-fns";

interface EndpointStatus {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
  message?: string;
}

interface HealthStats {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptimePercentage: number;
}

interface Incident {
  id: string;
  endpoint: string;
  status: 'degraded' | 'down';
  message: string;
  timestamp: string;
  duration?: number;
  resolved: boolean;
  resolvedAt?: string;
}

interface MetricDataPoint {
  timestamp: string;
  endpoint: string;
  responseTime: number;
  status: 'healthy' | 'degraded' | 'down';
}

export default function SystemHealthTab() {
  const [uptimeRange, setUptimeRange] = useState<'7' | '30'>('7');
  const [incidentRange, setIncidentRange] = useState<'24' | '48'>('24');

  const { data: endpointStatuses, isLoading: statusLoading, error: statusError } = useQuery<EndpointStatus[]>({
    queryKey: ['/api/admin/health/status'],
    refetchInterval: 30000,
  });

  const { data: healthStats, isLoading: statsLoading, error: statsError } = useQuery<HealthStats>({
    queryKey: ['/api/admin/health/stats', { days: uptimeRange }],
    refetchInterval: 60000,
  });

  const { data: incidents, isLoading: incidentsLoading, error: incidentsError } = useQuery<Incident[]>({
    queryKey: ['/api/admin/health/incidents', { hours: incidentRange }],
    refetchInterval: 60000,
  });

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<MetricDataPoint[]>({
    queryKey: ['/api/admin/health/metrics'],
    refetchInterval: 60000,
  });

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-status-healthy"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600" data-testid="badge-status-degraded"><AlertTriangle className="w-3 h-3 mr-1" />Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-500 hover:bg-red-600" data-testid="badge-status-down"><XCircle className="w-3 h-3 mr-1" />Down</Badge>;
    }
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const safeFormatDistanceToNow = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (statusError || statsError || incidentsError || metricsError) {
    return (
      <Alert variant="destructive" data-testid="alert-error">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading health data</AlertTitle>
        <AlertDescription>
          {(statusError as Error)?.message || (statsError as Error)?.message || 
           (incidentsError as Error)?.message || (metricsError as Error)?.message || 
           'Failed to fetch system health information'}
        </AlertDescription>
      </Alert>
    );
  }

  const isLoading = statusLoading || statsLoading || incidentsLoading || metricsLoading;

  if (isLoading) {
    return <LoadingSpinner message="Loading system health data..." />;
  }

  const prepareChartData = () => {
    if (!metrics) return [];
    
    const groupedByTimestamp: Record<string, any> = {};
    
    metrics.forEach(metric => {
      const time = new Date(metric.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (!groupedByTimestamp[time]) {
        groupedByTimestamp[time] = { time };
      }
      
      groupedByTimestamp[time][metric.endpoint] = metric.responseTime;
    });
    
    return Object.values(groupedByTimestamp);
  };

  const chartData = prepareChartData();
  const endpoints = metrics ? Array.from(new Set(metrics.map(m => m.endpoint))) : [];
  const CHART_COLORS = ['#0B3D5D', '#019ADE', '#02BBB4', '#FFC557', '#FF595A', '#6B7280'];

  return (
    <div className="space-y-6" data-testid="system-health-tab">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy" data-testid="heading-system-health">System Health</h2>
          <p className="text-gray-600 mt-1">Monitor system status and performance metrics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4" />
          <span data-testid="text-last-updated">Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-checks">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-checks">{healthStats?.totalChecks || 0}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-successful-checks">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Successful Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-successful-checks">
              {healthStats?.successfulChecks || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-failed-checks">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-failed-checks">
              {healthStats?.failedChecks || 0}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-response-time">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-response-time">
              {formatResponseTime(healthStats?.averageResponseTime || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uptime Percentage */}
      <Card data-testid="card-uptime">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Overall Uptime</CardTitle>
          <Select value={uptimeRange} onValueChange={(value: '7' | '30') => setUptimeRange(value)}>
            <SelectTrigger className="w-32" data-testid="select-uptime-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" data-testid="option-uptime-7">Last 7 days</SelectItem>
              <SelectItem value="30" data-testid="option-uptime-30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-bold" data-testid="text-uptime-percentage">
              {healthStats?.uptimePercentage?.toFixed(2) || '0.00'}%
            </div>
            {healthStats && healthStats.uptimePercentage >= 99 ? (
              <TrendingUp className="w-6 h-6 text-green-500 mb-1" data-testid="icon-uptime-up" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500 mb-1" data-testid="icon-uptime-down" />
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">System availability over the selected period</p>
        </CardContent>
      </Card>

      {/* Endpoint Status Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4" data-testid="heading-endpoint-status">Monitored Endpoints</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {endpointStatuses?.map((endpoint, index) => (
            <Card key={index} data-testid={`card-endpoint-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium" data-testid={`text-endpoint-name-${index}`}>
                    {endpoint.endpoint}
                  </CardTitle>
                  {getStatusIcon(endpoint.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  {getStatusBadge(endpoint.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="text-sm font-medium" data-testid={`text-response-time-${index}`}>
                    {formatResponseTime(endpoint.responseTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Checked</span>
                  <span className="text-sm text-gray-500" data-testid={`text-last-checked-${index}`}>
                    {safeFormatDistanceToNow(endpoint.lastChecked)}
                  </span>
                </div>
                {endpoint.message && (
                  <p className="text-xs text-gray-500 pt-2 border-t" data-testid={`text-endpoint-message-${index}`}>
                    {endpoint.message}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Response Time Chart */}
      <Card data-testid="card-response-chart">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Response Times Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                {endpoints.map((endpoint, index) => (
                  <Line
                    key={endpoint}
                    type="monotone"
                    dataKey={endpoint}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={endpoint}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500" data-testid="text-no-chart-data">
              No metric data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Timeline */}
      <Card data-testid="card-incidents">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">Recent Incidents</CardTitle>
          <Select value={incidentRange} onValueChange={(value: '24' | '48') => setIncidentRange(value)}>
            <SelectTrigger className="w-32" data-testid="select-incident-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24" data-testid="option-incident-24">Last 24 hours</SelectItem>
              <SelectItem value="48" data-testid="option-incident-48">Last 48 hours</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {incidents && incidents.length > 0 ? (
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <div
                  key={incident.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-b-0"
                  data-testid={`incident-${index}`}
                >
                  <div className="mt-1">
                    {incident.status === 'down' ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" data-testid={`text-incident-endpoint-${index}`}>
                        {incident.endpoint}
                      </span>
                      {getStatusBadge(incident.status)}
                      {incident.resolved && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid={`badge-incident-resolved-${index}`}>
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1" data-testid={`text-incident-message-${index}`}>
                      {incident.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1" data-testid={`text-incident-timestamp-${index}`}>
                        <Clock className="w-3 h-3" />
                        {safeFormatDistanceToNow(incident.timestamp)}
                      </span>
                      {incident.duration && (
                        <span data-testid={`text-incident-duration-${index}`}>
                          Duration: {formatResponseTime(incident.duration)}
                        </span>
                      )}
                      {incident.resolvedAt && (
                        <span data-testid={`text-incident-resolved-at-${index}`}>
                          Resolved: {safeFormatDistanceToNow(incident.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500" data-testid="text-no-incidents">
              <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
              <p>No incidents in the selected time range</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
