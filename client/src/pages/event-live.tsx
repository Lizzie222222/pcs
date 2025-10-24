import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, MapPin, Users, ExternalLink, CheckCircle, Lock, ArrowLeft, Play, FileText, Image, FileSpreadsheet, FileArchive, Video, File } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { VideoLightbox } from "@/components/VideoLightbox";
import { getEventAvailableLanguages, LANGUAGE_FLAG_MAP, getLanguageLabel } from "@/lib/languageUtils";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";
import eventPackBannerUrl from "@assets/event-pack-2_1761297797787.png";

// Helper function to get file type icon based on file extension
function getFileTypeIcon(fileName: string) {
  const extension = fileName?.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'pdf':
      return FileText;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return Image;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return FileArchive;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'webm':
    case 'mkv':
      return Video;
    default:
      return File;
  }
}

// Helper function to format file size in human-readable format
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

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
  language?: string; // Prepare for future language metadata (e.g., 'en', 'es', 'fr')
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
  // Multi-language fields
  titleTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  youtubeVideoTranslations?: Record<string, YoutubeVideo[]>;
  eventPackFileTranslations?: Record<string, EventPackFile[]>;
  testimonialTranslations?: Record<string, Testimonial[]>;
  // Display configuration
  featuredVideoIndex?: number;
  eventPackBannerImageUrl?: string;
  showEvidenceSubmission?: boolean;
  evidenceSubmissionText?: Record<string, string>;
}

// Translation helper function
function getTranslatedContent<T>(
  translations: Record<string, T> | undefined | null,
  fallbackValue: T,
  userLanguage: string
): T {
  if (!translations || Object.keys(translations).length === 0) {
    return fallbackValue;
  }
  
  // Try user's preferred language
  if (translations[userLanguage]) {
    return translations[userLanguage];
  }
  
  // Fall back to English
  if (translations['en']) {
    return translations['en'];
  }
  
  // Fall back to original value
  return fallbackValue;
}

// Enhanced translation helper with metadata for fallback detection
function getTranslatedContentWithMeta<T>(
  translations: Record<string, T> | undefined | null,
  fallbackValue: T,
  requestedLanguage: string
): { content: T; usedLanguage: string; isFallback: boolean } {
  if (!translations || Object.keys(translations).length === 0) {
    return { content: fallbackValue, usedLanguage: 'original', isFallback: true };
  }
  
  // Try requested language
  if (translations[requestedLanguage]) {
    return { content: translations[requestedLanguage], usedLanguage: requestedLanguage, isFallback: false };
  }
  
  // Fall back to English
  if (translations['en']) {
    return { content: translations['en'], usedLanguage: 'en', isFallback: true };
  }
  
  // Fall back to original value
  return { content: fallbackValue, usedLanguage: 'original', isFallback: true };
}

// Extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
  return videoIdMatch ? videoIdMatch[1] : null;
}

// Get YouTube thumbnail URL
function getYouTubeThumbnail(url: string): string {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';
}

