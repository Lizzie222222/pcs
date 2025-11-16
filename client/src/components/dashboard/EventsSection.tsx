import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Filter,
  ExternalLink,
  Download,
  PlayCircle,
  Quote,
} from "lucide-react";
import { format, isPast, isFuture, differenceInMinutes } from "date-fns";
import { useLocation } from "wouter";
import { getEventAvailableLanguages, LANGUAGE_FLAG_MAP } from "@/lib/languageUtils";
import { normalizeObjectStorageUrl } from "@/lib/urlNormalization";
import type { Event, EventRegistration } from "@/../../shared/schema";

// Extended Event type with properly typed translation fields
interface EventWithTranslations extends Omit<Event, 
  'titleTranslations' | 
  'descriptionTranslations' | 
  'youtubeVideoTranslations' | 
  'eventPackFileTranslations' | 
  'testimonialTranslations' | 
  'evidenceSubmissionText' | 
  'youtubeVideos' | 
  'eventPackFiles' | 
  'testimonials'
> {
  titleTranslations?: Record<string, string> | null;
  descriptionTranslations?: Record<string, string> | null;
  youtubeVideoTranslations?: Record<string, any[]> | null;
  eventPackFileTranslations?: Record<string, any[]> | null;
  testimonialTranslations?: Record<string, any[]> | null;
  evidenceSubmissionText?: Record<string, string> | null;
  youtubeVideos?: any[] | null;
  eventPackFiles?: any[] | null;
  testimonials?: any[] | null;
}

interface EventsSectionProps {
  schoolId: string;
  isActive: boolean;
  isAuthenticated: boolean;
}

