import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Calendar, MapPin, Users, ExternalLink, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function EventLivePage() {
  const params = useParams() as { slug: string };
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading event..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-bold mb-4" data-testid="text-error-title">Event Not Found</h1>
        <p className="text-gray-600 mb-6" data-testid="text-error-message">
          The event you're looking for doesn't exist or is no longer available.
        </p>
        <Button onClick={() => navigate('/')} data-testid="button-home">
          Go Home
        </Button>
      </div>
    );
  }

  const startDate = new Date(event.startDateTime);
  const endDate = new Date(event.endDateTime);
  const hasStarted = startDate < new Date();
  const hasEnded = endDate < new Date();

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-pcs_blue/10 via-teal/5 to-ocean-blue/10 border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent pointer-events-none"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-20">
          {event.imageUrl && (
            <div className="mb-10">
              <img
                src={`/api/objects${event.imageUrl}`}
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

          {/* YouTube Videos Section */}
          {event.youtubeVideos && event.youtubeVideos.length > 0 && (
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
          {event.meetingLink && hasStarted && !hasEnded && (
            <div className="mt-10 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl text-center shadow-lg">
              <p className="text-green-900 font-semibold text-xl mb-4" data-testid="text-event-live">
                🎉 Event is Live Now!
              </p>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all"
                data-testid="button-join-meeting"
              >
                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Join Meeting Now
                </a>
              </Button>
            </div>
          )}

          {!hasStarted && (
            <div className="mt-10 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl text-center shadow-sm">
              <p className="text-blue-800 font-medium text-lg" data-testid="text-event-upcoming">
                This event hasn't started yet. Please check back on {format(startDate, 'MMMM d, yyyy at h:mm a')}
              </p>
              {event.meetingLink && (
                <p className="text-blue-700 mt-3 text-sm">
                  The meeting link will be available when the event starts.
                </p>
              )}
            </div>
          )}

          {hasEnded && (
            <div className="mt-10 p-5 bg-gray-100 border-2 border-gray-300 rounded-xl text-center shadow-sm">
              <p className="text-gray-700 font-medium text-lg" data-testid="text-event-ended">
                This event has ended. You can still watch the recordings below.
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
                  You're registered for this event!
                </span>
              </div>
            ) : userRegistration && userRegistration.status === 'waitlisted' ? (
              <div className="flex items-center gap-3 px-8 py-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-sm">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
                <span className="text-yellow-800 font-semibold text-lg" data-testid="text-waitlisted">
                  You're on the waitlist for this event
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
                  "Registering..."
                ) : isAuthenticated ? (
                  "Register for This Event"
                ) : (
                  "Sign Up to Register"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Event Pack Files Section */}
        {event.eventPackFiles && event.eventPackFiles.length > 0 && (
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
                    {file.fileSize > 0 && (
                      <p className="text-gray-500 text-xs mb-4">
                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-pcs_blue to-ocean-blue hover:from-pcs_blue/90 hover:to-ocean-blue/90 text-white"
                      data-testid={`button-download-${index}`}
                    >
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download>
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
    </div>
  );
}
