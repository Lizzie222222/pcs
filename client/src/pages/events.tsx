import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Users, ExternalLink, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { getEventAvailableLanguages, LANGUAGE_FLAG_MAP } from "@/lib/languageUtils";
import whiteLogoUrl from "@assets/PCSWhite_1761216344335.png";
import { normalizeObjectStorageUrl } from "@/lib/urlNormalization";

interface Event {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startDateTime: string;
  endDateTime: string;
  location: string | null;
  isVirtual: boolean;
  meetingLink: string | null;
  imageUrl: string | null;
  capacity: number | null;
  status: string;
  publicSlug: string | null;
  registrationsCount: number;
  accessType: 'open' | 'closed';
  titleTranslations?: Record<string, any> | null;
  descriptionTranslations?: Record<string, any> | null;
  youtubeVideoTranslations?: Record<string, any> | null;
  eventPackFileTranslations?: Record<string, any> | null;
  testimonialTranslations?: Record<string, any> | null;
  evidenceSubmissionText?: Record<string, any> | null;
}

export default function Events() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('landing');

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const upcomingEvents = events.filter(event => 
    event.status === 'published' && new Date(event.startDateTime) > new Date()
  );

  const pastEvents = events.filter(event => 
    event.status === 'published' && new Date(event.startDateTime) <= new Date()
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal/5 to-ocean-blue/5">
      <div className="container-width pt-28 sm:pt-24 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="heading-events-title">
            {t('events.page_title')}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto" data-testid="text-events-description">
            {t('events.page_description')}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-pcs_blue border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Upcoming Events */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-navy mb-6" data-testid="heading-upcoming-events">
                {t('events.upcoming_events')}
              </h2>
              {upcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">{t('events.no_upcoming_events')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-upcoming-events">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </section>

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-navy mb-6" data-testid="heading-past-events">
                  {t('events.past_events')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-past-events">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} isPast />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-navy text-white py-12">
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
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const isFull = event.capacity && event.registrationsCount >= event.capacity;
  const availableLanguages = getEventAvailableLanguages(event);
  const showLanguages = availableLanguages.length > 1;
  const displayLanguages = availableLanguages.slice(0, 6);
  const remainingCount = availableLanguages.length - 6;

  return (
    <a 
      href={`/events/${event.publicSlug || event.id}`}
      className="block"
      data-testid={`link-event-card-${event.id}`}
    >
      <Card 
        className={`overflow-hidden group hover:shadow-xl transition-shadow duration-300 cursor-pointer ${isPast ? 'opacity-75' : ''}`}
        data-testid={`card-event-${event.id}`}
      >
        {event.imageUrl && (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={normalizeObjectStorageUrl(event.imageUrl)} 
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 right-3 bg-pcs_blue text-white px-3 py-1 rounded-full text-xs font-semibold">
              {event.eventType.replace('_', ' ').toUpperCase()}
            </div>
            {isPast && (
              <div className="absolute top-3 left-3 bg-gray-700 text-white px-3 py-1 rounded-full text-xs font-semibold">
                PAST EVENT
              </div>
            )}
            {!isPast && isFull && (
              <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                FULL
              </div>
            )}
          </div>
        )}
        <CardContent className="p-6">
          <h3 className="font-bold text-xl text-navy mb-3 line-clamp-2" data-testid={`text-event-title-${event.id}`}>
            {event.title}
          </h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2" data-testid={`text-event-description-${event.id}`}>
            {event.description}
          </p>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {showLanguages && (
              <div 
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 rounded-md border border-gray-200 w-fit"
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
            <div 
              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                event.accessType === 'open' 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}
              data-testid={`badge-access-type-${event.id}`}
            >
              {event.accessType === 'open' ? '🌍 Open Event' : '🔒 Closed Event'}
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(event.startDateTime).toLocaleDateString('en-GB', { 
                day: 'numeric',
                month: 'long', 
                year: 'numeric'
              })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(event.startDateTime).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
                {' - '}
                {new Date(event.endDateTime).toLocaleTimeString('en-GB', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{event.isVirtual ? 'Virtual Event' : event.location}</span>
              </div>
            )}
            {event.capacity && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{event.registrationsCount || 0} / {event.capacity} registered</span>
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-2 text-pcs_blue group-hover:text-pcs_blue/80 font-semibold text-sm">
            {isPast ? 'View Event Details' : 'View Details & Register'}
            <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
