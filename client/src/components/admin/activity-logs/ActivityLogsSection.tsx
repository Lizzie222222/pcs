import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Filter, X } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { format, parseISO } from "date-fns";

interface ActivityLogsSectionProps {
  activityPage: number;
  setActivityPage: (page: number | ((prev: number) => number)) => void;
  activityLimit: number;
  activityFilters: {
    actionType: string;
    userEmail: string;
    startDate: string;
    endDate: string;
  };
  setActivityFilters: (filters: any) => void;
}

export default function ActivityLogsSection({ 
  activityPage, 
  setActivityPage, 
  activityLimit, 
  activityFilters, 
  setActivityFilters 
}: ActivityLogsSectionProps) {
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams({
    page: activityPage.toString(),
    limit: activityLimit.toString(),
    ...(activityFilters.actionType !== 'all' && { actionType: activityFilters.actionType }),
    ...(activityFilters.userEmail && { userEmail: activityFilters.userEmail }),
    ...(activityFilters.startDate && { startDate: activityFilters.startDate }),
    ...(activityFilters.endDate && { endDate: activityFilters.endDate }),
  });

  const { data: activityLogsData, isLoading: isLoadingLogs } = useQuery<{
    logs: Array<{
      id: string;
      userId: string;
      actionType: string;
      actionDetails: Record<string, any> | null;
      ipAddress: string | null;
      createdAt: string;
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['/api/admin/activity-logs', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/admin/activity-logs?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return response.json();
    },
  });

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatActionDetails = (details: Record<string, any> | null) => {
    if (!details) return '-';
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';
    return entries
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              User Activity Logs
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Track and monitor user activities across the platform
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters Section */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <Select
                value={activityFilters.actionType}
                onValueChange={(value) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, actionType: value }))}
              >
                <SelectTrigger data-testid="select-action-type">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="evidence_submit">Evidence Submit</SelectItem>
                  <SelectItem value="evidence_approve">Evidence Approve</SelectItem>
                  <SelectItem value="evidence_reject">Evidence Reject</SelectItem>
                  <SelectItem value="school_create">School Create</SelectItem>
                  <SelectItem value="school_update">School Update</SelectItem>
                  <SelectItem value="user_create">User Create</SelectItem>
                  <SelectItem value="user_update">User Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Email Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Email
              </label>
              <Input
                placeholder="Search by email..."
                value={activityFilters.userEmail}
                onChange={(e) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, userEmail: e.target.value }))}
                data-testid="input-user-email"
              />
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={activityFilters.startDate}
                onChange={(e) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={activityFilters.endDate}
                onChange={(e) => setActivityFilters((prev: { actionType: string; userEmail: string; startDate: string; endDate: string }) => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setActivityPage(1);
                queryClient.invalidateQueries({ queryKey: ['/api/admin/activity-logs'] });
              }}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-apply-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setActivityFilters({
                  actionType: 'all',
                  userEmail: '',
                  startDate: '',
                  endDate: '',
                });
                setActivityPage(1);
              }}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Activity Logs Table */}
        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-activity-logs">
            <div className="animate-spin h-8 w-8 border-4 border-pcs_blue border-t-transparent rounded-full mr-3" />
            <span className="text-gray-600">Loading activity logs...</span>
          </div>
        ) : !activityLogsData || activityLogsData.logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Activity Logs"
            description="No user activity logs found matching your filters."
            data-testid="empty-activity-logs"
          />
        ) : (
          <div className="space-y-4">
            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-datetime">
                      Date/Time
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-user">
                      User
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-action">
                      Action Type
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-details">
                      Details
                    </th>
                    <th className="text-left p-3 font-medium text-gray-700" data-testid="header-ip">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogsData.logs.map((log) => (
                    <tr 
                      key={log.id} 
                      className="border-b hover:bg-gray-50"
                      data-testid={`activity-log-row-${log.id}`}
                    >
                      <td className="p-3 text-sm text-gray-700" data-testid={`log-datetime-${log.id}`}>
                        {format(parseISO(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="p-3 text-sm" data-testid={`log-user-${log.id}`}>
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.user?.firstName && log.user?.lastName
                              ? `${log.user.firstName} ${log.user.lastName}`
                              : log.user?.email || 'Unknown User'}
                          </div>
                          {log.user?.firstName && log.user?.lastName && log.user?.email && (
                            <div className="text-xs text-gray-500">{log.user.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3" data-testid={`log-action-${log.id}`}>
                        <Badge variant="outline" className="font-medium">
                          {formatActionType(log.actionType)}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-xs truncate" data-testid={`log-details-${log.id}`}>
                        {formatActionDetails(log.actionDetails)}
                      </td>
                      <td className="p-3 text-sm text-gray-600" data-testid={`log-ip-${log.id}`}>
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-gray-600" data-testid="text-pagination-info">
                Showing {((activityLogsData.page - 1) * activityLogsData.limit) + 1} to{' '}
                {Math.min(activityLogsData.page * activityLogsData.limit, activityLogsData.total)} of{' '}
                {activityLogsData.total} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                  disabled={activityLogsData.page === 1}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                <div className="flex items-center px-4 text-sm text-gray-700" data-testid="text-page-number">
                  Page {activityLogsData.page} of {activityLogsData.totalPages}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActivityPage(prev => Math.min(activityLogsData.totalPages, prev + 1))}
                  disabled={activityLogsData.page >= activityLogsData.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
