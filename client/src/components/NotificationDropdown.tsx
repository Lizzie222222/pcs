import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Check, FileText, Award, Info, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'new_resource' | 'resource_updated' | 'evidence_reviewed' | 'stage_completed' | 'general';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'new_resource':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'resource_updated':
      return <FileText className="h-5 w-5 text-orange-500" />;
    case 'evidence_reviewed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'stage_completed':
      return <Award className="h-5 w-5 text-purple-500" />;
    case 'general':
      return <Info className="h-5 w-5 text-gray-500" />;
    default:
      return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

interface NotificationDropdownProps {
  unreadCount: number;
}

export function NotificationDropdown({ unreadCount }: NotificationDropdownProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: open, // Only fetch when popover is open
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      // Invalidate both queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('PATCH', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate if actionUrl exists
    if (notification.actionUrl) {
      setOpen(false);
      setLocation(notification.actionUrl);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 hover:bg-gray-100 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pcs_blue"
          data-testid="button-notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-700" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center animate-pulse" 
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        data-testid="popover-notifications"
        aria-label="Notifications panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg" data-testid="text-notifications-title">
            Notifications
          </h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending || notifications.every(n => n.isRead)}
              className="text-xs text-blue-600 hover:text-blue-700"
              data-testid="button-mark-all-read"
              aria-label="Mark all notifications as read"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center" data-testid="loading-notifications">
              <div className="animate-pulse">
                <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Loading notifications...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center" data-testid="empty-notifications">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y" data-testid="list-notifications">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 transition-colors ${
                    notification.actionUrl ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${!notification.isRead ? 'bg-blue-50' : 'bg-white'}`}
                  data-testid={`notification-item-${notification.id}`}
                  role={notification.actionUrl ? 'button' : 'article'}
                  aria-label={`${notification.title}: ${notification.message}`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p 
                            className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}
                            data-testid={`notification-title-${notification.id}`}
                          >
                            {notification.title}
                          </p>
                          <p 
                            className="text-sm text-gray-600 mt-0.5"
                            data-testid={`notification-message-${notification.id}`}
                          >
                            {notification.message}
                          </p>
                          <p 
                            className="text-xs text-gray-500 mt-1"
                            data-testid={`notification-time-${notification.id}`}
                          >
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              disabled={markAsReadMutation.isPending}
                              data-testid={`button-mark-read-${notification.id}`}
                              aria-label="Mark as read"
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                            disabled={deleteNotificationMutation.isPending}
                            data-testid={`button-delete-${notification.id}`}
                            aria-label="Delete notification"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
