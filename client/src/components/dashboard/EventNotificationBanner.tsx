import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Bell, PlayCircle, X } from "lucide-react";
import { differenceInMinutes, format } from "date-fns";
import type { Event, EventRegistration } from "@/../../shared/schema";
import { useState } from "react";

interface EventNotificationBannerProps {
  isAuthenticated: boolean;
}

export default function EventNotificationBanner({ isAuthenticated }: EventNotificationBannerProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: myEvents = [] } = useQuery<Array<EventRegistration & { event: Event }>>({
    queryKey: ['/api/my-events'],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 60000, // Refetch every minute to keep notifications fresh
  });

  // Find events that are starting soon (within 30 minutes) or live now
  const upcomingEvents = myEvents.filter((registration) => {
    if (registration.status !== 'registered') return false;
    if (dismissed.includes(registration.event.id)) return false;

    const now = new Date();
    const startDate = new Date(registration.event.startDateTime);
    const endDate = new Date(registration.event.endDateTime);
    const minutesUntilStart = differenceInMinutes(startDate, now);

    // Show if event is happening now or starting within 30 minutes
    return (now >= startDate && now <= endDate) || (minutesUntilStart > 0 && minutesUntilStart <= 30);
  });

  const handleAccessEvent = (event: Event) => {
    if (event.meetingLink) {
      window.open(event.meetingLink, '_blank');
    } else if (event.publicSlug) {
      window.open(`/event-live/${event.publicSlug}`, '_blank');
    }
  };

  const handleDismiss = (eventId: string) => {
    setDismissed([...dismissed, eventId]);
  };

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {upcomingEvents.map((registration) => {
        const now = new Date();
        const startDate = new Date(registration.event.startDateTime);
        const endDate = new Date(registration.event.endDateTime);
        const minutesUntilStart = differenceInMinutes(startDate, now);
        const isLive = now >= startDate && now <= endDate;
        const hasAccess = registration.event.meetingLink || registration.event.publicSlug;

        return (
          <Alert
            key={registration.event.id}
            className={`${isLive ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'} relative`}
            data-testid={`event-notification-${registration.event.id}`}
          >
            <Bell className={`h-5 w-5 ${isLive ? 'text-red-600 animate-pulse' : 'text-orange-600'}`} />
            <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1">
                <p className={`font-semibold ${isLive ? 'text-red-900' : 'text-orange-900'} mb-1`}>
                  {isLive ? '🔴 Event Live Now!' : '⏰ Event Starting Soon!'}
                </p>
                <p className={`${isLive ? 'text-red-800' : 'text-orange-800'}`}>
                  <span className="font-medium">{registration.event.title}</span>
                  {isLive ? (
                    <span> - Happening now until {format(endDate, 'p')}</span>
                  ) : (
                    <span> - Starts in {minutesUntilStart} minute{minutesUntilStart !== 1 ? 's' : ''} at {format(startDate, 'p')}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {hasAccess && (
                  <Button
                    size="sm"
                    onClick={() => handleAccessEvent(registration.event)}
                    className={`${isLive 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                    } text-white`}
                    data-testid={`button-join-notification-${registration.event.id}`}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    {registration.event.meetingLink ? 'Join Meeting' : 'View Event'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(registration.event.id)}
                  className={isLive ? 'text-red-600 hover:text-red-800' : 'text-orange-600 hover:text-orange-800'}
                  data-testid={`button-dismiss-notification-${registration.event.id}`}
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
