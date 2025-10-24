import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, BookOpen, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Notification {
  id: string;
  schoolId: string;
  type: 'new_resource' | 'evidence_reviewed' | 'event_reminder' | 'general';
  title: string;
  message: string;
  actionUrl?: string;
  resourceId?: string;
  isRead: boolean;
  createdAt: string;
}

interface ResourceNotificationBannerProps {
  isAuthenticated: boolean;
}

export default function ResourceNotificationBanner({ isAuthenticated }: ResourceNotificationBannerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Filter for unread resource notifications only
  const unreadResourceNotifications = notifications.filter((notification) => {
    if (notification.isRead) return false;
    if (dismissed.includes(notification.id)) return false;
    // Show new_resource notifications and other relevant types
    return notification.type === 'new_resource' || notification.type === 'general';
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markAsReadMutation.mutate(notification.id);
    
    // Navigate to appropriate page
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    } else if (notification.resourceId) {
      setLocation('/resources');
    } else {
      setLocation('/resources');
    }
  };

  const handleDismiss = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed([...dismissed, notificationId]);
    markAsReadMutation.mutate(notificationId);
  };

  if (unreadResourceNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {unreadResourceNotifications.map((notification) => {
        const createdDate = new Date(notification.createdAt);
        const isNew = Date.now() - createdDate.getTime() < 24 * 60 * 60 * 1000; // 24 hours

        return (
          <Alert
            key={notification.id}
            className={`${
              notification.type === 'new_resource' 
                ? 'bg-teal/10 border-teal' 
                : 'bg-blue-50 border-blue-500'
            } relative cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => handleNotificationClick(notification)}
            data-testid={`resource-notification-${notification.id}`}
          >
            <Bell className={`h-5 w-5 ${
              notification.type === 'new_resource' ? 'text-teal' : 'text-blue-600'
            } ${isNew ? 'animate-pulse' : ''}`} />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <p className={`font-semibold ${
                  notification.type === 'new_resource' ? 'text-teal' : 'text-blue-900'
                } mb-1 flex items-center gap-2`}>
                  {notification.type === 'new_resource' && <BookOpen className="h-4 w-4" />}
                  {notification.title}
                </p>
                <p className={`${
                  notification.type === 'new_resource' ? 'text-teal/80' : 'text-blue-800'
                } text-sm`}>
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(createdDate, 'PPp')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotificationClick(notification);
                  }}
                  className={`${
                    notification.type === 'new_resource'
                      ? 'bg-teal hover:bg-teal/90'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                  data-testid={`button-view-notification-${notification.id}`}
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  View Resources
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleDismiss(notification.id, e)}
                  className={
                    notification.type === 'new_resource'
                      ? 'text-teal hover:text-teal/80'
                      : 'text-blue-600 hover:text-blue-800'
                  }
                  data-testid={`button-dismiss-notification-${notification.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
