import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollaboration } from '@/hooks/useCollaboration';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import {
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Edit3,
  Calendar,
  School,
  UserCog,
  BookOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const activityIcons = {
  idle: Eye,
  viewing_dashboard: Eye,
  reviewing_evidence: FileText,
  editing_case_study: Edit3,
  editing_event: Calendar,
  managing_schools: School,
  managing_users: UserCog,
  managing_resources: BookOpen,
};

const activityLabels = {
  idle: 'Idle',
  viewing_dashboard: 'Viewing Dashboard',
  reviewing_evidence: 'Reviewing Evidence',
  editing_case_study: 'Editing Case Study',
  editing_event: 'Editing Event',
  managing_schools: 'Managing Schools',
  managing_users: 'Managing Users',
  managing_resources: 'Managing Resources',
};

export default function CollaborationSidebar() {
  const { user } = useAuth();
  const { connectionState, onlineUsers } = useCollaboration();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...onlineUsers].sort((a, b) => {
      // Current user first
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      // Then by activity (active users first)
      if (a.currentActivity !== 'idle' && b.currentActivity === 'idle') return -1;
      if (a.currentActivity === 'idle' && b.currentActivity !== 'idle') return 1;
      // Then by name
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || '';
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email || '';
      return aName.localeCompare(bName);
    });
  }, [onlineUsers, user?.id]);

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-20 z-40 bg-white dark:bg-gray-800 shadow-lg border-l border-gray-200 dark:border-gray-700 rounded-l-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="p-3"
          data-testid="button-expand-sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            {onlineUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {onlineUsers.length}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-20 z-40 w-80 bg-white dark:bg-gray-800 shadow-lg border-l border-gray-200 dark:border-gray-700 rounded-l-lg max-h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Online Admins
          </h3>
          <Badge variant="secondary" data-testid="badge-online-count">
            {onlineUsers.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(true)}
          data-testid="button-collapse-sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {connectionState === 'connecting' && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              Connecting...
            </div>
          )}
          
          {connectionState === 'disconnected' && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              Disconnected
            </div>
          )}

          {connectionState === 'connected' && sortedUsers.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No other users online
            </div>
          )}

          {connectionState === 'connected' && sortedUsers.map((onlineUser) => {
            const isCurrentUser = onlineUser.userId === user?.id;
            const ActivityIcon = activityIcons[onlineUser.currentActivity] || Eye;
            const displayName = `${onlineUser.firstName || ''} ${onlineUser.lastName || ''}`.trim() || onlineUser.email || 'Unknown User';
            const connectedTime = onlineUser.connectedAt
              ? formatDistanceToNow(new Date(onlineUser.connectedAt), { addSuffix: true })
              : '';

            return (
              <div
                key={onlineUser.userId}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                data-testid={`user-${onlineUser.userId}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    seed={onlineUser.email || onlineUser.userId}
                    size={40}
                    alt={displayName}
                    dataTestId={`avatar-${onlineUser.userId}`}
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" data-testid={`status-${onlineUser.userId}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" data-testid={`name-${onlineUser.userId}`}>
                      {displayName}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs" data-testid="badge-you">
                        You
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <ActivityIcon className="h-3 w-3" />
                    <span className="truncate" data-testid={`activity-${onlineUser.userId}`}>
                      {activityLabels[onlineUser.currentActivity]}
                    </span>
                  </div>
                  
                  {connectedTime && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1" data-testid={`connected-time-${onlineUser.userId}`}>
                      Connected {connectedTime}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' : 
            connectionState === 'connecting' ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} data-testid="connection-indicator" />
          <span>
            {connectionState === 'connected' ? 'Connected' : 
             connectionState === 'connecting' ? 'Connecting...' : 
             'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
