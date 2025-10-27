import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/states/LoadingSpinner";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: any;
  createdAt: string;
  user: {
    firstName: string | null;
    lastName: string | null;
  };
}

interface ActivityHistoryProps {
  targetType?: string;
  targetId?: string;
  limit?: number;
}

export function ActivityHistory({ 
  targetType, 
  targetId,
  limit = 100
}: ActivityHistoryProps) {
  const { data: logs, isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/audit-logs', { targetType, targetId, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (targetType) params.append('targetType', targetType);
      if (targetId) params.append('targetId', targetId);
      if (limit) params.append('limit', limit.toString());
      
      const res = await fetch(`/api/admin/audit-logs?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="activity-history-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-4" data-testid="activity-history-error">
        Failed to load activity history
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center" data-testid="activity-history-empty">
        No activity history available
      </div>
    );
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'created':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'edited':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'deleted':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'force_unlocked':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  const formatUserName = (user: { firstName: string | null; lastName: string | null }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return 'Unknown User';
  };

  const formatDetails = (details: any) => {
    if (!details) return null;
    
    // Format specific detail types
    if (details.reason) {
      return <span className="italic">Reason: {details.reason}</span>;
    }
    if (details.stage) {
      return <span>Stage: {details.stage}</span>;
    }
    
    // Generic JSON display for other details
    try {
      return <pre className="text-xs">{JSON.stringify(details, null, 2)}</pre>;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="activity-history">
      <h3 className="text-lg font-semibold">Activity History</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div 
            key={log.id} 
            className="flex items-start gap-3 text-sm border-l-2 border-muted pl-4 py-3 rounded-r hover:bg-muted/50 transition-colors"
            data-testid={`activity-log-${log.id}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium" data-testid={`activity-log-user-${log.id}`}>
                  {formatUserName(log.user)}
                </p>
                <span 
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}
                  data-testid={`activity-log-action-${log.id}`}
                >
                  {log.action}
                </span>
                <span className="text-muted-foreground text-xs">
                  {log.targetType}
                </span>
              </div>
              <p className="text-muted-foreground text-xs mb-1" data-testid={`activity-log-time-${log.id}`}>
                {format(new Date(log.createdAt), 'PPp')}
              </p>
              {log.details && (
                <div className="text-muted-foreground text-xs mt-2 bg-muted/30 p-2 rounded">
                  {formatDetails(log.details)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
