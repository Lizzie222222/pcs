import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Users, ExternalLink, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
}

export default function Events() {
  const { isAuthenticated } = useAuth();

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
      <div className="container-width py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-navy mb-4" data-testid="heading-events-title">
            Events & Workshops
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto" data-testid="text-events-description">
            Join our community events, workshops, and webinars to learn and connect with other Plastic Clever Schools
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
                Upcoming Events
              </h2>
              {upcomingEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No upcoming events at the moment. Check back soon!</p>
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
                  Past Events
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
    </div>
  );
}

function EventCard({ event, isPast = false }: { event: Event; isPast?: boolean }) {
  const isFull = event.capacity && event.registrationsCount >= event.capacity;

  return (
    <Card 
      className={`overflow-hidden group hover:shadow-xl transition-shadow duration-300 ${isPast ? 'opacity-75' : ''}`}
      data-testid={`card-event-${event.id}`}
    >
      {event.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={event.imageUrl} 
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
        <a
          href={`/events/${event.publicSlug || event.id}`}
          className="inline-flex items-center gap-2 text-pcs_blue hover:text-pcs_blue/80 font-semibold text-sm group/link"
          data-testid={`link-event-details-${event.id}`}
        >
          {isPast ? 'View Event Details' : 'View Details & Register'}
          <ExternalLink className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
        </a>
      </CardContent>
    </Card>
  );
}