// Helper function to generate .ics calendar file
function generateCalendarFile(event: EventWithTranslations) {
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plastic Clever Schools//Event//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@plasticscleverschools.org`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    event.location ? `LOCATION:${event.location}` : '',
    event.meetingLink ? `URL:${event.meetingLink}` : '',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper function to check event timing status
function getEventTimingStatus(event: EventWithTranslations) {
  const now = new Date();
  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  const minutesUntilStart = differenceInMinutes(startDate, now);
  const minutesUntilEnd = differenceInMinutes(endDate, now);
  
  if (now >= startDate && now <= endDate) {
    return { status: 'live', label: 'Live Now', color: 'bg-red-500' };
  } else if (minutesUntilStart > 0 && minutesUntilStart <= 30) {
    return { status: 'starting-soon', label: 'Starting Soon', color: 'bg-orange-500' };
  } else if (minutesUntilStart > 30 && minutesUntilStart <= 120) {
    return { status: 'upcoming', label: `Starts in ${Math.round(minutesUntilStart / 60)}h`, color: 'bg-blue-500' };
  }
  return null;
}

// Helper function to get event type badge color
function getEventTypeBadgeColor(eventType: string) {
  const colorMap: Record<string, string> = {
    workshop: 'bg-blue-500',
    webinar: 'bg-purple-500',
    community_event: 'bg-green-500',
    training: 'bg-orange-500',
    celebration: 'bg-pink-500',
    assembly: 'bg-indigo-500',
    other: 'bg-gray-500',
  };
  return colorMap[eventType] || 'bg-gray-500';
}

export default function EventsSection({ schoolId, isActive, isAuthenticated }: EventsSectionProps) {
  const { t } = useTranslation('dashboard');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventWithTranslations | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Fetch user data to get lastViewedEventsAt
  const { data: userData } = useQuery<{ lastViewedEventsAt?: string }>({
    queryKey: ['/api/auth/user'],
    enabled: isAuthenticated,
    retry: false,
  });

  // Events queries
  const { data: upcomingEvents = [], isLoading: upcomingEventsLoading } = useQuery<EventWithTranslations[]>({
    queryKey: ['/api/events/upcoming'],
    queryFn: async () => {
      const response = await fetch('/api/events/upcoming?limit=6');
      if (!response.ok) throw new Error('Failed to fetch upcoming events');
      return response.json();
    },
    enabled: isActive,
    retry: false,
  });

  const { data: filteredEvents = [], isLoading: filteredEventsLoading } = useQuery<EventWithTranslations[]>({
    queryKey: ['/api/events', eventFilter, showAllEvents],
    queryFn: async () => {
      const params = new URLSearchParams({ upcoming: 'true' });
      if (eventFilter !== 'all') {
        params.append('eventType', eventFilter);
      }
      const response = await fetch(`/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    enabled: isActive && showAllEvents,
    retry: false,
  });

  const { data: myEvents = [], isLoading: myEventsLoading } = useQuery<Array<EventRegistration & { event: EventWithTranslations }>>({
    queryKey: ['/api/my-events'],
    enabled: isActive && isAuthenticated,
    retry: false,
  });

  const { data: pastEvents = [], isLoading: pastEventsLoading } = useQuery<EventWithTranslations[]>({
    queryKey: ['/api/events/past'],
    queryFn: async () => {
      const response = await fetch('/api/events/past?limit=6');
      if (!response.ok) throw new Error('Failed to fetch past events');
      return response.json();
    },
    enabled: isActive,
    retry: false,
  });

  const { data: selectedEventDetails } = useQuery<EventWithTranslations & { registrations?: EventRegistration[], registrationsCount?: number }>({
    queryKey: ['/api/events', selectedEvent?.id],
    enabled: !!selectedEvent?.id && eventDetailOpen,
    retry: false,
  });

  // Event mutations
  const registerEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest('POST', `/api/events/${eventId}/register`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-events'] });
      toast({
        title: "Success",
        description: "Successfully registered for event!",
      });
      setEventDetailOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error?.message || "Failed to register for event",
        variant: "destructive",
      });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      return apiRequest('DELETE', `/api/events/registrations/${registrationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-events'] });
      toast({
        title: "Success",
        description: "Registration cancelled successfully",
      });
      setEventDetailOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to cancel registration",
        variant: "destructive",
      });
    },
  });

  const markEventsViewedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/events/mark-viewed', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  // Calculate count of new events
  const newEventsCount = upcomingEvents.filter(event => {
    if (!userData?.lastViewedEventsAt) return true; // All events are new if never viewed
    const lastViewed = new Date(userData.lastViewedEventsAt);
    const eventCreated = new Date(event.createdAt || event.startDateTime);
    return eventCreated > lastViewed;
  }).length;

  // Helper to check if an event is new
  const isEventNew = (event: EventWithTranslations) => {
    if (!userData?.lastViewedEventsAt) return true;
    const lastViewed = new Date(userData.lastViewedEventsAt);
    const eventCreated = new Date(event.createdAt || event.startDateTime);
    return eventCreated > lastViewed;
  };

  // Mark events as viewed when section becomes active
  useEffect(() => {
    if (isActive && isAuthenticated) {
      // Delay slightly to ensure user actually sees the notification
      const timer = setTimeout(() => {
        markEventsViewedMutation.mutate();
      }, 3000); // 3 seconds delay
      
      return () => clearTimeout(timer);
    }
  }, [isActive, isAuthenticated]);

  // Event handlers
  const handleEventClick = (event: EventWithTranslations) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };

  const handleRegisterForEvent = () => {
    if (selectedEvent) {
      registerEventMutation.mutate(selectedEvent.id);
    }
  };

  const handleCancelRegistration = () => {
    if (!selectedEventDetails) return;
    const userRegistration = myEvents.find(reg => 
      reg.eventId === selectedEvent?.id && 
      (reg.status === 'registered' || reg.status === 'waitlisted')
    );
    if (userRegistration) {
      cancelEventMutation.mutate(userRegistration.id);
    }
  };

  const handleAccessEvent = (event: EventWithTranslations, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (event.meetingLink) {
      window.open(event.meetingLink, '_blank');
    } else if (event.publicSlug) {
      window.open(`/events/${event.publicSlug}`, '_blank');
    }
  };

  const handleGoToEventPage = () => {
    if (selectedEvent?.publicSlug) {
      setLocation(`/events/${selectedEvent.publicSlug}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Filter and Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-navy mb-2">{t('events.header')}</h2>
            {newEventsCount > 0 && (
              <Badge className="bg-red-500 text-white px-2.5 py-1 text-sm" data-testid="badge-new-events">
                {newEventsCount} New
              </Badge>
            )}
          </div>
          <p className="text-gray-600">Join workshops, webinars, and community events</p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-48" data-testid="select-event-filter">
              <SelectValue placeholder={t('events.filter_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('events.filter_all')}</SelectItem>
              <SelectItem value="workshop">{t('events.filter_workshop')}</SelectItem>
              <SelectItem value="webinar">{t('events.filter_webinar')}</SelectItem>
              <SelectItem value="community_event">{t('events.filter_community')}</SelectItem>
              <SelectItem value="training">{t('events.filter_training')}</SelectItem>
              <SelectItem value="celebration">{t('events.filter_celebration')}</SelectItem>
              <SelectItem value="other">{t('events.filter_other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Upcoming Events Grid */}
      {upcomingEventsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-40 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : upcomingEvents.length === 0 ? (
        <Card className="shadow-lg border-0">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-pcs_blue/20 to-teal/20 rounded-full flex items-center justify-center">
                <Calendar className="h-12 w-12 text-pcs_blue" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-navy mb-3">{t('events.no_upcoming')}</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {t('events.no_upcoming_description')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(showAllEvents ? filteredEvents : upcomingEvents).map((event) => {
              const eventDate = new Date(event.startDateTime);
              const isEventPast = isPast(eventDate);
              const registrationsCount = (event as any).registrationsCount || 0;
              const spotsLeft = event.capacity ? event.capacity - registrationsCount : null;
              const isFull = event.capacity && registrationsCount >= event.capacity;
              const userRegistration = myEvents.find(reg => reg.eventId === event.id);
              const timingStatus = getEventTimingStatus(event);
              const availableLanguages = getEventAvailableLanguages(event);
              const showLanguages = availableLanguages.length > 1;
              const displayLanguages = availableLanguages.slice(0, 6);
              const remainingCount = availableLanguages.length - 6;
              
              return (
                <Card 
                  key={event.id} 
                  className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                  onClick={() => handleEventClick(event)}
                  data-testid={`event-card-${event.id}`}
                >
                  {event.imageUrl && event.imageUrl.trim() !== '' && (
                    <div className="w-full h-48 overflow-hidden relative">
                      <img 
                        src={normalizeObjectStorageUrl(event.imageUrl)} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 flex gap-2 flex-wrap justify-end">
                        {isEventNew(event) && (
                          <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg" data-testid={`badge-new-${event.id}`}>
                            ✨ New
                          </Badge>
                        )}
                        {timingStatus && (
                          <Badge className={`${timingStatus.color} text-white shadow-lg`} data-testid={`badge-timing-${event.id}`}>
                            {timingStatus.label}
                          </Badge>
                        )}
                        <Badge className={`
                          ${event.eventType === 'workshop' ? 'bg-blue-500' : ''}
                          ${event.eventType === 'webinar' ? 'bg-purple-500' : ''}
                          ${event.eventType === 'community_event' ? 'bg-green-500' : ''}
                          ${event.eventType === 'training' ? 'bg-orange-500' : ''}
                          ${event.eventType === 'celebration' ? 'bg-pink-500' : ''}
                          ${event.eventType === 'other' ? 'bg-gray-500' : ''}
                          text-white shadow-lg
                        `}>
                          {event.eventType.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-6 space-y-3">
                    <h3 className="text-lg font-bold text-navy group-hover:text-pcs_blue transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    {showLanguages && (
                      <div 
                        className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-gray-100 rounded-md border border-gray-200 w-fit"
                        data-testid={`badge-event-languages-${event.id}`}
                      >
                        {displayLanguages.map((langCode) => (
                          <span key={langCode} className="text-base" title={langCode}>
                            {LANGUAGE_FLAG_MAP[langCode] || '🏳️'}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span 
                            className="text-xs text-gray-600 ml-1"
                            data-testid={`text-language-count-${event.id}`}
                          >
                            +{remainingCount} more
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                        <span>{format(eventDate, 'PPP')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                        <span>{format(eventDate, 'p')} (your time)</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          {event.isVirtual ? (
                            <Video className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                          ) : (
                            <MapPin className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                          )}
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}
                      {event.capacity && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-pcs_blue flex-shrink-0" />
                          {isFull && !event.waitlistEnabled ? (
                            <span className="text-red-600 font-semibold">Event Full</span>
                          ) : isFull && event.waitlistEnabled ? (
                            <span className="text-orange-600 font-semibold">Waitlist Available</span>
                          ) : (
                            <span>{spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left</span>
                          )}
                        </div>
                      )}
                    </div>
                    {userRegistration && (
                      <Badge className={`
                        ${userRegistration.status === 'registered' ? 'bg-green-500' : ''}
                        ${userRegistration.status === 'waitlisted' ? 'bg-orange-500' : ''}
                        ${userRegistration.status === 'attended' ? 'bg-blue-500' : ''}
                        text-white
                      `} data-testid={`badge-registration-status-${event.id}`}>
                        {userRegistration.status === 'registered' && 'Registered'}
                        {userRegistration.status === 'waitlisted' && 'Waitlisted'}
                        {userRegistration.status === 'attended' && 'Attended'}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!showAllEvents && upcomingEvents.length >= 6 && (
            <div className="text-center pt-6">
              <Button
                onClick={() => setShowAllEvents(true)}
                className="bg-pcs_blue hover:bg-pcs_blue/90 text-white px-8 py-6 text-lg shadow-lg"
                data-testid="button-view-all-events"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                {t('events.view_all_button')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* My Events Section */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-navy mb-6">{t('events.my_events')}</h2>
        {myEventsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-lg border-0">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : myEvents.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('events.no_registered')}</h3>
              <p className="text-gray-500">You haven't registered for any events yet. Browse upcoming events and join us!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {(() => {
              const sortedEvents = [...myEvents].sort((a, b) => {
                const dateA = new Date(a.event.startDateTime);
                const dateB = new Date(b.event.startDateTime);
                const nowDate = new Date();
                const aIsPast = dateA < nowDate;
                const bIsPast = dateB < nowDate;
                
                if (aIsPast && !bIsPast) return 1;
                if (!aIsPast && bIsPast) return -1;
                return dateA.getTime() - dateB.getTime();
              });

              return sortedEvents.map((registration) => {
                const eventDate = new Date(registration.event.startDateTime);
                const isEventPast = isPast(eventDate);
                const isEventFuture = isFuture(eventDate);
                const timingStatus = getEventTimingStatus(registration.event);
                const hasAccess = registration.event.meetingLink || registration.event.publicSlug;
                const availableLanguages = getEventAvailableLanguages(registration.event);
                const showLanguages = availableLanguages.length > 1;
                const displayLanguages = availableLanguages.slice(0, 6);
                const remainingCount = availableLanguages.length - 6;
                
                return (
                  <Card 
                    key={registration.id} 
                    className="shadow-lg border-0 hover:shadow-xl transition-shadow"
                    data-testid={`my-event-${registration.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEventClick(registration.event)}>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-bold text-navy">{registration.event.title}</h3>
                            {timingStatus && (
                              <Badge className={`${timingStatus.color} text-white`} data-testid={`badge-my-event-timing-${registration.id}`}>
                                {timingStatus.label}
                              </Badge>
                            )}
                            <Badge className={`
                              ${registration.status === 'registered' ? 'bg-green-500' : ''}
                              ${registration.status === 'waitlisted' ? 'bg-orange-500' : ''}
                              ${registration.status === 'attended' ? 'bg-blue-500' : ''}
                              ${registration.status === 'cancelled' ? 'bg-gray-500' : ''}
                              text-white
                            `} data-testid={`badge-status-${registration.id}`}>
                              {registration.status === 'registered' && 'Registered'}
                              {registration.status === 'waitlisted' && 'Waitlisted'}
                              {registration.status === 'attended' && 'Attended'}
                              {registration.status === 'cancelled' && 'Cancelled'}
                            </Badge>
                          </div>
                          {showLanguages && (
                            <div 
                              className="flex items-center gap-1 mb-2 flex-wrap px-2 py-1.5 bg-gray-100 rounded-md border border-gray-200 w-fit"
                              data-testid={`badge-event-languages-${registration.event.id}`}
                            >
                              {displayLanguages.map((langCode) => (
                                <span key={langCode} className="text-base" title={langCode}>
                                  {LANGUAGE_FLAG_MAP[langCode] || '🏳️'}
                                </span>
                              ))}
                              {remainingCount > 0 && (
                                <span 
                                  className="text-xs text-gray-600 ml-1"
                                  data-testid={`text-language-count-${registration.event.id}`}
                                >
                                  +{remainingCount} more
                                </span>
                              )}
                            </div>
                          )}
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-pcs_blue" />
                              <span>{format(eventDate, 'PPP')} at {format(eventDate, 'p')} (your time)</span>
                            </div>
                            {registration.event.location && (
                              <div className="flex items-center gap-2">
                                {registration.event.isVirtual ? (
                                  <Video className="h-4 w-4 text-pcs_blue" />
                                ) : (
                                  <MapPin className="h-4 w-4 text-pcs_blue" />
                                )}
                                <span>{registration.event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          {/* Access Button - Always show for registered users */}
                          {hasAccess && registration.status === 'registered' && (
                            <Button
                              size="sm"
                              onClick={(e) => handleAccessEvent(registration.event, e)}
                              className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                              data-testid={`button-access-event-${registration.id}`}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              {registration.event.meetingLink ? 'Join Meeting' : 'View Event'}
                            </Button>
                          )}
                          
                          {/* Cancel Button - Only for future events */}
                          {isEventFuture && registration.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEventMutation.mutate(registration.id);
                              }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300"
                              data-testid={`button-cancel-${registration.id}`}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Previous Events Section */}
      {pastEvents.length > 0 && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-navy mb-6">Previous Events</h2>
          <p className="text-gray-600 mb-6">Access recordings and resources from past events</p>
          
          {pastEventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-lg border-0">
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-40 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event) => {
                const eventDate = new Date(event.startDateTime);
                const userRegistration = myEvents.find(reg => reg.eventId === event.id);
                
                return (
                  <Card 
                    key={event.id} 
                    className="shadow-lg border-0 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                    onClick={() => handleEventClick(event)}
                    data-testid={`past-event-card-${event.id}`}
                  >
                    {event.imageUrl && event.imageUrl.trim() !== '' && (
                      <div className="w-full h-48 overflow-hidden relative">
                        <img 
                          src={normalizeObjectStorageUrl(event.imageUrl)} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-90"
                        />
                        <div className="absolute top-3 right-3 flex gap-2 flex-wrap justify-end">
                          <Badge className="bg-gray-700 text-white shadow-lg">
                            {event.eventType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-gray-900/90 text-white shadow-lg">
                            PAST EVENT
                          </Badge>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-6 space-y-3">
                      <h3 className="text-lg font-bold text-navy group-hover:text-pcs_blue transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <span>{format(eventDate, 'PPP')}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            {event.isVirtual ? (
                              <Video className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}
                      </div>
                      {userRegistration && userRegistration.status === 'attended' && (
                        <Badge className="bg-blue-500 text-white" data-testid={`badge-attended-${event.id}`}>
                          ✓ Attended
                        </Badge>
                      )}
                      <div className="pt-2">
                        <span className="text-sm text-gray-700 group-hover:text-pcs_blue font-semibold inline-flex items-center gap-2">
                          <PlayCircle className="h-4 w-4" />
                          View Recording & Resources
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && selectedEventDetails && (
        <Dialog open={eventDetailOpen} onOpenChange={setEventDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0" data-testid="dialog-event-detail">
            <div className="px-6 pt-6 pb-4 border-b">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-navy">{selectedEvent.title}</DialogTitle>
                
                {/* Event Type Badge */}
                <div className="flex items-center gap-2 pt-2">
                  <Badge 
                    className={`${getEventTypeBadgeColor(selectedEvent.eventType)} text-white`}
                    data-testid="badge-event-type"
                  >
                    {selectedEvent.eventType.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Tags Section */}
                {selectedEvent.tags && Array.isArray(selectedEvent.tags) && selectedEvent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2" data-testid="section-tags">
                    {selectedEvent.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs"
                        data-testid={`badge-tag-${index}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <DialogDescription>
                  {selectedEvent.description || "Learn more about this event"}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedEvent.imageUrl && (
                <div className="w-full h-64 overflow-hidden rounded-lg mb-6">
                  <img 
                    src={selectedEvent.imageUrl} 
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-pcs_blue" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-semibold">{format(new Date(selectedEvent.startDateTime), 'dd/MM/yyyy')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-pcs_blue" />
                  <div>
                    <p className="text-xs text-gray-500">Time (your timezone)</p>
                    <p className="font-semibold">{format(new Date(selectedEvent.startDateTime), 'HH:mm')}</p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {selectedEvent.isVirtual ? (
                      <Video className="h-5 w-5 text-pcs_blue" />
                    ) : (
                      <MapPin className="h-5 w-5 text-pcs_blue" />
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-semibold">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.capacity && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-pcs_blue" />
                    <div>
                      <p className="text-xs text-gray-500">Capacity</p>
                      <p className="font-semibold">
                        {selectedEventDetails.registrationsCount || 0} / {selectedEvent.capacity}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Resources Section */}
              {selectedEvent.eventPackFiles && Array.isArray(selectedEvent.eventPackFiles) && selectedEvent.eventPackFiles.length > 0 && (
                <div className="space-y-3" data-testid="section-resources">
                  <h3 className="text-lg font-semibold text-navy">Event Resources</h3>
                  <div className="space-y-2">
                    {selectedEvent.eventPackFiles.map((file: any, index: number) => (
                      <Card key={index} className="p-4" data-testid={`resource-${index}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{file.name}</h4>
                            {file.description && (
                              <p className="text-xs text-gray-600 mt-1">{file.description}</p>
                            )}
                            {file.size && (
                              <p className="text-xs text-gray-500 mt-1">{file.size}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.url, '_blank')}
                            data-testid={`button-download-resource-${index}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube Videos Section */}
              {selectedEvent.youtubeVideos && Array.isArray(selectedEvent.youtubeVideos) && selectedEvent.youtubeVideos.length > 0 && (
                <div className="space-y-3" data-testid="section-videos">
                  <h3 className="text-lg font-semibold text-navy">Watch</h3>
                  <div className="space-y-4">
                    {selectedEvent.youtubeVideos.map((video: any, index: number) => {
                      const videoId = video.videoId || video.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
                      
                      return (
                        <div key={index} className="space-y-2" data-testid={`video-${index}`}>
                          {video.title && (
                            <h4 className="font-semibold text-sm">{video.title}</h4>
                          )}
                          {videoId ? (
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe
                                className="absolute top-0 left-0 w-full h-full rounded-lg"
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={video.title || 'Event Video'}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                data-testid={`iframe-video-${index}`}
                              />
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => window.open(video.url, '_blank')}
                              className="w-full"
                              data-testid={`button-video-link-${index}`}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Watch Video
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Testimonials Section */}
              {selectedEvent.testimonials && Array.isArray(selectedEvent.testimonials) && selectedEvent.testimonials.length > 0 && (
                <div className="space-y-3" data-testid="section-testimonials">
                  <h3 className="text-lg font-semibold text-navy">What Participants Say</h3>
                  <div className="space-y-3">
                    {selectedEvent.testimonials.map((testimonial: any, index: number) => (
                      <Card key={index} className="p-4" data-testid={`testimonial-${index}`}>
                        <div className="flex gap-3">
                          {testimonial.imageUrl && (
                            <div className="flex-shrink-0">
                              <img 
                                src={testimonial.imageUrl} 
                                alt={testimonial.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-2">
                              <Quote className="h-4 w-4 text-pcs_blue flex-shrink-0 mt-1" />
                              <p className="text-sm text-gray-700 italic">{testimonial.text}</p>
                            </div>
                            <div className="text-xs">
                              <p className="font-semibold text-navy">{testimonial.name}</p>
                              {testimonial.role && (
                                <p className="text-gray-600">{testimonial.role}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Footer with buttons - outside scrollable area */}
            <div className="border-t px-6 py-4 bg-white">
              <div className="flex gap-2 flex-wrap mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateCalendarFile(selectedEvent)}
                  data-testid="button-add-to-calendar"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Add to Calendar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoToEventPage}
                  disabled={!selectedEvent.publicSlug}
                  data-testid="button-go-to-event-page"
                  title={!selectedEvent.publicSlug ? "This event doesn't have a public page yet" : "View event details page"}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Go to Event Page
                </Button>
              </div>
              
              <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEventDetailOpen(false)}
                data-testid="button-close-event-detail"
              >
                Close
              </Button>
              {(() => {
                const userRegistration = myEvents.find(reg => reg.eventId === selectedEvent.id);
                const eventDate = new Date(selectedEvent.startDateTime);
                const isEventPast = isPast(eventDate);
                const registrationsCount = selectedEventDetails.registrationsCount || 0;
                const isFull = selectedEvent.capacity && registrationsCount >= selectedEvent.capacity;

                if (isEventPast) {
                  return (
                    <Button disabled data-testid="button-event-past">
                      Event has passed
                    </Button>
                  );
                }

                if (userRegistration && (userRegistration.status === 'registered' || userRegistration.status === 'waitlisted')) {
                  return (
                    <Button
                      variant="destructive"
                      onClick={handleCancelRegistration}
                      data-testid="button-cancel-registration"
                    >
                      Cancel Registration
                    </Button>
                  );
                }

                if (isFull && !selectedEvent.waitlistEnabled) {
                  return (
                    <Button disabled data-testid="button-event-full">
                      Event Full
                    </Button>
                  );
                }

                return (
                  <Button
                    onClick={handleRegisterForEvent}
                    className="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                    data-testid="button-register-event"
                  >
                    {isFull ? 'Join Waitlist' : 'Register for Event'}
                  </Button>
                );
              })()}
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
