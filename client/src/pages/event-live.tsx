import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { format } from "date-fns";

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
  
  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ['/api/events/slug', params.slug],
    queryFn: async () => {
      const res = await fetch(`/api/events/slug/${params.slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Event not found');
        throw new Error('Failed to fetch event');
      }
      return res.json();
    },
    retry: false,
  });

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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {event.imageUrl && (
            <div className="mb-8">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="max-h-32 mx-auto object-contain"
                data-testid="img-event-logo"
              />
            </div>
          )}
          
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4" data-testid="text-event-title">
            {event.title}
          </h1>
          
          <div className="flex flex-wrap justify-center gap-6 text-gray-600 mb-6">
            <div className="flex items-center gap-2" data-testid="div-event-date">
              <Calendar className="w-5 h-5" />
              <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            <div className="flex items-center gap-2" data-testid="div-event-time">
              <Users className="w-5 h-5" />
              <span>{format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}</span>
            </div>
            
            {event.location && !event.isVirtual && (
              <div className="flex items-center gap-2" data-testid="div-event-location">
                <MapPin className="w-5 h-5" />
                <span>{event.location}</span>
              </div>
            )}
            
            {event.isVirtual && (
              <div className="flex items-center gap-2" data-testid="div-event-virtual">
                <ExternalLink className="w-5 h-5" />
                <span>Virtual Event</span>
              </div>
            )}
          </div>

          <p className="text-lg text-center text-gray-700 max-w-3xl mx-auto" data-testid="text-event-description">
            {event.description}
          </p>

          {!hasStarted && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-blue-800 font-medium" data-testid="text-event-upcoming">
                This event hasn't started yet. Please check back on {format(startDate, 'MMMM d, yyyy at h:mm a')}
              </p>
            </div>
          )}

          {hasEnded && (
            <div className="mt-8 p-4 bg-gray-100 border border-gray-300 rounded-lg text-center">
              <p className="text-gray-700 font-medium" data-testid="text-event-ended">
                This event has ended. You can still watch the recordings below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* YouTube Videos Section */}
        {event.youtubeVideos && event.youtubeVideos.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8" data-testid="text-videos-title">
              Watch the Event
            </h2>
            <div className="space-y-12">
              {event.youtubeVideos.map((video, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6" data-testid={`div-video-${index}`}>
                  <h3 className="text-2xl font-semibold mb-2" data-testid={`text-video-title-${index}`}>
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-gray-600 mb-4" data-testid={`text-video-description-${index}`}>
                      {video.description}
                    </p>
                  )}
                  <YouTubeEmbed url={video.url} title={video.title} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Pack Files Section */}
        {event.eventPackFiles && event.eventPackFiles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8" data-testid="text-resources-title">
              Event Resources
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {event.eventPackFiles.map((file, index) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow" data-testid={`card-resource-${index}`}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Download className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-resource-title-${index}`}>
                        {file.title}
                      </h3>
                      {file.description && (
                        <p className="text-gray-600 text-sm mb-2" data-testid={`text-resource-description-${index}`}>
                          {file.description}
                        </p>
                      )}
                      {file.fileName && (
                        <p className="text-gray-500 text-xs mb-1">{file.fileName}</p>
                      )}
                      {file.fileSize && (
                        <p className="text-gray-500 text-xs mb-3">
                          {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        data-testid={`button-download-${index}`}
                      >
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials Section */}
        {event.testimonials && event.testimonials.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8" data-testid="text-testimonials-title">
              What People Are Saying
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {event.testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6 bg-white" data-testid={`card-testimonial-${index}`}>
                  <blockquote className="text-lg italic text-gray-700 mb-4" data-testid={`text-testimonial-quote-${index}`}>
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-semibold" data-testid={`text-testimonial-author-${index}`}>
                        {testimonial.author}
                      </p>
                      {testimonial.role && (
                        <p className="text-sm text-gray-600" data-testid={`text-testimonial-role-${index}`}>
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

        {/* CTA Section */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h3 className="text-2xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Submit Your Evidence?
          </h3>
          <p className="text-gray-600 mb-6" data-testid="text-cta-description">
            Login to your Plastic Clever Schools profile to upload your amazing work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              data-testid="button-login"
            >
              Submit Your Evidence
            </Button>
            <Button
              onClick={() => navigate('/register')}
              variant="outline"
              size="lg"
              data-testid="button-register"
            >
              Create Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
