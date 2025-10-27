import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import {
  Plus,
  Edit,
  Trash2,
  Bell,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import type { Event } from "@shared/schema";
import type { 
  EventWithRegistrations, 
  EventRegistrationWithDetails, 
  BannerFormData,
  EventFilters,
  EventAnalytics,
  TeacherEmailsData
} from "./types";
import { BANNER_GRADIENTS, getGradientById } from "@shared/gradients";
import EventsList from "./EventsList";
import EventEditor from "./EventEditor";
import EventRegistrations from "./EventRegistrations";

interface EventsSectionProps {
  allResources: any[];
  resourcesLoading: boolean;
  activeTab: string;
}

export default function EventsSection({ allResources, resourcesLoading, activeTab }: EventsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Events state
  const [eventFilters, setEventFilters] = useState<EventFilters>({
    status: 'all',
    eventType: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [isVirtualEventCreationInProgress, setIsVirtualEventCreationInProgress] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [eventDeleteDialogOpen, setEventDeleteDialogOpen] = useState(false);
  const [viewingEventRegistrations, setViewingEventRegistrations] = useState<Event | null>(null);
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<string>('all');

  // Newsletter state (SendGrid)
  const [announcingEvent, setAnnouncingEvent] = useState<Event | null>(null);
  const [newsletterDialogOpen, setNewsletterDialogOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<'all_teachers' | 'custom'>('all_teachers');
  const [customEmails, setCustomEmails] = useState<string>('');

  // Event Banners state
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<any | null>(null);
  const [bannerDeleteDialogOpen, setBannerDeleteDialogOpen] = useState(false);
  const [bannerFormData, setBannerFormData] = useState<BannerFormData>({
    text: '',
    eventId: '',
    backgroundColor: '#0066CC',
    textColor: '#FFFFFF',
    gradient: 'ocean',
    isActive: true,
  });

  // Events queries
  const cleanEventFilters = (filters: typeof eventFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
  };

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventWithRegistrations[]>({
    queryKey: ['/api/admin/events', cleanEventFilters(eventFilters)],
    queryFn: async () => {
      const filters = cleanEventFilters(eventFilters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = `/api/admin/events${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: activeTab === 'events',
    retry: false,
  });

  const { data: eventRegistrations = [], isLoading: registrationsLoading } = useQuery<EventRegistrationWithDetails[]>({
    queryKey: ['/api/admin/events', viewingEventRegistrations?.id, 'registrations', registrationStatusFilter],
    queryFn: async () => {
      if (!viewingEventRegistrations) return [];
      const params = new URLSearchParams();
      if (registrationStatusFilter && registrationStatusFilter !== 'all') {
        params.append('status', registrationStatusFilter);
      }
      const url = `/api/admin/events/${viewingEventRegistrations.id}/registrations${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: viewingEventRegistrations !== null,
    retry: false,
  });

  const { data: eventResources = [] } = useQuery({
    queryKey: ['/api/admin/events', editingEvent?.id, 'resources'],
    queryFn: async () => {
      if (!editingEvent) return [];
      const res = await fetch(`/api/admin/events/${editingEvent.id}/resources`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!editingEvent,
    retry: false,
  });

  // Banners queries
  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['/api/admin/banners'],
    enabled: activeTab === 'events',
    retry: false,
  });

  // Events mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/events', data);
      return await res.json();
    },
    onSuccess: (response: {message: string, event: Event}) => {
      const createdEvent = response.event;
      
      const eventUrl = createdEvent.publicSlug 
        ? `${window.location.origin}/events/${createdEvent.publicSlug}`
        : null;
      
      toast({
        title: "Event Created Successfully! 🎉",
        description: eventUrl 
          ? (
              <div className="space-y-2">
                <p>Your event has been created.</p>
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded text-sm">
                  <span className="font-mono text-xs break-all">{eventUrl}</span>
                </div>
              </div>
            )
          : "Event created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      
      setEventDialogOpen(false);
      setEditingEvent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/admin/events/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      setEventDialogOpen(false);
      setEditingEvent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      setEventDeleteDialogOpen(false);
      setDeletingEvent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event.",
        variant: "destructive",
      });
    },
  });

  const duplicateEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/admin/events/${eventId}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (duplicatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
      toast({
        title: "Event Duplicated",
        description: `"${duplicatedEvent.title}" has been created as a draft.`,
      });
      setEditingEvent(duplicatedEvent);
      setEventDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Duplication Failed",
        description: error.message || "Failed to duplicate event",
        variant: "destructive",
      });
    },
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/event-registrations/${id}`, { status });
    },
    onMutate: async (variables) => {
      const queryKey = ['/api/admin/events', viewingEventRegistrations?.id, 'registrations', registrationStatusFilter];
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousRegistrations = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: EventRegistrationWithDetails[] = []) => {
        return old.map(reg => 
          reg.id === variables.id
            ? { ...reg, status: variables.status as any }
            : reg
        );
      });
      
      return { previousRegistrations, queryKey };
    },
    onError: (err, variables, context) => {
      if (context?.previousRegistrations && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousRegistrations);
      }
      toast({
        title: "Update Failed",
        description: "Failed to update attendance. Changes have been reverted.",
        variant: "destructive",
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Attendance Updated",
        description: `Registration marked as ${variables.status}.`,
      });
    },
    onSettled: (_, __, variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });

  // SendGrid newsletter mutation
  const sendAnnouncementMutation = useMutation({
    mutationFn: async ({ eventId, recipientType, customEmails }: { eventId: string; recipientType: string; customEmails: string[] }) => {
      return await apiRequest('POST', `/api/admin/events/${eventId}/send-announcement`, {
        recipientType,
        customEmails,
      });
    },
    onSuccess: () => {
      toast({
        title: "Announcement Sent! 📧",
        description: "Event announcement has been sent successfully.",
      });
      setNewsletterDialogOpen(false);
      setAnnouncingEvent(null);
      setRecipientType('all_teachers');
      setCustomEmails('');
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send announcement.",
        variant: "destructive",
      });
    },
  });

  // Teacher emails query for SendGrid
  const { data: teacherEmailsData } = useQuery<TeacherEmailsData>({
    queryKey: ['/api/admin/teachers/emails'],
    enabled: newsletterDialogOpen,
    retry: false,
  });

  // Event analytics query
  const { data: eventAnalytics, isLoading: analyticsLoading } = useQuery<EventAnalytics>({
    queryKey: ['/api/admin/events/analytics'],
    enabled: activeTab === 'events',
    retry: false,
  });

  // Banner mutations
  const createBannerMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      return await apiRequest('POST', '/api/admin/banners', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Banner created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setBannerDialogOpen(false);
      setEditingBanner(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create banner.",
        variant: "destructive",
      });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BannerFormData }) => {
      return await apiRequest('PUT', `/api/admin/banners/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Banner updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setBannerDialogOpen(false);
      setEditingBanner(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update banner.",
        variant: "destructive",
      });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/banners/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Banner deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/banners'] });
      setBannerDeleteDialogOpen(false);
      setDeletingBanner(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete banner.",
        variant: "destructive",
      });
    },
  });

  // Resource attachment mutations
  const attachResourceMutation = useMutation({
    mutationFn: async ({ eventId, resourceId }: { eventId: string; resourceId: string }) => {
      await apiRequest('POST', `/api/admin/events/${eventId}/resources`, { resourceId });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Resource Attached",
        description: "Resource has been successfully attached to the event.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events', variables.eventId, 'resources'] });
    },
    onError: () => {
      toast({
        title: "Attachment Failed",
        description: "Failed to attach resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const detachResourceMutation = useMutation({
    mutationFn: async ({ eventId, resourceId }: { eventId: string; resourceId: string }) => {
      await apiRequest('DELETE', `/api/admin/events/${eventId}/resources/${resourceId}`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Resource Detached",
        description: "Resource has been successfully detached from the event.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events', variables.eventId, 'resources'] });
    },
    onError: () => {
      toast({
        title: "Detachment Failed",
        description: "Failed to detach resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Event submit handler
  const handleEventSubmit = (data: any, isUpdate: boolean) => {
    if (isUpdate && editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-navy" data-testid="text-page-title">
            Events Management
          </CardTitle>
          <p className="text-gray-600 mt-2" data-testid="text-page-description">
            Manage events and registrations for the Plastic Clever Schools community
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manage" className="text-lg" data-testid="tab-trigger-manage-events">
            Manage Events
          </TabsTrigger>
          <TabsTrigger value="statistics" className="text-lg" data-testid="tab-trigger-event-statistics">
            Event Statistics
          </TabsTrigger>
        </TabsList>

        {/* Manage Events Tab */}
        <TabsContent value="manage">
          {/* Event Banners Section */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Banners</CardTitle>
                <Button
                  onClick={() => {
                    setEditingBanner(null);
                    setBannerFormData({
                      text: '',
                      eventId: '',
                      backgroundColor: '#0066CC',
                      textColor: '#FFFFFF',
                      gradient: 'ocean',
                      isActive: true,
                    });
                    setBannerDialogOpen(true);
                  }}
                  className="bg-pcs_blue hover:bg-pcs_blue/90"
                  data-testid="button-create-banner"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Banner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bannersLoading ? (
                <div className="py-4">
                  <LoadingSpinner message="Loading banners..." />
                </div>
              ) : banners.length === 0 ? (
                <EmptyState
                  title="No banners yet"
                  description="Create a banner to promote events on the landing page"
                  icon={Bell}
                />
              ) : (
                <div className="space-y-4">
                  {banners.map((banner: any) => (
                    <div
                      key={banner.id}
                      className="border rounded-lg p-4"
                      style={{
                        backgroundColor: banner.backgroundColor + '20',
                        borderColor: banner.backgroundColor,
                      }}
                      data-testid={`card-banner-${banner.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 
                              className="font-semibold text-lg"
                              style={{ color: banner.backgroundColor }}
                              data-testid={`text-banner-event-${banner.id}`}
                            >
                              {banner.event.title}
                            </h3>
                            {banner.isActive && (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2" data-testid={`text-banner-text-${banner.id}`}>
                            {banner.text}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Background: {banner.backgroundColor}</span>
                            <span>Text: {banner.textColor}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingBanner(banner);
                              setBannerFormData({
                                text: banner.text,
                                eventId: banner.eventId,
                                backgroundColor: banner.backgroundColor,
                                textColor: banner.textColor,
                                gradient: banner.gradient || 'ocean',
                                isActive: banner.isActive,
                              });
                              setBannerDialogOpen(true);
                            }}
                            data-testid={`button-edit-banner-${banner.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeletingBanner(banner);
                              setBannerDeleteDialogOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-banner-${banner.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events List */}
          <EventsList
            events={events}
            eventsLoading={eventsLoading}
            eventFilters={eventFilters}
            onFiltersChange={setEventFilters}
            onCreateEvent={() => {
              setEditingEvent(null);
              setEventDialogOpen(true);
            }}
            onEditEvent={(event) => {
              setEditingEvent(event);
              setEventDialogOpen(true);
            }}
            onDuplicateEvent={(eventId) => duplicateEventMutation.mutate(eventId)}
            onDeleteEvent={(event) => {
              setDeletingEvent(event);
              setEventDeleteDialogOpen(true);
            }}
            onViewRegistrations={(event) => {
              setViewingEventRegistrations(event);
              setRegistrationStatusFilter('all');
            }}
            onSendNewsletter={(event) => {
              setAnnouncingEvent(event);
              setNewsletterDialogOpen(true);
            }}
            isDuplicating={duplicateEventMutation.isPending}
          />
        </TabsContent>

        {/* Event Statistics Tab */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-pcs_blue" />
                Event Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-64 bg-gray-50 rounded-lg animate-pulse"></div>
                  <div className="h-64 bg-gray-50 rounded-lg animate-pulse"></div>
                </div>
              ) : !eventAnalytics ? (
                <EmptyState
                  title="No analytics yet"
                  description="Create events to view analytics"
                  icon={BarChart3}
                />
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Total Events</p>
                      <p className="text-3xl font-bold text-blue-900">{eventAnalytics.totalEvents}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Published Events</p>
                      <p className="text-3xl font-bold text-green-900">{eventAnalytics.publishedEvents}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">Total Registrations</p>
                      <p className="text-3xl font-bold text-purple-900">{eventAnalytics.totalRegistrations}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-700 font-medium">Avg per Event</p>
                      <p className="text-3xl font-bold text-amber-900">{eventAnalytics.averageRegistrationsPerEvent.toFixed(1)}</p>
                    </div>
                  </div>

                  {/* Registrations Over Time Chart */}
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-pcs_blue" />
                      <h3 className="text-lg font-semibold">Registrations Over Time</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={eventAnalytics.registrationsOverTime}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#0066CC" name="Registrations" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Events by Type Chart */}
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-pcs_blue" />
                      <h3 className="text-lg font-semibold">Events by Type</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={eventAnalytics.eventsByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#0066CC" name="Events" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Events by Registrations */}
                  <div className="bg-white p-6 rounded-lg border">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-pcs_blue" />
                      <h3 className="text-lg font-semibold">Top Events by Registrations</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={eventAnalytics.topEvents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="title" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="registrations" fill="#10b981" name="Registrations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Editor Dialog */}
      <EventEditor
        isOpen={eventDialogOpen}
        onClose={() => {
          setEventDialogOpen(false);
          setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        allResources={allResources}
        resourcesLoading={resourcesLoading}
        onSubmitEvent={handleEventSubmit}
        onAttachResource={(eventId, resourceId) => attachResourceMutation.mutate({ eventId, resourceId })}
        onDetachResource={(eventId, resourceId) => detachResourceMutation.mutate({ eventId, resourceId })}
        eventResources={eventResources}
        isVirtualEventCreationInProgress={isVirtualEventCreationInProgress}
      />

      {/* Event Registrations Dialog */}
      <EventRegistrations
        viewingEvent={viewingEventRegistrations}
        setViewingEvent={setViewingEventRegistrations}
        registrations={eventRegistrations}
        registrationsLoading={registrationsLoading}
        registrationStatusFilter={registrationStatusFilter}
        setRegistrationStatusFilter={setRegistrationStatusFilter}
        updateRegistrationMutation={updateRegistrationMutation}
      />

      {/* Delete Event Dialog */}
      <Dialog open={eventDeleteDialogOpen} onOpenChange={setEventDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-event-title">Delete Event</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete "{deletingEvent?.title}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEventDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deletingEvent) {
                  deleteEventMutation.mutate(deletingEvent.id);
                }
              }}
              disabled={deleteEventMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Banner Dialog */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-banner-dialog-title">
              {editingBanner ? 'Edit Banner' : 'Create Banner'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner Text <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={bannerFormData.text}
                onChange={(e) => setBannerFormData({ ...bannerFormData, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-banner-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event <span className="text-red-500">*</span>
              </label>
              <select
                value={bannerFormData.eventId}
                onChange={(e) => setBannerFormData({ ...bannerFormData, eventId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-banner-event"
              >
                <option value="">Select an event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gradient
              </label>
              <select
                value={bannerFormData.gradient}
                onChange={(e) => {
                  const gradient = getGradientById(e.target.value);
                  setBannerFormData({
                    ...bannerFormData,
                    gradient: e.target.value,
                    backgroundColor: gradient?.from || '#0066CC',
                    textColor: gradient?.textColor || '#FFFFFF',
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-banner-gradient"
              >
                {BANNER_GRADIENTS.map((gradient) => (
                  <option key={gradient.id} value={gradient.id}>{gradient.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={bannerFormData.isActive}
                onChange={(e) => setBannerFormData({ ...bannerFormData, isActive: e.target.checked })}
                className="h-4 w-4"
                data-testid="checkbox-banner-active"
              />
              <label className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBannerDialogOpen(false)}
              data-testid="button-cancel-banner"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingBanner) {
                  updateBannerMutation.mutate({ id: editingBanner.id, data: bannerFormData });
                } else {
                  createBannerMutation.mutate(bannerFormData);
                }
              }}
              disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-save-banner"
            >
              {createBannerMutation.isPending || updateBannerMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Banner Dialog */}
      <Dialog open={bannerDeleteDialogOpen} onOpenChange={setBannerDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-banner-title">Delete Banner</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete this banner? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBannerDeleteDialogOpen(false)}
              data-testid="button-cancel-delete-banner"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (deletingBanner) {
                  deleteBannerMutation.mutate(deletingBanner.id);
                }
              }}
              disabled={deleteBannerMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-banner"
            >
              {deleteBannerMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Newsletter Announcement Dialog (SendGrid) */}
      <Dialog open={newsletterDialogOpen} onOpenChange={setNewsletterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="text-newsletter-title">
              Send Event Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Send "{announcingEvent?.title}" via email to teachers.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Type
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as 'all_teachers' | 'custom')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-recipient-type"
              >
                <option value="all_teachers">All Teachers ({teacherEmailsData?.count || 0} teachers)</option>
                <option value="custom">Custom Email List</option>
              </select>
            </div>

            {recipientType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Addresses
                  <span className="text-xs text-gray-500 ml-2">(comma-separated)</span>
                </label>
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
                  placeholder="email1@example.com, email2@example.com"
                  data-testid="input-custom-emails"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewsletterDialogOpen(false);
                setAnnouncingEvent(null);
                setRecipientType('all_teachers');
                setCustomEmails('');
              }}
              data-testid="button-cancel-newsletter"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (announcingEvent) {
                  const emails = recipientType === 'custom' 
                    ? customEmails.split(',').map(e => e.trim()).filter(Boolean)
                    : [];
                  sendAnnouncementMutation.mutate({
                    eventId: announcingEvent.id,
                    recipientType,
                    customEmails: emails,
                  });
                }
              }}
              disabled={
                !announcingEvent || 
                (recipientType === 'custom' && !customEmails.trim()) ||
                sendAnnouncementMutation.isPending
              }
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-confirm-newsletter"
            >
              {sendAnnouncementMutation.isPending ? 'Sending...' : 'Send Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
