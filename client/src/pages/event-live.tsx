import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Calendar, MapPin, Users, ExternalLink, CheckCircle, Lock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";

interface YoutubeVideo {
  title: string;
  url: string;
  description?: string;
}

interface EventPackFile {
  title: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  description?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role?: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  isVirtual: boolean;
  meetingLink?: string;
  imageUrl?: string;
  publicSlug?: string;
  youtubeVideos?: YoutubeVideo[];
  eventPackFiles?: EventPackFile[];
  testimonials?: Testimonial[];
  isPreRecorded?: boolean;
  recordingAvailableFrom?: string;
  pagePublishedStatus?: 'draft' | 'coming_soon' | 'published';
  accessType?: 'open' | 'closed';
}

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(url);
  
  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Invalid YouTube URL</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
        data-testid={`iframe-youtube-${title.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  );
}

// Footer component for event pages
function EventFooter({ t }: { t: any }) {
  return (
    <footer className="bg-navy text-white py-12 mt-auto">
      <div className="container-width">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <img 
                src={whiteLogoUrl} 
                alt="Plastic Clever Schools Logo" 
                className="w-48 h-auto max-w-full object-contain" 
              />
            </div>
            <p className="text-gray-300 text-sm sm:text-base">
              {t('footer.description')}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.program_title')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/#how-it-works" className="hover:text-teal transition-colors">{t('footer.program_how_it_works')}</a></li>
              <li><a href="/resources" className="hover:text-teal transition-colors">{t('footer.program_resources')}</a></li>
              <li><a href="/inspiration" className="hover:text-teal transition-colors">{t('footer.program_success_stories')}</a></li>
              <li><a href="/#how-it-works" className="hover:text-teal transition-colors">{t('footer.program_award_criteria')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.support_title')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/help-center" className="hover:text-teal transition-colors">{t('footer.support_help_center')}</a></li>
              <li><a href="/contact" className="hover:text-teal transition-colors">{t('footer.support_contact_us')}</a></li>
              <li><a href="/schools-map" className="hover:text-teal transition-colors">{t('footer.support_community')}</a></li>
              <li><a href="/resources" className="hover:text-teal transition-colors">{t('footer.support_training')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.connect_title')}</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/register" className="hover:text-teal transition-colors">{t('footer.connect_newsletter')}</a></li>
              <li><a href="https://www.instagram.com/plasticcleverschools/" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">{t('footer.connect_social_media')}</a></li>
              <li><a href="/events" className="hover:text-teal transition-colors">{t('footer.connect_events')}</a></li>
              <li><a href="/#partners" className="hover:text-teal transition-colors">{t('footer.connect_partners')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>
            {t('footer.copyright')} | 
            <a href="https://commonseas.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors ml-1">{t('footer.privacy')}</a> | 
            <a href="/terms" className="hover:text-teal transition-colors ml-1">{t('footer.terms')}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function EventLivePage() {
  const params = useParams() as { slug: string };
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('landing');
  
  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ['/api/events/slug', params.slug],
    queryFn: async () => {
      // Try slug first
      let res = await fetch(`/api/events/slug/${params.slug}`);
      
      // If 404, try as direct ID (for events without publicSlug)
      if (res.status === 404) {
        res = await fetch(`/api/events/${params.slug}`);
      }
      
      if (!res.ok) {
        if (res.status === 404) throw new Error('Event not found');
        throw new Error('Failed to fetch event');
      }
      return res.json();
    },
    retry: false,
  });

  // Check if user is registered for this event
  const { data: userRegistration } = useQuery({
    queryKey: ['/api/events', event?.id, 'registration'],
    queryFn: async () => {
      if (!event?.id || !isAuthenticated) return null;
      const res = await fetch(`/api/events/${event.id}/registration`);
      // 404 means not registered, which is expected
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      // Only return data if it has a valid status that's not cancelled
      return data && data.status && data.status !== 'cancelled' ? data : null;
    },
    enabled: !!event?.id && isAuthenticated,
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!event?.id) throw new Error('No event ID');
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to register');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: data.message || "Successfully registered for event",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event?.id, 'registration'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-events'] });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for event",
        variant: "destructive",
      });
    },
  });

  const handleRegister = () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    registerMutation.mutate();
  };

  // Click tracking mutation
  const trackClickMutation = useMutation({
    mutationFn: async () => {
      if (!event?.id) return;
      const res = await fetch(`/api/events/${event.id}/track-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Download tracking mutation
  const trackDownloadMutation = useMutation({
    mutationFn: async (fileName: string) => {
      if (!event?.id) return;
      const res = await fetch(`/api/events/${event.id}/track-download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fileName }),
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const handleMeetingLinkClick = () => {
    trackClickMutation.mutate();
  };

  const handleDownloadClick = (fileName: string) => {
    trackDownloadMutation.mutate(fileName);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading event..." />
        </div>
        <EventFooter t={t} />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-3xl font-bold mb-4" data-testid="text-error-title">Event Not Found</h1>
          <p className="text-gray-600 mb-6" data-testid="text-error-message">
            The event you're looking for doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate('/')} data-testid="button-home">
            Go Home
          </Button>
        </div>
        <EventFooter t={t} />
      </div>
    );
  }

  // Check if page is in coming soon status
  if (event.pagePublishedStatus === 'coming_soon') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pcs_blue/10 via-teal/5 to-ocean-blue/10 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="max-w-2xl text-center">
            {event.imageUrl && (
              <div className="mb-8">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="max-h-32 mx-auto object-contain drop-shadow-lg"
                  data-testid="img-coming-soon-logo"
                />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900" data-testid="text-coming-soon-title">
              {event.title}
            </h1>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6 border-2 border-pcs_blue/20">
              <p className="text-2xl font-semibold text-pcs_blue mb-4" data-testid="text-coming-soon-message">
                Coming Soon!
              </p>
              <p className="text-lg text-gray-700 leading-relaxed" data-testid="text-coming-soon-description">
                {event.description}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 bg-pcs_blue/10 px-4 py-2 rounded-full">
                  <Calendar className="w-5 h-5 text-pcs_blue" />
                  <span className="font-medium text-gray-800">{format(new Date(event.startDateTime), 'MMMM d, yyyy')}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-8" data-testid="text-coming-soon-check-back">
              This event page is not yet available. Check back soon for more details!
            </p>
            <Button onClick={() => navigate('/')} size="lg" className="bg-pcs_blue hover:bg-pcs_blue/90" data-testid="button-coming-soon-home">
              Back to Home
            </Button>
          </div>
        </div>
        <EventFooter t={t} />
      </div>
    );
  }

  // Check access control for closed events
  if (event.accessType === 'closed' && !userRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-white to-teal/5 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-3xl w-full">
            {/* Event Image */}
            {event.imageUrl && (
              <div className="mb-8 text-center">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="max-h-40 mx-auto object-contain drop-shadow-2xl rounded-lg"
                  data-testid="img-restricted-logo"
                />
              </div>
            )}

            {/* Event Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-navy text-center leading-tight" data-testid="text-restricted-title">
              {event.title}
            </h1>

            {/* Event Details Preview */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                <Calendar className="w-4 h-4 text-pcs_blue" />
                <span className="text-sm font-medium text-gray-700">
                  {format(new Date(event.startDateTime), 'MMMM d, yyyy • h:mm a')}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                  <MapPin className="w-4 h-4 text-teal" />
                  <span className="text-sm font-medium text-gray-700">
                    {event.isVirtual ? 'Virtual Event' : event.location}
                  </span>
                </div>
              )}
            </div>

            {/* Registration Required Card */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-6 border-2 border-ocean-blue/20 relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-ocean-blue/5 to-teal/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-teal/5 to-ocean-blue/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
              
              <div className="relative text-center">
                {/* Lock Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-ocean-blue to-pcs_blue rounded-full mb-6 shadow-xl">
                  <Lock className="w-10 h-10 text-white" />
                </div>

                {/* Heading */}
                <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4" data-testid="text-restricted-message">
                  Registration Required
                </h2>

                {/* Description */}
                <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto" data-testid="text-restricted-description">
                  This is an exclusive event. You must be registered and approved to access the event content and materials.
                </p>

                {/* Call to Action */}
                {!isAuthenticated ? (
                  <div className="space-y-6">
                    <div className="bg-ocean-blue/10 border-l-4 border-ocean-blue rounded-lg p-4 mb-6">
                      <p className="text-gray-700 text-left">
                        <strong className="text-navy">Ready to join?</strong><br />
                        Sign in to your account and register for this event to unlock exclusive access.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/register')} 
                      size="lg" 
                      className="bg-gradient-to-r from-ocean-blue to-pcs_blue hover:from-ocean-blue/90 hover:to-pcs_blue/90 text-white px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                      data-testid="button-restricted-signin"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Sign In to Register
                    </Button>
                    <p className="text-sm text-gray-500 mt-4">
                      Don't have an account? <a href="/register" className="text-pcs_blue hover:underline font-semibold">Create one now</a>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-teal/10 border-l-4 border-teal rounded-lg p-4 mb-6">
                      <p className="text-gray-700 text-left">
                        <strong className="text-navy">You're almost there!</strong><br />
                        Complete your registration for this event to access all content and participate.
                      </p>
                    </div>
                    <Button 
                      onClick={handleRegister} 
                      disabled={registerMutation.isPending} 
                      size="lg" 
                      className="bg-gradient-to-r from-teal to-ocean-blue hover:from-teal/90 hover:to-ocean-blue/90 text-white px-8 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      data-testid="button-restricted-register"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <div className="animate-spin w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Registering...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Register for This Event
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <div className="text-center">
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost" 
                size="lg"
                className="text-gray-600 hover:text-navy hover:bg-white/50"
                data-testid="button-restricted-home"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
        <EventFooter t={t} />
      </div>
    );
  }

  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  const now = new Date();
  const hasStarted = startDate < now;
  const hasEnded = endDate < now;
  
  // For pre-recorded events, check if recording is available
  const isRecordingAvailable = event.isPreRecorded && event.recordingAvailableFrom 
    ? new Date(event.recordingAvailableFrom) <= now 
    : event.isPreRecorded; // If no recordingAvailableFrom date, assume available
  
  // Determine if content should be shown
  const showContent = event.isPreRecorded ? isRecordingAvailable : true;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-pcs_blue/10 via-teal/5 to-ocean-blue/10 border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent pointer-events-none"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-20">
          {event.imageUrl && (
            <div className="mb-10">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="max-h-40 mx-auto object-contain drop-shadow-lg transition-opacity duration-300"
                data-testid="img-event-logo"
                onError={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.style.display = 'none';
                  }
                }}
              />
            </div>
          )}
          
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 text-gray-900 leading-tight tracking-tight" data-testid="text-event-title">
            {event.title}
          </h1>

          {/* Pre-recorded content not yet available message */}
          {event.isPreRecorded && !showContent && event.recordingAvailableFrom && (
            <div className="mb-12 p-8 bg-amber-50 border-2 border-amber-200 rounded-xl text-center shadow-lg">
              <p className="text-amber-900 font-semibold text-2xl mb-4" data-testid="text-recording-not-available">
                Content Not Yet Available
              </p>
              <p className="text-lg text-amber-800 mb-2" data-testid="text-recording-available-date">
                This pre-recorded event will be available on {format(new Date(event.recordingAvailableFrom), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
              </p>
              <p className="text-amber-700">
                Please check back after this date to access the content.
              </p>
            </div>
          )}

          {/* YouTube Videos Section */}
          {showContent && event.youtubeVideos && event.youtubeVideos.length > 0 && (
            <div className="mb-12">
              <div className="space-y-10">
                {event.youtubeVideos.map((video, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-lg p-6 md:p-8" data-testid={`div-video-${index}`}>
                    <h3 className="text-2xl md:text-3xl font-semibold mb-3 text-gray-900" data-testid={`text-video-title-${index}`}>
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-gray-600 mb-6 text-lg" data-testid={`text-video-description-${index}`}>
                        {video.description}
                      </p>
                    )}
                    <YouTubeEmbed url={video.url} title={video.title} />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Event Details - Now below the video */}
          <div className="flex flex-wrap justify-center gap-4 text-gray-700 mb-8">
            <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full shadow-sm" data-testid="div-event-date">
              <Calendar className="w-5 h-5 text-pcs_blue" />
              <span className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full shadow-sm" data-testid="div-event-time">
              <Users className="w-5 h-5 text-pcs_blue" />
              <span className="font-medium">{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
            </div>
            
            {event.location && !event.isVirtual && (
              <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full shadow-sm" data-testid="div-event-location">
                <MapPin className="w-5 h-5 text-pcs_blue" />
                <span className="font-medium">{event.location}</span>
              </div>
            )}
            
            {event.isVirtual && (
              <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full shadow-sm" data-testid="div-event-virtual">
                <ExternalLink className="w-5 h-5 text-pcs_blue" />
                <span className="font-medium">Virtual Event</span>
              </div>
            )}
          </div>

          {/* Meeting Link */}
          {event.meetingLink && hasStarted && !hasEnded && showContent && (
            <div className="mt-10 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl text-center shadow-lg">
              <p className="text-green-900 font-semibold text-xl mb-4" data-testid="text-event-live">
                {t('events.event_live_now')}
              </p>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-join-meeting"
              >
                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" onClick={handleMeetingLinkClick}>
                  <ExternalLink className="w-5 h-5 mr-2" />
                  {t('events.join_meeting_now')}
                </a>
              </Button>
            </div>
          )}

          {!hasStarted && (
            <div className="mt-10 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl text-center shadow-sm">
              <p className="text-blue-800 font-medium text-lg" data-testid="text-event-upcoming">
                {t('events.event_not_started', { date: format(startDate, 'MMMM d, yyyy \'at\' h:mm a') })}
              </p>
              {event.meetingLink && (
                <p className="text-blue-700 mt-3 text-sm">
                  {t('events.meeting_link_available')}
                </p>
              )}
            </div>
          )}

          {hasEnded && (
            <div className="mt-10 p-6 bg-gradient-to-r from-ocean-blue/10 to-teal/10 border-2 border-ocean-blue/30 rounded-xl text-center shadow-lg">
              <p className="text-navy font-bold text-2xl mb-2" data-testid="text-event-ended">
                {t('events.catch_up_recording')}
              </p>
              <p className="text-gray-700 text-lg">
                {t('events.missed_event_message')}
              </p>
            </div>
          )}

          {/* Event Description - Moved below videos and status banners */}
          <div className="mt-12 mb-8">
            <p className="text-lg md:text-xl text-center text-gray-700 max-w-3xl mx-auto leading-relaxed" data-testid="text-event-description">
              {event.description}
            </p>
          </div>

          {/* Registration Button */}
          <div className="mt-10 flex justify-center">
            {userRegistration && userRegistration.status === 'registered' ? (
              <div className="flex items-center gap-3 px-8 py-4 bg-green-50 border-2 border-green-300 rounded-xl shadow-sm">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-green-800 font-semibold text-lg" data-testid="text-already-registered">
                  {t('events.registered')}
                </span>
              </div>
            ) : userRegistration && userRegistration.status === 'waitlisted' ? (
              <div className="flex items-center gap-3 px-8 py-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-sm">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
                <span className="text-yellow-800 font-semibold text-lg" data-testid="text-waitlisted">
                  {t('events.waitlisted')}
                </span>
              </div>
            ) : !hasEnded && (
              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-pcs_blue to-ocean-blue hover:from-pcs_blue/90 hover:to-ocean-blue/90 text-white font-bold text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-register-event"
              >
                {registerMutation.isPending ? (
                  t('events.registering')
                ) : isAuthenticated ? (
                  t('events.register_event')
                ) : (
                  t('events.sign_up_to_register')
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Event Pack Files Section */}
        {showContent && event.eventPackFiles && event.eventPackFiles.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-gray-900" data-testid="text-resources-title">
              Event Resources
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {event.eventPackFiles.map((file, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-pcs_blue/30 group" data-testid={`card-resource-${index}`}>
                  <div className="relative h-40 bg-gradient-to-br from-pcs_blue to-ocean-blue flex items-center justify-center">
                    <Download className="w-16 h-16 text-white/20 absolute" />
                    <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-full p-4">
                      <Download className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2 text-gray-900 group-hover:text-pcs_blue transition-colors" data-testid={`text-resource-title-${index}`}>
                      {file.title}
                    </h3>
                    {file.description && (
                      <p className="text-gray-600 text-sm mb-3 leading-relaxed line-clamp-2" data-testid={`text-resource-description-${index}`}>
                        {file.description}
                      </p>
                    )}
                    {file.fileName && (
                      <p className="text-gray-500 text-xs mb-1 font-medium truncate">{file.fileName}</p>
                    )}
                    {file.fileSize && file.fileSize > 0 && (
                      <p className="text-gray-500 text-xs mb-4">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-pcs_blue to-ocean-blue hover:from-pcs_blue/90 hover:to-ocean-blue/90 text-white"
                      data-testid={`button-download-${index}`}
                    >
                      <a 
                        href={file.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        download
                        onClick={() => handleDownloadClick(file.fileName || file.title)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials Section */}
        {event.testimonials && event.testimonials.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-gray-900" data-testid="text-testimonials-title">
              What People Are Saying
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {event.testimonials.map((testimonial, index) => (
                <Card key={index} className="p-8 bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-teal" data-testid={`card-testimonial-${index}`}>
                  <blockquote className="text-lg md:text-xl italic text-gray-700 mb-6 leading-relaxed" data-testid={`text-testimonial-quote-${index}`}>
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg" data-testid={`text-testimonial-author-${index}`}>
                        {testimonial.author}
                      </p>
                      {testimonial.role && (
                        <p className="text-sm text-gray-600 font-medium" data-testid={`text-testimonial-role-${index}`}>
                          {testimonial.role}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>

      <EventFooter t={t} />
    </div>
  );
}