// Create Google Calendar link
function createGoogleCalendarLink(event: Event, startDate: Date, endDate: Date): string {
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description || '',
    location: event.isVirtual ? 'Virtual Event' : (event.location || ''),
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Create iCal file content
function createICalFile(event: Event, startDate: Date, endDate: Date): string {
  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const now = new Date();
  const uid = `event-${event.id}@plasticcleverschools.org`;
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plastic Clever Schools//Event Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.isVirtual ? 'Virtual Event' : (event.location || '')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  
  return lines.join('\r\n');
}

// Countdown Timer Component
function CountdownTimer({ startDate }: { startDate: Date }) {
  const calculateTimeLeft = () => {
    const now = new Date().getTime();
    const distance = startDate.getTime() - now;

    if (distance < 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startDate]);

  // Don't show if more than 30 days away (check total milliseconds)
  const now = new Date().getTime();
  const distance = startDate.getTime() - now;
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  
  if (distance > thirtyDaysInMs || distance < 0) {
    return null;
  }

  return (
    <div className="mt-10 p-8 bg-gradient-to-br from-teal-50 to-ocean-blue-50 border-2 border-teal-300 rounded-xl shadow-xl" data-testid="div-countdown-timer">
      <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
        Event starts in
      </h3>
      <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg p-4 shadow-md text-center">
          <div className="text-4xl font-bold text-pcs_blue" data-testid="text-countdown-days">
            {timeLeft.days}
          </div>
          <div className="text-sm text-gray-600 mt-1">Days</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-md text-center">
          <div className="text-4xl font-bold text-pcs_blue" data-testid="text-countdown-hours">
            {timeLeft.hours}
          </div>
          <div className="text-sm text-gray-600 mt-1">Hours</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-md text-center">
          <div className="text-4xl font-bold text-pcs_blue" data-testid="text-countdown-minutes">
            {timeLeft.minutes}
          </div>
          <div className="text-sm text-gray-600 mt-1">Minutes</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-md text-center">
          <div className="text-4xl font-bold text-pcs_blue" data-testid="text-countdown-seconds">
            {timeLeft.seconds}
          </div>
          <div className="text-sm text-gray-600 mt-1">Seconds</div>
        </div>
      </div>
    </div>
  );
}

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
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

// Fallback Badge Component
function FallbackBadge({ usedLanguage }: { usedLanguage: string }) {
  if (usedLanguage === 'original') {
    return (
      <Badge 
        variant="outline" 
        className="bg-gray-100 text-gray-600 border-gray-300 text-xs"
        data-testid="badge-fallback-language"
      >
        Original Language
      </Badge>
    );
  }

  const flag = LANGUAGE_FLAG_MAP[usedLanguage] || '🏳️';
  const languageName = usedLanguage === 'en' ? 'English' : usedLanguage.toUpperCase();
  
  return (
    <Badge 
      variant="outline" 
      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
      data-testid="badge-fallback-language"
    >
      {flag} Available in {languageName}
    </Badge>
  );
}

// Language Selector Tabs Component
interface LanguageSelectorTabsProps {
  event: Event;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  overlay?: boolean;
}

function LanguageSelectorTabs({ event, selectedLanguage, onLanguageChange, overlay = false }: LanguageSelectorTabsProps) {
  const availableLanguages = getEventAvailableLanguages(event);
  
  // Don't show selector if only one language or no languages
  if (availableLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="mb-8" data-testid="tabs-language-selector">
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {availableLanguages.map((langCode) => {
          const flag = LANGUAGE_FLAG_MAP[langCode] || '🏳️';
          const isSelected = langCode === selectedLanguage;
          
          return (
            <button
              key={langCode}
              onClick={() => onLanguageChange(langCode)}
              className={`
                px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold text-sm md:text-base
                transition-all duration-200 transform hover:scale-105
                ${overlay 
                  ? isSelected
                    ? 'bg-white text-pcs_blue shadow-lg backdrop-blur-sm' 
                    : 'bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 hover:border-white backdrop-blur-sm'
                  : isSelected 
                    ? 'bg-gradient-to-r from-pcs_blue to-ocean-blue text-white shadow-lg' 
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-pcs_blue hover:text-pcs_blue'
                }
              `}
              data-testid={`tab-language-${langCode}`}
            >
              <span className="text-lg mr-2">{flag}</span>
              {langCode.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Overlay variant with white text styling
function LanguageSelectorTabsOverlay({ event, selectedLanguage, onLanguageChange }: Omit<LanguageSelectorTabsProps, 'overlay'>) {
  return (
    <LanguageSelectorTabs 
      event={event}
      selectedLanguage={selectedLanguage}
      onLanguageChange={onLanguageChange}
      overlay={true}
    />
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
  const { t, i18n } = useTranslation('landing');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YoutubeVideo | null>(null);
  
  // Get user language and selected language state
  const userLanguage = user?.preferredLanguage || 'en';
  const [selectedLanguage, setSelectedLanguage] = useState(userLanguage);
  
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

  // Language update mutation
  const updateLanguageMutation = useMutation({
    mutationFn: async (language: string) => {
      return apiRequest('PUT', '/api/user/language', { language });
    },
    onSuccess: (data: any, language: string) => {
      // Update local state
      setSelectedLanguage(language);
      
      // Change i18n language for entire app
      i18n.changeLanguage(language);
      
      // Invalidate auth cache to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Show success toast
      toast({
        title: "Language Updated",
        description: `Language preference changed to ${getLanguageLabel(language)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Language",
        description: error.message || "Could not update language preference",
        variant: "destructive",
      });
    },
  });

  const handleLanguageChange = (language: string) => {
    if (isAuthenticated) {
      updateLanguageMutation.mutate(language);
    } else {
      // For non-authenticated users, just change the local state and i18n
      setSelectedLanguage(language);
      i18n.changeLanguage(language);
    }
  };

  const handleMeetingLinkClick = () => {
    trackClickMutation.mutate();
  };

  const handleDownloadClick = (fileName: string) => {
    trackDownloadMutation.mutate(fileName);
  };

  const handleVideoThumbnailClick = (video: YoutubeVideo) => {
    setSelectedVideo(video);
    setLightboxOpen(true);
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

  // Get translated content with fallback metadata
  const titleMeta = getTranslatedContentWithMeta(event.titleTranslations, event.title, selectedLanguage);
  const descriptionMeta = getTranslatedContentWithMeta(event.descriptionTranslations, event.description, selectedLanguage);
  const videosMeta = getTranslatedContentWithMeta(event.youtubeVideoTranslations, event.youtubeVideos || [], selectedLanguage);
  const eventPackFilesMeta = getTranslatedContentWithMeta(event.eventPackFileTranslations, event.eventPackFiles || [], selectedLanguage);
  const testimonialsMeta = getTranslatedContentWithMeta(event.testimonialTranslations, event.testimonials || [], selectedLanguage);
  const evidenceTextMeta = getTranslatedContentWithMeta(event.evidenceSubmissionText, 'Join thousands of students worldwide making a difference. Submit your evidence and showcase your plastic reduction journey!', selectedLanguage);

  // Extract content for easier access
  const translatedTitle = titleMeta.content;
  const translatedDescription = descriptionMeta.content;
  const translatedVideos = videosMeta.content;
  const translatedEventPackFiles = eventPackFilesMeta.content;
  const translatedTestimonials = testimonialsMeta.content;
  const translatedEvidenceText = evidenceTextMeta.content;

  // Check if page is in coming soon status
  if (event.pagePublishedStatus === 'coming_soon') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pcs_blue/10 via-teal/5 to-ocean-blue/10 flex flex-col pt-16">
        {/* Hero Banner with Overlay */}
        {event.imageUrl ? (
          <div className="relative w-full h-[400px] overflow-hidden bg-gray-900">
            <img
              src={event.imageUrl}
              alt={translatedTitle}
              className="w-full h-full object-cover object-center"
              data-testid="img-coming-soon-hero-banner"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 flex flex-col justify-end">
              <div className="max-w-6xl mx-auto px-4 pb-12 w-full">
                <h1 className="text-4xl md:text-5xl font-bold text-center text-white leading-tight tracking-tight drop-shadow-2xl" data-testid="text-coming-soon-title">
                  {translatedTitle}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900" data-testid="text-coming-soon-title">
              {translatedTitle}
            </h1>
          </div>
        )}
        
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="max-w-2xl text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 mb-6 border-2 border-pcs_blue/20">
              <p className="text-2xl font-semibold text-pcs_blue mb-4" data-testid="text-coming-soon-message">
                Coming Soon!
              </p>
              <p className="text-lg text-gray-700 leading-relaxed" data-testid="text-coming-soon-description">
                {translatedDescription}
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
      <div className="min-h-screen bg-gradient-to-br from-ocean-blue/5 via-white to-teal/5 flex flex-col pt-16">
        {/* Hero Banner with Overlay */}
        {event.imageUrl ? (
          <div className="relative w-full h-[400px] overflow-hidden bg-gray-900">
            <img
              src={event.imageUrl}
              alt={translatedTitle}
              className="w-full h-full object-cover object-center"
              data-testid="img-restricted-hero-banner"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 flex flex-col justify-end">
              <div className="max-w-6xl mx-auto px-4 pb-12 w-full">
                <h1 className="text-4xl md:text-5xl font-bold text-center text-white leading-tight tracking-tight drop-shadow-2xl" data-testid="text-restricted-title">
                  {translatedTitle}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-navy" data-testid="text-restricted-title">
              {translatedTitle}
            </h1>
          </div>
        )}
        
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-3xl w-full">

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

  // Prepare videos for display
  const videos = translatedVideos;
  const featuredIndex = event.featuredVideoIndex || 0;
  const hasSingleVideo = videos.length === 1;
  const hasMultipleVideos = videos.length > 1;
  const featuredVideo = hasMultipleVideos && videos[featuredIndex] ? videos[featuredIndex] : null;
  const thumbnailVideos = hasMultipleVideos ? videos.filter((_, index) => index !== featuredIndex) : [];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Banner with Overlay */}
      {event.imageUrl ? (
        <div className="relative w-full h-[500px] overflow-hidden bg-gray-900">
          {/* Background Image */}
          <img
            src={event.imageUrl}
            alt={translatedTitle}
            className="w-full h-full object-cover object-center"
            data-testid="img-event-hero-banner"
            onError={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.style.display = 'none';
              }
            }}
          />
          
          {/* Gradient Fade Overlay - Bottom to Top (subtle) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none"></div>
          
          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-6xl mx-auto px-4 pb-12 md:pb-16 w-full">
              {/* Language Selector Tabs */}
              <div className="mb-6">
                <LanguageSelectorTabsOverlay 
                  event={event}
                  selectedLanguage={selectedLanguage}
                  onLanguageChange={handleLanguageChange}
                />
              </div>

              {/* Event Title */}
              <h1 className="text-4xl md:text-6xl font-bold text-center text-white leading-tight tracking-tight drop-shadow-2xl" data-testid="text-event-title">
                {translatedTitle}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        // Fallback when no image - show title and language selector in regular section
        <div className="relative bg-gradient-to-br from-pcs_blue/10 via-teal/5 to-ocean-blue/10 border-b border-gray-200 shadow-sm overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent pointer-events-none"></div>
          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-20">
            {/* Language Selector Tabs */}
            <LanguageSelectorTabs 
              event={event}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />

            <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 text-gray-900 leading-tight tracking-tight" data-testid="text-event-title">
              {translatedTitle}
            </h1>
          </div>
        </div>
      )}
      
      {/* Hero Section - Now just contains content below the banner */}
      <div className="relative bg-gradient-to-br from-pcs_blue/10 via-teal/5 to-ocean-blue/10 border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent pointer-events-none"></div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-20">

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

          {/* Redesigned Video Section */}
          {showContent && videos && videos.length > 0 && (
            <div className="mb-12">
              {/* Single Video - Show as before */}
              {hasSingleVideo && (
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8" data-testid="div-single-video">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl md:text-3xl font-semibold text-gray-900" data-testid="text-single-video-title">
                      {videos[0].title}
                    </h3>
                    {videosMeta.isFallback && <FallbackBadge usedLanguage={videosMeta.usedLanguage} />}
                  </div>
                  {videos[0].description && (
                    <p className="text-gray-600 mb-6 text-lg" data-testid="text-single-video-description">
                      {videos[0].description}
                    </p>
                  )}
                  <YouTubeEmbed url={videos[0].url} title={videos[0].title} />
                </div>
              )}

              {/* Multiple Videos - Featured video with thumbnails */}
              {hasMultipleVideos && featuredVideo && (
                <div className="space-y-8">
                  {/* Featured Video */}
                  <div className="bg-white rounded-xl shadow-lg p-6 md:p-8" data-testid="div-featured-video">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-2xl md:text-3xl font-semibold text-gray-900" data-testid="text-featured-video-title">
                        {featuredVideo.title}
                      </h3>
                      {videosMeta.isFallback && <FallbackBadge usedLanguage={videosMeta.usedLanguage} />}
                    </div>
                    {featuredVideo.description && (
                      <p className="text-gray-600 mb-6 text-lg" data-testid="text-featured-video-description">
                        {featuredVideo.description}
                      </p>
                    )}
                    <YouTubeEmbed url={featuredVideo.url} title={featuredVideo.title} />
                  </div>

                  {/* Video Thumbnails Grid */}
                  {thumbnailVideos.length > 0 && (
                    <div>
                      <h3 className="text-2xl font-semibold mb-4 text-gray-900" data-testid="text-more-videos">
                        More Videos
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {thumbnailVideos.map((video, index) => (
                          <div
                            key={index}
                            onClick={() => handleVideoThumbnailClick(video)}
                            className="group cursor-pointer bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                            data-testid={`card-video-thumbnail-${index}`}
                          >
                            <div className="relative aspect-video bg-gray-900">
                              <img
                                src={getYouTubeThumbnail(video.url)}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                data-testid={`img-video-thumbnail-${index}`}
                              />
                              {/* Play Icon Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Play className="w-8 h-8 text-pcs_blue ml-1" fill="currentColor" />
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <h4 className="font-semibold text-lg text-gray-900 group-hover:text-pcs_blue transition-colors line-clamp-2" data-testid={`text-video-thumbnail-title-${index}`}>
                                {video.title}
                              </h4>
                              {video.description && (
                                <p className="text-gray-600 text-sm mt-2 line-clamp-2" data-testid={`text-video-thumbnail-description-${index}`}>
                                  {video.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            
            <div 
              className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm font-semibold ${
                event.accessType === 'open' 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
              data-testid="badge-access-type"
            >
              {event.accessType === 'open' ? '🌍 Open Event' : '🔒 Closed Event'}
            </div>
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
            <>
              {/* Countdown Timer */}
              <CountdownTimer startDate={startDate} />
              
              {/* Calendar Invite Buttons */}
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Button
                  onClick={() => {
                    const googleCalendarUrl = createGoogleCalendarLink(event, startDate, endDate);
                    window.open(googleCalendarUrl, '_blank');
                  }}
                  variant="outline"
                  className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 font-semibold"
                  data-testid="button-add-google-calendar"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Google Calendar
                </Button>
                
                <Button
                  onClick={() => {
                    const icalData = createICalFile(event, startDate, endDate);
                    const blob = new Blob([icalData], { type: 'text/calendar' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                  className="bg-white hover:bg-teal-50 border-teal-300 text-teal-700 font-semibold"
                  data-testid="button-download-ical"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download iCal
                </Button>
              </div>
            </>
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
              {translatedDescription}
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

        {/* Event Pack Banner Section */}
        {showContent && translatedEventPackFiles && translatedEventPackFiles.length > 0 && (
          <div className="mb-16" data-testid="section-event-pack">
            <div className="bg-gradient-to-br from-pcs_blue/5 to-ocean-blue/5 rounded-3xl p-8 md:p-12 shadow-lg border-2 border-pcs_blue/10">
              {/* Banner Image */}
              <div className="mb-8">
                <img
                  src={event.eventPackBannerImageUrl || eventPackBannerUrl}
                  alt="Event Pack Banner"
                  className="w-full h-auto rounded-2xl shadow-md"
                  data-testid="img-event-pack-banner"
                />
              </div>

              {/* Heading */}
              <div className="flex items-center justify-center gap-3 mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900" data-testid="text-event-pack-title">
                  Download the Event Pack
                </h2>
                {eventPackFilesMeta.isFallback && <FallbackBadge usedLanguage={eventPackFilesMeta.usedLanguage} />}
              </div>

              {/* Event Pack Files Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {translatedEventPackFiles.map((file, index) => {
                  // Get the appropriate file type icon
                  const FileIcon = getFileTypeIcon(file.fileName || file.fileUrl);
                  
                  // Determine if file has language metadata for badge
                  const fileLanguage = file.language;
                  const languageFlag = fileLanguage ? LANGUAGE_FLAG_MAP[fileLanguage] || '🏳️' : null;
                  const languageCode = fileLanguage ? fileLanguage.toUpperCase() : null;
                  
                  return (
                    <Card 
                      key={index} 
                      className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-pcs_blue/50 group bg-white" 
                      data-testid={`card-event-pack-file-${index}`}
                    >
                      {/* Language Badge - Top Right Corner */}
                      {languageFlag && languageCode && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge 
                            className="bg-white/90 backdrop-blur-sm text-gray-800 border border-gray-300 shadow-md text-xs font-semibold px-2 py-1"
                            data-testid={`badge-file-language-${index}`}
                          >
                            {languageFlag} {languageCode}
                          </Badge>
                        </div>
                      )}
                      
                      {/* File Type Icon Header */}
                      <div className="relative h-48 bg-gradient-to-br from-pcs_blue to-ocean-blue flex items-center justify-center overflow-hidden">
                        {/* Background decorative icon */}
                        <FileIcon className="w-32 h-32 text-white/10 absolute" />
                        {/* Main prominent icon */}
                        <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-2xl p-5 group-hover:scale-110 transition-transform duration-300">
                          <FileIcon className="w-16 h-16 text-white drop-shadow-lg" />
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-6 space-y-3">
                        {/* File Title */}
                        <h3 className="font-bold text-xl mb-2 text-gray-900 group-hover:text-pcs_blue transition-colors leading-tight" data-testid={`text-event-pack-file-title-${index}`}>
                          {file.title}
                        </h3>
                        
                        {/* File Description */}
                        {file.description && (
                          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]" data-testid={`text-event-pack-file-description-${index}`}>
                            {file.description}
                          </p>
                        )}
                        
                        {/* File Name (if available) */}
                        {file.fileName && (
                          <p className="text-gray-500 text-xs font-mono truncate bg-gray-50 px-2 py-1 rounded" data-testid={`text-file-name-${index}`}>
                            {file.fileName}
                          </p>
                        )}
                        
                        {/* File Size Display */}
                        {file.fileSize && file.fileSize > 0 && (
                          <div className="flex items-center gap-2 text-gray-700 font-semibold">
                            <span className="text-lg">📦</span>
                            <span className="text-sm" data-testid={`text-file-size-${index}`}>
                              {formatFileSize(file.fileSize)}
                            </span>
                          </div>
                        )}
                        
                        {/* Download Button */}
                        <Button
                          asChild
                          className="w-full bg-gradient-to-r from-pcs_blue to-ocean-blue hover:from-pcs_blue/80 hover:to-ocean-blue/80 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] mt-4"
                          data-testid={`button-download-event-pack-${index}`}
                        >
                          <a 
                            href={file.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            download
                            onClick={() => handleDownloadClick(file.fileName || file.title)}
                            className="flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </a>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Evidence Submission CTA Section */}
        {event.showEvidenceSubmission && (
          <div className="mb-16" data-testid="section-evidence-submission">
            <div className="relative bg-gradient-to-br from-teal via-ocean-blue to-pcs_blue rounded-3xl p-12 md:p-16 shadow-2xl overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48 blur-3xl"></div>

              <div className="relative text-center text-white">
                <h2 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-evidence-submission-title">
                  SUBMIT YOUR EVIDENCE
                </h2>
                <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed opacity-95" data-testid="text-evidence-submission-description">
                  {translatedEvidenceText}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-pcs_blue hover:bg-gray-100 font-bold text-xl px-12 py-7 shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
                  data-testid="button-submit-evidence"
                >
                  <a href={isAuthenticated ? '/home?tab=evidence' : '/register'}>
                    {isAuthenticated ? 'Submit Your Evidence' : 'Sign Up to Submit Evidence'}
                  </a>
                </Button>
                {!isAuthenticated && (
                  <p className="text-white/90 mt-6 text-sm">
                    Already have an account? <a href="/login" className="underline font-semibold hover:text-white">Sign in here</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Testimonials Section */}
        {translatedTestimonials && translatedTestimonials.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900" data-testid="text-testimonials-title">
                What People Are Saying
              </h2>
              {testimonialsMeta.isFallback && <FallbackBadge usedLanguage={testimonialsMeta.usedLanguage} />}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {translatedTestimonials.map((testimonial, index) => (
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

      {/* Video Lightbox */}
      {selectedVideo && (
        <VideoLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          videoUrl={selectedVideo.url}
          title={selectedVideo.title}
        />
      )}

      <EventFooter t={t} />
    </div>
  );
}
