import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Plus, Edit, Copy, Users, ExternalLink, Trash2, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Event } from "@shared/schema";
import type { EventWithRegistrations, EventFilters, EventFormData } from "./types";

interface EventsListProps {
  events: EventWithRegistrations[];
  eventsLoading: boolean;
  eventFilters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  onCreateEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDuplicateEvent: (eventId: string) => void;
  onDeleteEvent: (event: Event) => void;
  onViewRegistrations: (event: Event) => void;
  onSendNewsletter: (event: Event) => void;
  isDuplicating: boolean;
}

export default function EventsList({
  events,
  eventsLoading,
  eventFilters,
  onFiltersChange,
  onCreateEvent,
  onEditEvent,
  onDuplicateEvent,
  onDeleteEvent,
  onViewRegistrations,
  onSendNewsletter,
  isDuplicating,
}: EventsListProps) {

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Events</CardTitle>
          <Button
            onClick={onCreateEvent}
            className="bg-pcs_blue hover:bg-pcs_blue/90"
            data-testid="button-create-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={eventFilters.status}
              onChange={(e) => onFiltersChange({ ...eventFilters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              data-testid="select-status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              value={eventFilters.eventType}
              onChange={(e) => onFiltersChange({ ...eventFilters, eventType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              data-testid="select-type-filter"
            >
              <option value="all">All Types</option>
              <option value="workshop">Workshop</option>
              <option value="webinar">Webinar</option>
              <option value="community_event">Community Event</option>
              <option value="training">Training</option>
              <option value="celebration">Celebration</option>
              <option value="assembly">Assembly</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={eventFilters.dateFrom}
              onChange={(e) => onFiltersChange({ ...eventFilters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              data-testid="input-date-from"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={eventFilters.dateTo}
              onChange={(e) => onFiltersChange({ ...eventFilters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              data-testid="input-date-to"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {eventsLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registrations</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <tr key={i} className="border-b animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Create your first event to get started"
            icon={Calendar}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="table-events">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registrations</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-gray-50" data-testid={`row-event-${event.id}`}>
                    <td className="px-4 py-3 text-sm text-gray-900" data-testid={`text-title-${event.id}`}>{event.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-type-${event.id}`}>
                      {event.eventType.replace('_', ' ').charAt(0).toUpperCase() + event.eventType.replace('_', ' ').slice(1)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-date-${event.id}`}>
                      {format(new Date(event.startDateTime), 'd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm" data-testid={`text-status-${event.id}`}>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'published' ? 'bg-green-100 text-green-700' :
                        event.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-registrations-${event.id}`}>
                      {event.registrationsCount || 0}
                      {event.capacity && ` / ${event.capacity}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditEvent(event)}
                          data-testid={`button-edit-${event.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDuplicateEvent(event.id)}
                          disabled={isDuplicating}
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          data-testid={`button-duplicate-${event.id}`}
                          title="Duplicate event"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewRegistrations(event)}
                          data-testid={`button-view-registrations-${event.id}`}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        {event.publicSlug && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`/events/${event.publicSlug}`, '_blank');
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid={`button-view-page-${event.id}`}
                            title={`View event: /events/${event.publicSlug}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteEvent(event)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-${event.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {event.status === 'published' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSendNewsletter(event)}
                            className="text-pcs_blue hover:text-pcs_blue/80 hover:bg-pcs_blue/10"
                            data-testid={`button-send-newsletter-${event.id}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
