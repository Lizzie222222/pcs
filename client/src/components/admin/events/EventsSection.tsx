import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import {
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileText,
  Mail,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  Bell,
  ExternalLink,
  Languages,
  BookOpen,
  Check,
  Copy,
  Table as TableIcon,
  ImageIcon,
  FileVideo,
  Trash
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
  EventFormData,
  BannerFormData,
  Banner,
  EventFilters,
  EventAnalytics,
  TeacherEmailsData,
  PageBuilderFormData
} from "./types";
import { format, parseISO } from "date-fns";
import { BANNER_GRADIENTS, getGradientById } from "@shared/gradients";

interface EventsSectionProps {
  allResources: any[];
  resourcesLoading: boolean;
}

export default function EventsSection({ allResources, resourcesLoading }: EventsSectionProps) {
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
  const [eventFormData, setEventFormData] = useState<EventFormData>({
    title: '',
    description: '',
    eventType: 'workshop',
    status: 'draft',
    startDateTime: '',
    endDateTime: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    imageUrl: '',
    capacity: '',
    waitlistEnabled: false,
    registrationDeadline: '',
    tags: '',
    isPreRecorded: false,
    recordingAvailableFrom: '',
    pagePublishedStatus: 'draft',
    accessType: 'open',
  });

  // Event image upload state
  const [uploadedEventImage, setUploadedEventImage] = useState<{ name: string; url: string; } | null>(null);
  const [isUploadingEventImage, setIsUploadingEventImage] = useState(false);
  const eventImageInputRef = useRef<HTMLInputElement>(null);

  // Newsletter state (SendGrid)
  const [announcingEvent, setAnnouncingEvent] = useState<Event | null>(null);
  const [newsletterDialogOpen, setNewsletterDialogOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<'all_teachers' | 'custom'>('all_teachers');
  const [customEmails, setCustomEmails] = useState<string>('');
  const [selectedEventsForDigest, setSelectedEventsForDigest] = useState<Set<string>>(new Set());
  const [digestDialogOpen, setDigestDialogOpen] = useState(false);

  // Page Builder state
  const [currentEventStep, setCurrentEventStep] = useState<1 | 2 | 3>(1);
  const [uploadingPackFiles, setUploadingPackFiles] = useState<Record<number, boolean>>({});
  const [showPageBuilderWarning, setShowPageBuilderWarning] = useState(false);
  const [eventDialogTab, setEventDialogTab] = useState<'details' | 'page-builder'>('details');
  const eventDialogContentRef = useRef<HTMLDivElement>(null);
  
  // Multi-language state
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const previousLanguageRef = useRef<string>('en');
  const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 'el', 'ar', 'zh'];
  const languageNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
    pt: 'Portuguese', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
    fi: 'Finnish', el: 'Greek', ar: 'Arabic', zh: 'Chinese'
  };
  
  // Translation states
  const [titleTranslations, setTitleTranslations] = useState<Record<string, string>>({});
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>({});
  const [youtubeVideoTranslations, setYoutubeVideoTranslations] = useState<Record<string, any[]>>({ en: [] });
  const [eventPackFileTranslations, setEventPackFileTranslations] = useState<Record<string, any[]>>({ en: [] });
  const [testimonialTranslations, setTestimonialTranslations] = useState<Record<string, any[]>>({ en: [] });
  const [evidenceSubmissionText, setEvidenceSubmissionText] = useState<Record<string, string>>({});
  
  // New configuration states
  const [featuredVideoIndex, setFeaturedVideoIndex] = useState<number>(0);
  const [eventPackBannerImageUrl, setEventPackBannerImageUrl] = useState<string>('');
  const [showEvidenceSubmission, setShowEvidenceSubmission] = useState<boolean>(false);
  const [isUploadingPackBanner, setIsUploadingPackBanner] = useState(false);

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

  // Page Builder form schema
  const pageBuilderSchema = z.object({
    publicSlug: z.string().optional(),
    youtubeVideos: z.array(z.object({
      title: z.string().min(1, "Title is required"),
      url: z.string().url("Must be a valid URL").refine((url) => {
        return url.includes('youtube.com') || url.includes('youtu.be');
      }, "Must be a valid YouTube URL"),
      description: z.string().optional(),
    })).optional(),
    eventPackFiles: z.array(z.object({
      title: z.string().min(1, "Title is required"),
      fileUrl: z.string().min(1, "File is required"),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      description: z.string().optional(),
    })).optional(),
    testimonials: z.array(z.object({
      quote: z.string().min(1, "Quote is required"),
      author: z.string().min(1, "Author name is required"),
      role: z.string().optional(),
    })).optional(),
    titleTranslations: z.record(z.string()).optional(),
    descriptionTranslations: z.record(z.string()).optional(),
    youtubeVideoTranslations: z.record(z.array(z.any())).optional(),
    eventPackFileTranslations: z.record(z.array(z.any())).optional(),
    testimonialTranslations: z.record(z.array(z.any())).optional(),
    featuredVideoIndex: z.number().optional(),
    eventPackBannerImageUrl: z.string().optional(),
    showEvidenceSubmission: z.boolean().optional(),
    evidenceSubmissionText: z.record(z.string()).optional(),
  });

  type PageBuilderFormDataType = z.infer<typeof pageBuilderSchema>;

  // Helper function to generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Page Builder form
  const pageBuilderForm = useForm<PageBuilderFormDataType>({
    resolver: zodResolver(pageBuilderSchema),
    defaultValues: {
      publicSlug: '',
      youtubeVideos: [],
      eventPackFiles: [],
      testimonials: [],
    },
  });

  const { fields: videoFields, append: appendVideo, remove: removeVideo, move: moveVideo, replace: replaceVideos } = useFieldArray({
    control: pageBuilderForm.control,
    name: "youtubeVideos",
  });

  const { fields: packFileFields, append: appendPackFile, remove: removePackFile, replace: replacePackFiles } = useFieldArray({
    control: pageBuilderForm.control,
    name: "eventPackFiles",
  });

  const { fields: testimonialFields, append: appendTestimonial, remove: removeTestimonial, replace: replaceTestimonials } = useFieldArray({
    control: pageBuilderForm.control,
    name: "testimonials",
  });

  // Reset step and tab when dialog opens/closes
  useEffect(() => {
    if (!eventDialogOpen) {
      setCurrentEventStep(1);
      setShowPageBuilderWarning(false);
      setEventDialogTab('details');
      setIsVirtualEventCreationInProgress(false);
    }
  }, [eventDialogOpen]);

  // Scroll to top when switching tabs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (eventDialogContentRef.current) {
        eventDialogContentRef.current.scrollTop = 0;
      }
      
      const dialogContent = document.querySelector('[role="dialog"] [data-radix-scroll-area-viewport], [role="dialog"].overflow-y-auto, [role="dialog"] > div');
      if (dialogContent) {
        dialogContent.scrollTop = 0;
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [eventDialogTab]);

  // Initialize page builder form when editing event
  useEffect(() => {
    if (editingEvent && eventDialogOpen) {
      const event = editingEvent as any;
      
      const videoTranslations = event.youtubeVideoTranslations || {};
      const fileTranslations = event.eventPackFileTranslations || {};
      const testTranslations = event.testimonialTranslations || {};
      
      if (!videoTranslations.en && event.youtubeVideos) {
        videoTranslations.en = event.youtubeVideos;
      }
      if (!fileTranslations.en && event.eventPackFiles) {
        fileTranslations.en = event.eventPackFiles;
      }
      if (!testTranslations.en && event.testimonials) {
        testTranslations.en = event.testimonials;
      }
      
      const loadedTitleTranslations = event.titleTranslations || {};
      const loadedDescriptionTranslations = event.descriptionTranslations || {};
      
      if (!loadedTitleTranslations.en && event.title) {
        loadedTitleTranslations.en = event.title;
      }
      if (!loadedDescriptionTranslations.en && event.description) {
        loadedDescriptionTranslations.en = event.description;
      }
      
      setTitleTranslations(loadedTitleTranslations);
      setDescriptionTranslations(loadedDescriptionTranslations);
      setYoutubeVideoTranslations(videoTranslations);
      setEventPackFileTranslations(fileTranslations);
      setTestimonialTranslations(testTranslations);
      setFeaturedVideoIndex(event.featuredVideoIndex || 0);
      setEventPackBannerImageUrl(event.eventPackBannerImageUrl || '');
      setShowEvidenceSubmission(event.showEvidenceSubmission || false);
      setEvidenceSubmissionText(event.evidenceSubmissionText || {});
      
      pageBuilderForm.reset({
        publicSlug: editingEvent.publicSlug || '',
        youtubeVideos: videoTranslations[selectedLanguage] || [],
        eventPackFiles: fileTranslations[selectedLanguage] || [],
        testimonials: testTranslations[selectedLanguage] || [],
      });
    } else if (!editingEvent && eventDialogOpen) {
      setTitleTranslations({});
      setDescriptionTranslations({});
      setYoutubeVideoTranslations({ en: [] });
      setEventPackFileTranslations({ en: [] });
      setTestimonialTranslations({ en: [] });
      setFeaturedVideoIndex(0);
      setEventPackBannerImageUrl('');
      setShowEvidenceSubmission(false);
      setEvidenceSubmissionText({});
      setSelectedLanguage('en');
      
      pageBuilderForm.reset({
        publicSlug: '',
        youtubeVideos: [],
        eventPackFiles: [],
        testimonials: [],
      });
    }
  }, [editingEvent, eventDialogOpen]);
  
  // Auto-save current language content before switching, then load new language content
  useEffect(() => {
    if (!eventDialogOpen) return;
    
    const previousLang = previousLanguageRef.current;
    
    if (previousLang !== selectedLanguage) {
      const currentFormValues = pageBuilderForm.getValues();
      
      console.log('[Language Switch] Switching from', previousLang, 'to', selectedLanguage);
      console.log('[Language Switch] Current form values:', currentFormValues);
      
      console.log('[Language Switch] Saving to', previousLang, ':', {
        videos: currentFormValues.youtubeVideos,
        files: currentFormValues.eventPackFiles,
        testimonials: currentFormValues.testimonials
      });
      
      const updatedVideoTranslations = {
        ...youtubeVideoTranslations,
        [previousLang]: currentFormValues.youtubeVideos || []
      };
      const updatedFileTranslations = {
        ...eventPackFileTranslations,
        [previousLang]: currentFormValues.eventPackFiles || []
      };
      const updatedTestimonialTranslations = {
        ...testimonialTranslations,
        [previousLang]: currentFormValues.testimonials || []
      };
      
      setYoutubeVideoTranslations(updatedVideoTranslations);
      setEventPackFileTranslations(updatedFileTranslations);
      setTestimonialTranslations(updatedTestimonialTranslations);
      
      previousLanguageRef.current = selectedLanguage;
      
      const currentVideos = updatedVideoTranslations[selectedLanguage] || [];
      const currentFiles = updatedFileTranslations[selectedLanguage] || [];
      const currentTestimonials = updatedTestimonialTranslations[selectedLanguage] || [];
      
      console.log('[Language Switch] Loading for', selectedLanguage, ':', {
        videos: currentVideos,
        files: currentFiles,
        testimonials: currentTestimonials
      });
      
      replaceVideos(currentVideos);
      replacePackFiles(currentFiles);
      replaceTestimonials(currentTestimonials);
    }
  }, [selectedLanguage, eventDialogOpen, youtubeVideoTranslations, eventPackFileTranslations, testimonialTranslations, replaceVideos, replacePackFiles, replaceTestimonials]);

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

  // Events mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/events', data);
      return await res.json();
    },
    onSuccess: (response: {message: string, event: Event}) => {
      const createdEvent = response.event;
      console.log('[Event Creation] Full response:', response);
      console.log('[Event Creation] Event created:', createdEvent);
      console.log('[Event Creation] isVirtual:', createdEvent.isVirtual, 'eventType:', createdEvent.eventType);
      
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
      
      const isVirtualOrWebinar = createdEvent.isVirtual || createdEvent.eventType === 'webinar';
      console.log('[Event Creation] isVirtualOrWebinar:', isVirtualOrWebinar);
      
      if (isVirtualOrWebinar) {
        console.log('[Event Creation] Virtual event detected - keeping dialog open and switching to page builder');
        
        setIsVirtualEventCreationInProgress(true);
        
        setEditingEvent(createdEvent);
        
        setEventFormData({
          title: createdEvent.title,
          description: createdEvent.description || '',
          eventType: createdEvent.eventType,
          status: createdEvent.status || 'draft',
          startDateTime: new Date(createdEvent.startDateTime).toISOString().slice(0, 16),
          endDateTime: new Date(createdEvent.endDateTime).toISOString().slice(0, 16),
          location: createdEvent.location || '',
          isVirtual: createdEvent.isVirtual ?? false,
          meetingLink: createdEvent.meetingLink || '',
          imageUrl: createdEvent.imageUrl || '',
          capacity: createdEvent.capacity?.toString() || '',
          waitlistEnabled: createdEvent.waitlistEnabled ?? false,
          registrationDeadline: createdEvent.registrationDeadline ? new Date(createdEvent.registrationDeadline).toISOString().slice(0, 16) : '',
          tags: createdEvent.tags?.join(', ') || '',
          isPreRecorded: createdEvent.isPreRecorded ?? false,
          recordingAvailableFrom: createdEvent.recordingAvailableFrom ? new Date(createdEvent.recordingAvailableFrom).toISOString().slice(0, 16) : '',
          pagePublishedStatus: createdEvent.pagePublishedStatus || 'draft',
          accessType: createdEvent.accessType || 'open',
        });
        
        pageBuilderForm.reset({
          publicSlug: createdEvent.publicSlug || generateSlug(createdEvent.title),
          youtubeVideos: (createdEvent.youtubeVideos as any[]) || [],
          eventPackFiles: (createdEvent.eventPackFiles as any[]) || [],
          testimonials: (createdEvent.testimonials as any[]) || [],
        });
        
        setTimeout(() => {
          console.log('[Event Creation] Switching to page-builder tab');
          setEventDialogTab('page-builder');
          setTimeout(() => {
            setIsVirtualEventCreationInProgress(false);
          }, 100);
        }, 250);
        
        console.log('[Event Creation] Dialog should remain open');
      } else {
        console.log('[Event Creation] Non-virtual event - closing dialog');
        setEventDialogOpen(false);
        setEventFormData({
          title: '',
          description: '',
          eventType: 'workshop',
          status: 'draft',
          startDateTime: '',
          endDateTime: '',
          location: '',
          isVirtual: false,
          meetingLink: '',
          imageUrl: '',
          capacity: '',
          waitlistEnabled: false,
          registrationDeadline: '',
          tags: '',
          isPreRecorded: false,
          recordingAvailableFrom: '',
          pagePublishedStatus: 'draft',
          accessType: 'open',
        });
        setUploadedEventImage(null);
        setEditingEvent(null);
      }
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
      setEventFormData({
        title: '',
        description: '',
        eventType: 'workshop',
        status: 'draft',
        startDateTime: '',
        endDateTime: '',
        location: '',
        isVirtual: false,
        meetingLink: '',
        imageUrl: '',
        capacity: '',
        waitlistEnabled: false,
        registrationDeadline: '',
        tags: '',
        isPreRecorded: false,
        recordingAvailableFrom: '',
        pagePublishedStatus: 'draft',
        accessType: 'open',
      });
      setUploadedEventImage(null);
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
      setEventFormData({
        title: duplicatedEvent.title,
        description: duplicatedEvent.description || '',
        eventType: duplicatedEvent.eventType,
        status: duplicatedEvent.status || 'draft',
        startDateTime: new Date(duplicatedEvent.startDateTime).toISOString().slice(0, 16),
        endDateTime: new Date(duplicatedEvent.endDateTime).toISOString().slice(0, 16),
        location: duplicatedEvent.location || '',
        isVirtual: duplicatedEvent.isVirtual ?? false,
        meetingLink: duplicatedEvent.meetingLink || '',
        imageUrl: duplicatedEvent.imageUrl || '',
        capacity: duplicatedEvent.capacity?.toString() || '',
        waitlistEnabled: duplicatedEvent.waitlistEnabled ?? false,
        registrationDeadline: duplicatedEvent.registrationDeadline ? new Date(duplicatedEvent.registrationDeadline).toISOString().slice(0, 16) : '',
        tags: duplicatedEvent.tags?.join(', ') || '',
        isPreRecorded: duplicatedEvent.isPreRecorded ?? false,
        recordingAvailableFrom: duplicatedEvent.recordingAvailableFrom ? new Date(duplicatedEvent.recordingAvailableFrom).toISOString().slice(0, 16) : '',
        pagePublishedStatus: duplicatedEvent.pagePublishedStatus || 'draft',
        accessType: duplicatedEvent.accessType || 'open',
      });
      if (duplicatedEvent.imageUrl) {
        setUploadedEventImage({ name: 'Event image', url: duplicatedEvent.imageUrl });
      }
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

  const updateEventPageContentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PageBuilderFormDataType }) => {
      return await apiRequest('PATCH', `/api/admin/events/${id}/page-content`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event page content.",
        variant: "destructive",
      });
    },
  });

  const updateEventStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/events/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event status.",
        variant: "destructive",
      });
    },
  });

  // Copy content from one language to another
  const copyContentFromLanguage = (sourceLang: string) => {
    if (sourceLang === selectedLanguage) {
      toast({
        title: "Same language selected",
        description: "Please select a different source language",
        variant: "destructive",
      });
      return;
    }
    
    if (titleTranslations[sourceLang]) {
      setTitleTranslations(prev => ({ ...prev, [selectedLanguage]: titleTranslations[sourceLang] }));
    }
    if (descriptionTranslations[sourceLang]) {
      setDescriptionTranslations(prev => ({ ...prev, [selectedLanguage]: descriptionTranslations[sourceLang] }));
    }
    
    const sourceVideos = youtubeVideoTranslations[sourceLang] || [];
    if (sourceVideos.length > 0) {
      setYoutubeVideoTranslations(prev => ({ ...prev, [selectedLanguage]: [...sourceVideos] }));
      pageBuilderForm.setValue('youtubeVideos', sourceVideos);
    }
    
    const sourceFiles = eventPackFileTranslations[sourceLang] || [];
    if (sourceFiles.length > 0) {
      setEventPackFileTranslations(prev => ({ ...prev, [selectedLanguage]: [...sourceFiles] }));
      pageBuilderForm.setValue('eventPackFiles', sourceFiles);
    }
    
    const sourceTestimonials = testimonialTranslations[sourceLang] || [];
    if (sourceTestimonials.length > 0) {
      setTestimonialTranslations(prev => ({ ...prev, [selectedLanguage]: [...sourceTestimonials] }));
      pageBuilderForm.setValue('testimonials', sourceTestimonials);
    }
    
    toast({
      title: "Content copied!",
      description: `Successfully copied content from ${languageNames[sourceLang]} to ${languageNames[selectedLanguage]}. You can now edit as needed.`,
    });
  };

  const savePageBuilderWithStatus = async (status: 'draft' | 'published') => {
    if (!editingEvent) return;

    try {
      const formValues = pageBuilderForm.getValues();
      
      const constructedVideoTranslations = { ...youtubeVideoTranslations };
      if (formValues.youtubeVideos && formValues.youtubeVideos.length > 0) {
        constructedVideoTranslations[selectedLanguage] = formValues.youtubeVideos;
      }
      
      const constructedFileTranslations = { ...eventPackFileTranslations };
      if (formValues.eventPackFiles && formValues.eventPackFiles.length > 0) {
        constructedFileTranslations[selectedLanguage] = formValues.eventPackFiles;
      }
      
      const constructedTestimonialTranslations = { ...testimonialTranslations };
      if (formValues.testimonials && formValues.testimonials.length > 0) {
        constructedTestimonialTranslations[selectedLanguage] = formValues.testimonials;
      }
      
      const pageData = {
        ...formValues,
        titleTranslations,
        descriptionTranslations,
        youtubeVideoTranslations: constructedVideoTranslations,
        eventPackFileTranslations: constructedFileTranslations,
        testimonialTranslations: constructedTestimonialTranslations,
        featuredVideoIndex,
        eventPackBannerImageUrl,
        showEvidenceSubmission,
        evidenceSubmissionText,
      };
      
      await updateEventPageContentMutation.mutateAsync({ 
        id: editingEvent.id, 
        data: pageData 
      });

      if (editingEvent.status !== status) {
        await updateEventStatusMutation.mutateAsync({ 
          id: editingEvent.id, 
          status 
        });
      }

      toast({
        title: "Success",
        description: `Event ${status === 'draft' ? 'saved as draft' : 'published'} successfully.`,
      });

      setEventDialogOpen(false);
      setEditingEvent(null);
      setIsVirtualEventCreationInProgress(false);
    } catch (error) {
      // Errors are already handled by individual mutations
    }
  };

  // Event image upload handler
  const handleEventImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, or WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingEventImage(true);

    try {
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const aclResponse = await apiRequest('PUT', '/api/evidence-files', {
        fileURL: uploadURL.split('?')[0],
        visibility: 'public',
        filename: file.name,
      });
      const { objectPath } = await aclResponse.json();

      setUploadedEventImage({ name: file.name, url: objectPath });
      setEventFormData({ ...eventFormData, imageUrl: objectPath });

      toast({
        title: "Success",
        description: "Image uploaded successfully.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingEventImage(false);
      if (eventImageInputRef.current) {
        eventImageInputRef.current.value = '';
      }
    }
  };

  const removeEventImage = () => {
    setUploadedEventImage(null);
    setEventFormData({ ...eventFormData, imageUrl: '' });
  };

  // PDF file upload handler for event pack files
  const handlePackFileUpload = async (file: File, index: number): Promise<{ fileUrl: string; fileName: string; fileSize: number } | null> => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "PDF must be less than 20MB.",
        variant: "destructive",
      });
      return null;
    }

    setUploadingPackFiles(prev => ({ ...prev, [index]: true }));

    try {
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      const uploadFileResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const aclResponse = await apiRequest('PUT', '/api/evidence-files', {
        fileURL: uploadURL.split('?')[0],
        visibility: 'public',
        filename: file.name,
      });
      const { objectPath } = await aclResponse.json();

      toast({
        title: "Success",
        description: "PDF uploaded successfully.",
      });

      return { fileUrl: objectPath, fileName: file.name, fileSize: file.size };
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingPackFiles(prev => ({ ...prev, [index]: false }));
    }
  };

  // Teacher emails query for SendGrid
  const { data: teacherEmailsData } = useQuery<TeacherEmailsData>({
    queryKey: ['/api/admin/teachers/emails'],
    enabled: newsletterDialogOpen || digestDialogOpen,
    retry: false,
  });

  // Event analytics query
  const { data: analytics, isLoading: analyticsLoading } = useQuery<EventAnalytics>({
    queryKey: ['/api/admin/events/analytics'],
  });

  // Send event announcement mutation (SendGrid)
  const sendAnnouncementMutation = useMutation({
    mutationFn: async ({ eventId, recipientType, customEmails }: { 
      eventId: string; 
      recipientType: 'all_teachers' | 'custom';
      customEmails?: string[];
    }) => {
      return await apiRequest('POST', `/api/admin/events/${eventId}/announce`, { 
        recipientType,
        customEmails: customEmails || []
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Event announcement sent to ${data.recipientCount} recipient(s) successfully.`,
      });
      setNewsletterDialogOpen(false);
      setAnnouncingEvent(null);
      setRecipientType('all_teachers');
      setCustomEmails('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send event announcement.",
        variant: "destructive",
      });
    },
  });

  // Send event digest mutation (SendGrid)
  const sendDigestMutation = useMutation({
    mutationFn: async ({ eventIds, recipientType, customEmails }: { 
      eventIds: string[]; 
      recipientType: 'all_teachers' | 'custom';
      customEmails?: string[];
    }) => {
      return await apiRequest('POST', '/api/admin/events/digest', { 
        eventIds, 
        recipientType,
        customEmails: customEmails || []
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Event digest sent to ${data.recipientCount} recipient(s) successfully.`,
      });
      setDigestDialogOpen(false);
      setSelectedEventsForDigest(new Set());
      setRecipientType('all_teachers');
      setCustomEmails('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send event digest.",
        variant: "destructive",
      });
    },
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/events/registrations/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Registration updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/events', viewingEventRegistrations?.id, 'registrations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update registration.",
        variant: "destructive",
      });
    },
  });

  // Event Banners queries
  const { data: banners = [], isLoading: bannersLoading } = useQuery<Banner[]>({
    queryKey: ['/api/admin/banners'],
    retry: false,
  });

  // Event Banners mutations
  const createBannerMutation = useMutation({
    mutationFn: async (data: any) => {
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
      setBannerFormData({
        text: '',
        eventId: '',
        backgroundColor: '#0066CC',
        textColor: '#FFFFFF',
        gradient: 'ocean',
        isActive: true,
      });
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
      setBannerFormData({
        text: '',
        eventId: '',
        backgroundColor: '#0066CC',
        textColor: '#FFFFFF',
        gradient: 'ocean',
        isActive: true,
      });
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

  // Event resources queries and mutations
  const { data: eventResources = [], isLoading: eventResourcesLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/events', editingEvent?.id, 'resources'],
    enabled: !!editingEvent,
  });

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
    onError: (error) => {
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
    onError: (error) => {
      toast({
        title: "Detachment Failed",
        description: "Failed to detach resource. Please try again.",
        variant: "destructive",
      });
    },
  });

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
                  {banners.map((banner) => (
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Events</CardTitle>
                <Button
                  onClick={() => {
                    setEditingEvent(null);
                    setEventFormData({
                      title: '',
                      description: '',
                      eventType: 'workshop',
                      status: 'draft',
                      startDateTime: '',
                      endDateTime: '',
                      location: '',
                      isVirtual: false,
                      meetingLink: '',
                      imageUrl: '',
                      capacity: '',
                      waitlistEnabled: false,
                      registrationDeadline: '',
                      tags: '',
                      isPreRecorded: false,
                      recordingAvailableFrom: '',
                      pagePublishedStatus: 'draft',
                      accessType: 'open',
                    });
                    setUploadedEventImage(null);
                    setEventDialogOpen(true);
                  }}
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
                    onChange={(e) => setEventFilters({ ...eventFilters, status: e.target.value })}
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
                    onChange={(e) => setEventFilters({ ...eventFilters, eventType: e.target.value })}
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
                    onChange={(e) => setEventFilters({ ...eventFilters, dateFrom: e.target.value })}
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
                    onChange={(e) => setEventFilters({ ...eventFilters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    data-testid="input-date-to"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="py-8">
                  <LoadingSpinner message="Loading events..." />
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
                                onClick={() => {
                                  setEditingEvent(event);
                                  setEventFormData({
                                    title: event.title,
                                    description: event.description || '',
                                    eventType: event.eventType,
                                    status: event.status || 'draft',
                                    startDateTime: new Date(event.startDateTime).toISOString().slice(0, 16),
                                    endDateTime: new Date(event.endDateTime).toISOString().slice(0, 16),
                                    location: event.location || '',
                                    isVirtual: event.isVirtual ?? false,
                                    meetingLink: event.meetingLink || '',
                                    imageUrl: event.imageUrl || '',
                                    capacity: event.capacity?.toString() || '',
                                    waitlistEnabled: event.waitlistEnabled ?? false,
                                    registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().slice(0, 16) : '',
                                    tags: event.tags?.join(', ') || '',
                                    isPreRecorded: event.isPreRecorded ?? false,
                                    recordingAvailableFrom: event.recordingAvailableFrom ? new Date(event.recordingAvailableFrom).toISOString().slice(0, 16) : '',
                                    pagePublishedStatus: event.pagePublishedStatus || 'draft',
                                    accessType: event.accessType || 'open',
                                  });
                                  if (event.imageUrl) {
                                    setUploadedEventImage({ name: 'Event image', url: event.imageUrl });
                                  } else {
                                    setUploadedEventImage(null);
                                  }
                                  setEventDialogOpen(true);
                                }}
                                data-testid={`button-edit-${event.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => duplicateEventMutation.mutate(event.id)}
                                disabled={duplicateEventMutation.isPending}
                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                data-testid={`button-duplicate-${event.id}`}
                                title="Duplicate event"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setViewingEventRegistrations(event);
                                  setRegistrationStatusFilter('all');
                                }}
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
                                onClick={() => {
                                  setDeletingEvent(event);
                                  setEventDeleteDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-${event.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {event.status === 'published' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAnnouncingEvent(event);
                                    setNewsletterDialogOpen(true);
                                  }}
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
                <div className="py-8">
                  <LoadingSpinner message="Loading analytics..." />
                </div>
              ) : !analytics ? (
                <EmptyState
                  title="No analytics available"
                  description="Analytics data will appear here once events are created"
                  icon={BarChart3}
                />
              ) : (
                <div className="space-y-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-pcs_blue" />
                        Total Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_blue" data-testid="metric-total-events">
                        {analytics.totalEvents}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Draft:</span>
                          <span className="font-medium" data-testid="metric-draft-events">{analytics.eventsByStatus.draft}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Published:</span>
                          <span className="font-medium" data-testid="metric-published-events">{analytics.eventsByStatus.published}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completed:</span>
                          <span className="font-medium" data-testid="metric-completed-events">{analytics.eventsByStatus.completed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cancelled:</span>
                          <span className="font-medium" data-testid="metric-cancelled-events">{analytics.eventsByStatus.cancelled}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Users className="h-4 w-4 text-pcs_teal" />
                        Total Registrations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_teal" data-testid="metric-total-registrations">
                        {analytics.totalRegistrations}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {analytics.registrationConversionRate.toFixed(1)}% conversion rate
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-pcs_yellow" />
                        Avg. Registrations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_yellow" data-testid="metric-avg-registrations">
                        {analytics.averageRegistrationsPerEvent.toFixed(1)}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">per event</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-pcs_coral" />
                        Upcoming Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-pcs_coral" data-testid="metric-upcoming-events">
                        {analytics.upcomingEventsCount}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {analytics.pastEventsCount} past events
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Events by Type */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Events by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.eventsByType.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.eventsByType}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#019ADE" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Events by Registration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Events by Registration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.topEvents.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.topEvents} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <YAxis 
                              dataKey="title" 
                              type="category" 
                              width={150}
                              tick={{ fontSize: 11 }}
                              tickFormatter={(value: string) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                            />
                            <XAxis type="number" />
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => {
                                if (name === 'registrations') {
                                  const capacity = props.payload.capacity;
                                  return [
                                    capacity ? `${value} / ${capacity}` : value, 
                                    'Registrations'
                                  ];
                                }
                                return [value, name];
                              }}
                            />
                            <Bar dataKey="registrations" fill="#019ADE" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Registrations Trend (Last 30 Days) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Registrations Trend (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.registrationsTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.registrationsTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value: string) => {
                              const date = new Date(value);
                              return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                          />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number) => [value, 'Registrations']}
                            labelFormatter={(label: string) => new Date(label).toLocaleDateString('en-GB')}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#02BBB4" 
                            strokeWidth={2}
                            name="Daily Registrations"
                            dot={{ fill: '#02BBB4' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        No registration data in the last 30 days
                      </div>
                    )}
                  </CardContent>
                </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Banner Dialogs */}
      <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-banner-dialog-title">
              {editingBanner ? 'Edit Event Banner' : 'Create Event Banner'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event <span className="text-red-500">*</span>
              </label>
              <select
                value={bannerFormData.eventId}
                onChange={(e) => setBannerFormData({ ...bannerFormData, eventId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-event"
                required
              >
                <option value="">Select an event</option>
                {events
                  .filter(e => e.status === 'published')
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banner Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={bannerFormData.text}
                onChange={(e) => setBannerFormData({ ...bannerFormData, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Join us for our upcoming event..."
                data-testid="input-banner-text"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gradient Style
              </label>
              <select
                value={bannerFormData.gradient}
                onChange={(e) => {
                  const selectedGradient = getGradientById(e.target.value);
                  setBannerFormData({ 
                    ...bannerFormData, 
                    gradient: e.target.value,
                    textColor: selectedGradient?.textColorRecommended || '#FFFFFF'
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-gradient"
              >
                {BANNER_GRADIENTS.map((gradient) => (
                  <option key={gradient.id} value={gradient.id}>
                    {gradient.name}
                  </option>
                ))}
              </select>
              <div 
                className="mt-2 h-8 rounded-md"
                style={{
                  background: getGradientById(bannerFormData.gradient)?.gradient || '',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Color
              </label>
              <input
                type="color"
                value={bannerFormData.textColor}
                onChange={(e) => setBannerFormData({ ...bannerFormData, textColor: e.target.value })}
                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md cursor-pointer"
                data-testid="input-text-color"
              />
              <span className="text-xs text-gray-500 mt-1 block">{bannerFormData.textColor}</span>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={bannerFormData.isActive}
                onChange={(e) => setBannerFormData({ ...bannerFormData, isActive: e.target.checked })}
                className="h-4 w-4 text-pcs_blue rounded border-gray-300 focus:ring-pcs_blue"
                data-testid="checkbox-is-active"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (display on landing page)
              </label>
            </div>

            {bannerFormData.text && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div 
                  className="p-4 rounded-md text-center font-semibold"
                  style={{
                    background: getGradientById(bannerFormData.gradient)?.gradient || bannerFormData.backgroundColor,
                    color: bannerFormData.textColor,
                  }}
                >
                  {bannerFormData.text}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBannerDialogOpen(false);
                setEditingBanner(null);
                setBannerFormData({
                  text: '',
                  eventId: '',
                  backgroundColor: '#0066CC',
                  textColor: '#FFFFFF',
                  gradient: 'ocean',
                  isActive: true,
                });
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!bannerFormData.eventId || !bannerFormData.text) {
                  toast({
                    title: "Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                  });
                  return;
                }

                if (editingBanner) {
                  updateBannerMutation.mutate({
                    id: editingBanner.id,
                    data: bannerFormData,
                  });
                } else {
                  createBannerMutation.mutate(bannerFormData);
                }
              }}
              disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-save-banner"
            >
              {createBannerMutation.isPending || updateBannerMutation.isPending 
                ? 'Saving...' 
                : editingBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={() => {
                setBannerDeleteDialogOpen(false);
                setDeletingBanner(null);
              }}
              data-testid="button-cancel-delete"
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
              data-testid="button-confirm-delete"
            >
              {deleteBannerMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Event Dialog - Multi-Step Wizard */}
      <Dialog 
        open={eventDialogOpen} 
        onOpenChange={(open) => {
          // Prevent closing if we're in the middle of virtual event creation workflow
          if (!open && isVirtualEventCreationInProgress) {
            console.log('[Dialog] Preventing close during virtual event creation');
            return;
          }
          setEventDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" ref={eventDialogContentRef}>
          <DialogHeader>
            <DialogTitle data-testid="text-event-dialog-title">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={eventDialogTab} onValueChange={(value) => setEventDialogTab(value as 'details' | 'page-builder')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details" data-testid="tab-trigger-details">
                Event Details
              </TabsTrigger>
              <TabsTrigger value="page-builder" data-testid="tab-trigger-page-builder" className="relative">
                Page Builder
                {(eventFormData.isVirtual || eventFormData.eventType === 'webinar') && (
                  <Badge className="ml-2 bg-amber-500 hover:bg-amber-600 text-white" data-testid="page-builder-badge">
                    Important
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" data-testid="tab-content-details">
              <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-event-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={eventFormData.description}
                onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                rows={4}
                data-testid="textarea-event-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={eventFormData.eventType}
                  onChange={(e) => setEventFormData({ ...eventFormData, eventType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-event-type"
                >
                  <option value="workshop">Workshop</option>
                  <option value="webinar">Webinar</option>
                  <option value="community_event">Community Event</option>
                  <option value="training">Training</option>
                  <option value="celebration">Celebration</option>
                  <option value="assembly">Assembly</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={eventFormData.status}
                  onChange={(e) => setEventFormData({ ...eventFormData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-event-status"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.startDateTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, startDateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="input-start-datetime"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.endDateTime}
                  onChange={(e) => setEventFormData({ ...eventFormData, endDateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="input-end-datetime"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-event-location"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={eventFormData.isVirtual}
                onChange={(e) => setEventFormData({ ...eventFormData, isVirtual: e.target.checked })}
                className="h-4 w-4"
                data-testid="checkbox-is-virtual"
              />
              <label className="text-sm font-medium text-gray-700">
                Is Virtual Event
              </label>
            </div>
            {(eventFormData.isVirtual || eventFormData.eventType === 'webinar') && (
              <div className="p-4 bg-blue-50 border-l-4 border-pcs_blue rounded-md" data-testid="virtual-event-notice">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📺</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-pcs_blue mb-1">
                      This is a virtual event!
                    </p>
                    <p className="text-sm text-gray-700">
                      Don't forget to configure your Event Page with live stream links after saving.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {eventFormData.isVirtual && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={eventFormData.meetingLink}
                  onChange={(e) => setEventFormData({ ...eventFormData, meetingLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://..."
                  data-testid="input-meeting-link"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image
              </label>
              
              {/* Hidden file input */}
              <input
                ref={eventImageInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleEventImageUpload}
                className="hidden"
                data-testid="input-event-image-file"
              />

              {!uploadedEventImage && !eventFormData.imageUrl ? (
                /* Upload button */
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => eventImageInputRef.current?.click()}
                  disabled={isUploadingEventImage}
                  className="w-full border-dashed border-2 h-32 flex flex-col items-center justify-center gap-2"
                  data-testid="button-upload-event-image"
                >
                  {isUploadingEventImage ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                      <span className="text-sm text-gray-600">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Click to upload event image</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WEBP (max 10MB)</span>
                    </>
                  )}
                </Button>
              ) : (
                /* Image preview */
                <div className="relative border border-gray-300 rounded-md overflow-hidden">
                  <img
                    src={eventFormData.imageUrl}
                    alt="Event preview"
                    className="w-full h-48 object-cover"
                    data-testid="image-event-preview"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => eventImageInputRef.current?.click()}
                      className="bg-white/90 hover:bg-white"
                      data-testid="button-change-event-image"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={removeEventImage}
                      className="bg-red-600/90 hover:bg-red-600"
                      data-testid="button-remove-event-image"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
                    <p className="text-xs truncate" data-testid="text-image-filename">
                      {uploadedEventImage?.name || 'Event image'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (optional)
              </label>
              <input
                type="number"
                value={eventFormData.capacity}
                onChange={(e) => setEventFormData({ ...eventFormData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Leave empty for unlimited"
                data-testid="input-capacity"
              />
            </div>
            {eventFormData.capacity && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventFormData.waitlistEnabled}
                  onChange={(e) => setEventFormData({ ...eventFormData, waitlistEnabled: e.target.checked })}
                  className="h-4 w-4"
                  data-testid="checkbox-waitlist"
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable Waitlist
                </label>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Deadline (optional)
              </label>
              <input
                type="datetime-local"
                value={eventFormData.registrationDeadline}
                onChange={(e) => setEventFormData({ ...eventFormData, registrationDeadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="input-registration-deadline"
              />
            </div>
            <div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={eventFormData.tags}
                onChange={(e) => setEventFormData({ ...eventFormData, tags: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g. plastic-free, sustainability, workshop"
                data-testid="input-tags"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page Published Status
                </label>
                <select
                  value={eventFormData.pagePublishedStatus}
                  onChange={(e) => setEventFormData({ ...eventFormData, pagePublishedStatus: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-page-published-status"
                >
                  <option value="draft">Draft (not visible)</option>
                  <option value="coming_soon">Coming Soon (teaser page)</option>
                  <option value="published">Published (full page)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Type
                </label>
                <select
                  value={eventFormData.accessType}
                  onChange={(e) => setEventFormData({ ...eventFormData, accessType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-access-type"
                >
                  <option value="open">Open (anyone can view)</option>
                  <option value="closed">Closed (requires login)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={eventFormData.isPreRecorded}
                onChange={(e) => setEventFormData({ ...eventFormData, isPreRecorded: e.target.checked })}
                className="h-4 w-4"
                data-testid="checkbox-is-pre-recorded"
              />
              <label className="text-sm font-medium text-gray-700">
                Is Pre-Recorded Event
              </label>
            </div>

            {eventFormData.isPreRecorded && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recording Available From
                </label>
                <input
                  type="datetime-local"
                  value={eventFormData.recordingAvailableFrom}
                  onChange={(e) => setEventFormData({ ...eventFormData, recordingAvailableFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="input-recording-available-from"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setEventDialogOpen(false)}
              data-testid="button-cancel-event-details"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!eventFormData.title || !eventFormData.description || !eventFormData.startDateTime || !eventFormData.endDateTime) {
                  toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Convert datetime strings to ISO format, handling both datetime-local and ISO formats
                const convertToISO = (dateStr: string): string => {
                  if (!dateStr) throw new Error('Date is required');
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) throw new Error('Invalid date');
                  return date.toISOString();
                };

                const eventData: any = {
                  title: eventFormData.title,
                  description: eventFormData.description,
                  eventType: eventFormData.eventType,
                  startDateTime: convertToISO(eventFormData.startDateTime),
                  endDateTime: convertToISO(eventFormData.endDateTime),
                  location: eventFormData.location || null,
                  isVirtual: eventFormData.isVirtual,
                  meetingLink: eventFormData.meetingLink || null,
                  imageUrl: eventFormData.imageUrl || null,
                  capacity: eventFormData.capacity ? parseInt(eventFormData.capacity) : null,
                  waitlistEnabled: eventFormData.waitlistEnabled,
                  registrationDeadline: eventFormData.registrationDeadline ? convertToISO(eventFormData.registrationDeadline) : null,
                  tags: eventFormData.tags ? eventFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                  isPreRecorded: eventFormData.isPreRecorded,
                  recordingAvailableFrom: eventFormData.recordingAvailableFrom ? convertToISO(eventFormData.recordingAvailableFrom) : null,
                  pagePublishedStatus: eventFormData.pagePublishedStatus,
                  accessType: eventFormData.accessType,
                };

                // Only include status if creating new event OR if status is actually changing
                if (!editingEvent) {
                  eventData.status = eventFormData.status;
                } else if (editingEvent.status !== eventFormData.status) {
                  eventData.status = eventFormData.status;
                }

                if (editingEvent) {
                  updateEventMutation.mutate({ id: editingEvent.id, data: eventData });
                } else {
                  createEventMutation.mutate(eventData);
                }
              }}
              disabled={createEventMutation.isPending || updateEventMutation.isPending}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-save-event"
            >
              {createEventMutation.isPending || updateEventMutation.isPending 
                ? 'Saving...' 
                : (eventFormData.isVirtual || eventFormData.eventType === 'webinar') 
                  ? 'Save & Configure Event Page →' 
                  : 'Save Event'
              }
            </Button>
          </div>
              </div>
            </TabsContent>

            <TabsContent value="page-builder" className="mt-4" data-testid="tab-content-page-builder">
              {!editingEvent ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Please save the event details first before configuring the page builder.</p>
                </div>
              ) : (
                <>
                  <Form {...pageBuilderForm}>
                  <form onSubmit={pageBuilderForm.handleSubmit(async (data) => {
                    // Use the same save logic as the save buttons to ensure all translations are included
                    if (editingEvent) {
                      await savePageBuilderWithStatus(editingEvent.status as 'draft' | 'published');
                    }
                  })} className="space-y-6">
                    
                    {/* Language Tabs */}
                    <div className="space-y-4 pb-4 border-b">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Language Selection</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Add content in multiple languages. Content will display in each user's preferred language.
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {supportedLanguages.map((lang) => {
                          const videoCount = youtubeVideoTranslations[lang]?.length || 0;
                          const fileCount = eventPackFileTranslations[lang]?.length || 0;
                          const contentCount = videoCount + fileCount;
                          
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setSelectedLanguage(lang)}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                                selectedLanguage === lang
                                  ? 'bg-pcs_blue text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              data-testid={`button-language-${lang}`}
                            >
                              <span>{lang.toUpperCase()}</span>
                              {contentCount > 0 && (
                                <Badge 
                                  variant={selectedLanguage === lang ? "secondary" : "default"}
                                  className={`ml-2 text-xs ${
                                    selectedLanguage === lang 
                                      ? 'bg-white/20 text-white border-white/30' 
                                      : 'bg-green-100 text-green-700 border-green-200'
                                  }`}
                                >
                                  {contentCount}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Content Overview Panel */}
                      <Collapsible className="mt-4">
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center justify-between"
                            data-testid="button-content-overview"
                          >
                            <span className="flex items-center gap-2">
                              <TableIcon className="h-4 w-4" />
                              View Translation Progress ({Object.keys(youtubeVideoTranslations).filter(lang => (youtubeVideoTranslations[lang]?.length || 0) > 0 || (eventPackFileTranslations[lang]?.length || 0) > 0).length} of {supportedLanguages.length} languages have content)
                            </span>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-4 py-2 text-left font-medium text-gray-700">Language</th>
                                  <th className="px-4 py-2 text-center font-medium text-gray-700">Videos</th>
                                  <th className="px-4 py-2 text-center font-medium text-gray-700">Files</th>
                                  <th className="px-4 py-2 text-center font-medium text-gray-700">Testimonials</th>
                                  <th className="px-4 py-2 text-center font-medium text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {supportedLanguages.map((lang) => {
                                  const videoCount = youtubeVideoTranslations[lang]?.length || 0;
                                  const fileCount = eventPackFileTranslations[lang]?.length || 0;
                                  const testimonialCount = testimonialTranslations[lang]?.length || 0;
                                  const hasTitle = !!titleTranslations[lang];
                                  const hasDescription = !!descriptionTranslations[lang];
                                  const totalContent = videoCount + fileCount + testimonialCount;
                                  
                                  return (
                                    <tr key={lang} className={selectedLanguage === lang ? 'bg-blue-50' : ''}>
                                      <td className="px-4 py-2 font-medium">
                                        {languageNames[lang]}
                                        {selectedLanguage === lang && (
                                          <Badge variant="outline" className="ml-2 text-xs">Editing</Badge>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-center">{videoCount}</td>
                                      <td className="px-4 py-2 text-center">{fileCount}</td>
                                      <td className="px-4 py-2 text-center">{testimonialCount}</td>
                                      <td className="px-4 py-2 text-center">
                                        {totalContent > 0 || hasTitle || hasDescription ? (
                                          <Badge variant="default" className="bg-green-100 text-green-700">
                                            {totalContent} items
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-500">
                                            Empty
                                          </Badge>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    {/* Multi-Language Content Section */}
                    <div className="space-y-4 pb-4 border-b">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">Multi-Language Content</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Leave blank to use the default title/description from the Details tab
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!editingEvent) return;
                            
                            // Can't translate English to itself
                            if (selectedLanguage === 'en') {
                              toast({
                                title: "Cannot translate English",
                                description: "English is the source language. Switch to another language tab to auto-translate.",
                                description: "English is the source language. Switch to another language tab to auto-translate.",
                                variant: "default",
                              });
                              return;
                            }
                            
                            // Check if already translated
                            if (titleTranslations[selectedLanguage] || descriptionTranslations[selectedLanguage]) {
                              toast({
                                title: "Already translated",
                                description: `${languageNames[selectedLanguage]} content already exists. Edit the fields below or clear them first to re-translate.`,
                                variant: "default",
                              });
                              return;
                            }
                            
                            // Show loading toast
                            toast({
                              title: "Translating...",
                              description: `Translating to ${languageNames[selectedLanguage]}. This may take a moment.`,
                            });
                            
                            try {
                              const response = await apiRequest('POST', `/api/admin/events/${editingEvent.id}/auto-translate`, { 
                                languages: [selectedLanguage]
                              });
                              
                              const data = await response.json();
                              
                              // Update state with translations (merge with existing)
                              setTitleTranslations(prev => ({...prev, ...data.titleTranslations}));
                              setDescriptionTranslations(prev => ({...prev, ...data.descriptionTranslations}));
                              
                              toast({
                                title: "Translation complete! 🎉",
                                description: `Successfully translated to ${languageNames[selectedLanguage]}. Remember to click "Save Changes" below to persist!`,
                              });
                            } catch (error) {
                              console.error('Auto-translate error:', error);
                              toast({
                                title: "Translation failed",
                                description: "Failed to auto-translate content. Please check that the event has a title and description.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex items-center gap-2"
                          data-testid="button-auto-translate"
                        >
                          <Languages className="h-4 w-4" />
                          Auto-Translate to {languageNames[selectedLanguage]}
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Event Title ({selectedLanguage.toUpperCase()})
                          </label>
                          <Input
                            value={titleTranslations[selectedLanguage] || ''}
                            onChange={(e) => {
                              setTitleTranslations(prev => ({
                                ...prev,
                                [selectedLanguage]: e.target.value
                              }));
                            }}
                            placeholder={`Enter event title in ${languageNames[selectedLanguage]}...`}
                            data-testid={`input-title-translation-${selectedLanguage}`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Event Description ({selectedLanguage.toUpperCase()})
                          </label>
                          <Textarea
                            value={descriptionTranslations[selectedLanguage] || ''}
                            onChange={(e) => {
                              setDescriptionTranslations(prev => ({
                                ...prev,
                                [selectedLanguage]: e.target.value
                              }));
                            }}
                            placeholder={`Enter event description in ${languageNames[selectedLanguage]}...`}
                            rows={4}
                            data-testid={`textarea-description-translation-${selectedLanguage}`}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Public Slug Section */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">Public Event Page</h3>
                      <FormField
                        control={pageBuilderForm.control}
                        name="publicSlug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Slug (Optional - Auto-generated from title)</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Leave blank to auto-generate from event title"
                                  data-testid="input-public-slug"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  if (eventFormData.title) {
                                    const slug = generateSlug(eventFormData.title);
                                    pageBuilderForm.setValue('publicSlug', slug);
                                  }
                                }}
                                data-testid="button-generate-slug"
                              >
                                Regenerate
                              </Button>
                            </div>
                            {field.value && (
                              <FormDescription data-testid="text-slug-preview">
                                Preview: <a href={`/events/${field.value}`} target="_blank" rel="noopener noreferrer" className="text-pcs_blue hover:underline">/events/{field.value}</a>
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* YouTube Videos Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">YouTube Videos</h3>
                          <Badge variant="outline" className="mt-1 text-xs">
                            For {languageNames[selectedLanguage]} users
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendVideo({ title: '', url: '', description: '' })}
                          data-testid="button-add-video"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Video
                        </Button>
                      </div>
                      
                      {videoFields.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No videos added yet. Click "Add Video" to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {videoFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md space-y-3" data-testid={`video-item-${index}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Video {index + 1}</span>
                                <div className="flex gap-2">
                                  {index > 0 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveVideo(index, index - 1)}
                                      data-testid={`button-move-up-video-${index}`}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {index < videoFields.length - 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveVideo(index, index + 1)}
                                      data-testid={`button-move-down-video-${index}`}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeVideo(index)}
                                    data-testid={`button-remove-video-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`youtubeVideos.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid={`input-video-title-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`youtubeVideos.${index}.url`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>YouTube URL *</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="https://www.youtube.com/watch?v=..." data-testid={`input-video-url-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`youtubeVideos.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid={`textarea-video-description-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Provide translated video titles and descriptions. You can also link to different videos per language by adding/removing videos in each language.
                      </p>
                    </div>

                    {/* Display Settings Section */}
                    {videoFields.length >= 2 && (
                      <div className="space-y-3 pt-4 border-t">
                        <h3 className="text-lg font-semibold text-gray-900">Display Settings</h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Featured Video (Main Display)
                          </label>
                          <Select
                            value={featuredVideoIndex.toString()}
                            onValueChange={(value) => setFeaturedVideoIndex(parseInt(value))}
                          >
                            <SelectTrigger data-testid="select-featured-video">
                              <SelectValue placeholder="Select featured video" />
                            </SelectTrigger>
                            <SelectContent>
                              {videoFields.map((_, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  Video {index + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            The featured video will be displayed prominently at the top, with other videos shown as thumbnails below.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Event Pack Banner Image Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="text-lg font-semibold text-gray-900">Event Pack Banner Image</h3>
                      <p className="text-sm text-gray-600">
                        Upload a custom banner image for the event pack section (recommended size: 1200x300px). If not provided, a default banner will be used.
                      </p>
                      <div className="space-y-3">
                        {!eventPackBannerImageUrl ? (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsUploadingPackBanner(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    const response = await fetch('/api/objects/upload', {
                                      method: 'POST',
                                      method: 'POST',
                                      body: formData,
                                      credentials: 'include',
                                    });
                                    if (!response.ok) throw new Error('Upload failed');
                                    const data = await response.json();
                                    setEventPackBannerImageUrl(data.url);
                                    toast({
                                      title: "Success",
                                      description: "Banner image uploaded successfully.",
                                    });
                                  } catch (error: any) {
                                    toast({
                                      title: "Upload Failed",
                                      description: error.message || "Failed to upload banner image.",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setIsUploadingPackBanner(false);
                                  }
                                }
                                e.target.value = '';
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pcs_blue file:text-white hover:file:bg-pcs_blue/90"
                              data-testid="input-pack-banner-upload"
                              disabled={isUploadingPackBanner}
                            />
                            {isUploadingPackBanner && (
                              <p className="text-sm text-gray-600 mt-2">Uploading...</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative border rounded-md overflow-hidden">
                              <img
                                src={`/api/objects${eventPackBannerImageUrl}`}
                                alt="Event pack banner"
                                className="w-full h-auto max-h-48 object-cover"
                                data-testid="img-pack-banner-preview"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setEventPackBannerImageUrl('')}
                              data-testid="button-remove-pack-banner"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Remove Banner
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Pack Files Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Event Pack Files</h3>
                          <Badge variant="outline" className="mt-1 text-xs">
                            For {languageNames[selectedLanguage]} users
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendPackFile({ title: '', fileUrl: '', fileName: '', fileSize: 0, description: '' })}
                          data-testid="button-add-pack-file"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add File
                        </Button>
                      </div>
                      
                      {packFileFields.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No files added yet. Click "Add File" to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {packFileFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md space-y-3" data-testid={`pack-file-item-${index}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">File {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePackFile(index)}
                                  data-testid={`button-remove-pack-file-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`eventPackFiles.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid={`input-pack-file-title-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`eventPackFiles.${index}.fileUrl`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>PDF File *</FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        {!field.value ? (
                                          <div>
                                            <input
                                              type="file"
                                              accept="application/pdf"
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  const result = await handlePackFileUpload(file, index);
                                                  if (result) {
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileUrl`, result.fileUrl);
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileName`, result.fileName);
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileSize`, result.fileSize);
                                                  }
                                                }
                                                e.target.value = '';
                                              }}
                                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pcs_blue file:text-white hover:file:bg-pcs_blue/90"
                                              data-testid={`input-pack-file-upload-${index}`}
                                              disabled={uploadingPackFiles[index]}
                                            />
                                            {uploadingPackFiles[index] && (
                                              <p className="text-sm text-gray-600">Uploading...</p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            {/* PDF Thumbnail Preview */}
                                            <div className="relative aspect-[4/3] w-full bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                              <PDFThumbnail
                                                url={`/api/objects${field.value}`}
                                                className="w-full h-full"
                                              />
                                            </div>
                                            {/* File Info and Actions */}
                                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                  <p className="text-sm font-medium text-gray-900 truncate" data-testid={`text-pack-file-name-${index}`}>
                                                    {pageBuilderForm.watch(`eventPackFiles.${index}.fileName`) || 'File uploaded'}
                                                  </p>
                                                  {pageBuilderForm.watch(`eventPackFiles.${index}.fileSize`) && (
                                                    <p className="text-xs text-gray-500" data-testid={`text-pack-file-size-${index}`}>
                                                      {((pageBuilderForm.watch(`eventPackFiles.${index}.fileSize`) || 0) / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex gap-2 flex-shrink-0">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => window.open(`/api/objects${field.value}`, '_blank')}
                                                  data-testid={`button-download-pack-file-${index}`}
                                                >
                                                  <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileUrl`, '');
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileName`, '');
                                                    pageBuilderForm.setValue(`eventPackFiles.${index}.fileSize`, 0);
                                                  }}
                                                  data-testid={`button-remove-uploaded-file-${index}`}
                                                >
                                                  <Trash className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`eventPackFiles.${index}.description`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description (optional)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={2} data-testid={`textarea-pack-file-description-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resources Section */}
                    {editingEvent && (
                      <div className="space-y-3 pt-4 border-t">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Event Resources</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Select resources from your library to attach to this event
                          </p>
                        </div>
                        
                        {resourcesLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
                            <span className="text-gray-600">Loading resources...</span>
                          </div>
                        ) : allResources.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                            No resources available. Add resources from the Resources tab first.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {allResources.map((resource) => {
                              const isAttached = eventResources.some((er: any) => er.resourceId === resource.id);
                              
                              // Strip query strings for URL extension checking (handles GCS signed URLs)
                              const urlWithoutQuery = resource.fileUrl?.split('?')[0] || '';
                              const urlExtension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                              
                              const isImage = resource.fileType?.includes('image') || 
                                             ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(urlExtension);
                              const isPdf = resource.fileType?.includes('pdf') || urlExtension === 'pdf';
                              const isVideo = resource.fileType?.includes('video') || 
                                             ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(urlExtension);
                              
                              // Convert GCS URL to server proxy URL for CORS support
                              const getProxyUrl = (url: string | null) => {
                                if (!url) return '';
                                try {
                                  const urlObj = new URL(url);
                                  // Decode pathname to handle URL-encoded paths from GCS
                                  const pathname = decodeURIComponent(urlObj.pathname);
                                  
                                  // Extract object path from GCS URL
                                  const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
                                  if (privateUploadsMatch) {
                                    return `/objects/uploads/${privateUploadsMatch[1]}`;
                                  }
                                  
                                  const publicMatch = pathname.match(/\/public\/(.+)$/);
                                  if (publicMatch) {
                                    return `/objects/public/${publicMatch[1]}`;
                                  }
                                  
                                  // If already a proxy URL, return as is
                                  if (url.startsWith('/objects/')) {
                                    return url;
                                  }
                                  
                                  return url; // Fallback to original URL
                                } catch {
                                  return url; // Invalid URL, return original
                                }
                              };
                              
                              const imageProxyUrl = isImage ? getProxyUrl(resource.fileUrl) : '';
                              const pdfProxyUrl = isPdf ? getProxyUrl(resource.fileUrl) : '';
                              
                              return (
                                <Card
                                  key={resource.id}
                                  className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                                    isAttached ? 'border-2 border-pcs_blue bg-blue-50' : 'border hover:border-gray-400'
                                  }`}
                                  onClick={() => {
                                    if (isAttached) {
                                      detachResourceMutation.mutate({
                                        eventId: editingEvent.id,
                                        resourceId: resource.id,
                                      });
                                    } else {
                                      attachResourceMutation.mutate({
                                        eventId: editingEvent.id,
                                        resourceId: resource.id,
                                      });
                                    }
                                  }}
                                  data-testid={`button-resource-${resource.id}`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex flex-col items-center text-center space-y-2">
                                      <div className="relative w-full">
                                        {isImage && imageProxyUrl ? (
                                          <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                            <img 
                                              src={imageProxyUrl} 
                                              alt={resource.title}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                              }}
                                            />
                                            <ImageIcon className="h-12 w-12 text-gray-400 hidden" />
                                          </div>
                                        ) : isPdf && pdfProxyUrl ? (
                                          <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden">
                                            <PDFThumbnail
                                              url={pdfProxyUrl}
                                              className="w-full h-full"
                                            />
                                          </div>
                                        ) : (
                                          <div className="aspect-video w-full bg-gray-100 rounded-md flex items-center justify-center">
                                            {isVideo ? (
                                              <FileVideo className="h-12 w-12 text-gray-600" />
                                            ) : (
                                              <BookOpen className="h-12 w-12 text-gray-600" />
                                            )}
                                          </div>
                                        )}
                                        {isAttached && (
                                          <div className="absolute top-1 right-1 bg-pcs_blue rounded-full p-1 shadow-md">
                                            <Check className="h-4 w-4 text-white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="w-full">
                                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                          {resource.title}
                                        </p>
                                        <Badge variant="outline" className="mt-2 text-xs">
                                          {resource.stage}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Testimonials Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Testimonials</h3>
                          <Badge variant="outline" className="mt-1 text-xs">
                            For {languageNames[selectedLanguage]} users
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendTestimonial({ quote: '', author: '', role: '' })}
                          data-testid="button-add-testimonial"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Testimonial
                        </Button>
                      </div>
                      
                      {testimonialFields.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                          No testimonials added yet. Click "Add Testimonial" to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {testimonialFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md space-y-3" data-testid={`testimonial-item-${index}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Testimonial {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  size="sm"
                                  onClick={() => removeTestimonial(index)}
                                  data-testid={`button-remove-testimonial-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`testimonials.${index}.quote`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quote *</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} rows={3} data-testid={`textarea-testimonial-quote-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`testimonials.${index}.author`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Author Name *</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid={`input-testimonial-author-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={pageBuilderForm.control}
                                name={`testimonials.${index}.role`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Role/Title (optional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g. Teacher, School Principal" data-testid={`input-testimonial-role-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Evidence Submission Call-to-Action Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="text-lg font-semibold text-gray-900">Evidence Submission Call-to-Action</h3>
                      <p className="text-sm text-gray-600">
                        This section encourages registered users to submit evidence. Unauthenticated users will be prompted to sign up.
                      </p>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={showEvidenceSubmission}
                          onCheckedChange={setShowEvidenceSubmission}
                          data-testid="switch-show-evidence-submission"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Show Evidence Submission Section
                        </label>
                      </div>
                      
                      {showEvidenceSubmission && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CTA Text ({selectedLanguage.toUpperCase()})
                          </label>
                          <Textarea
                            value={evidenceSubmissionText[selectedLanguage] || ''}
                            onChange={(e) => {
                              setEvidenceSubmissionText(prev => ({
                                ...prev,
                                [selectedLanguage]: e.target.value
                              }));
                            }}
                            placeholder="Join the movement! Submit your school's evidence of plastic reduction and inspire others."
                            rows={3}
                            data-testid={`textarea-evidence-cta-${selectedLanguage}`}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Customize the call-to-action text for each language
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Form Actions - Prominent Save Section */}
                    <div className="sticky bottom-0 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-4 mt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-100 rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-900">✨ Content auto-saves when switching languages</p>
                            <p className="text-xs text-emerald-700">Click "Save & Publish" to finalize and make your event live to the world</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => savePageBuilderWithStatus('draft')}
                            disabled={updateEventPageContentMutation.isPending || updateEventStatusMutation.isPending}
                            data-testid="button-save-as-draft"
                            className="bg-white hover:bg-gray-50"
                          >
                            {updateEventPageContentMutation.isPending || updateEventStatusMutation.isPending ? 'Saving...' : 'Save as Draft'}
                          </Button>
                          <Button
                            type="button"
                            onClick={() => savePageBuilderWithStatus('published')}
                            disabled={updateEventPageContentMutation.isPending || updateEventStatusMutation.isPending}
                            className="bg-pcs_blue hover:bg-pcs_blue/90 text-white shadow-lg"
                            data-testid="button-save-and-publish"
                          >
                            {updateEventPageContentMutation.isPending || updateEventStatusMutation.isPending ? 'Publishing...' : '💾 Save & Publish'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
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

      {/* View Registrations Dialog */}
      <Dialog open={viewingEventRegistrations !== null} onOpenChange={(open) => !open && setViewingEventRegistrations(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-registrations-title">
              Registrations for {viewingEventRegistrations?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Status:
                </label>
                <select
                  value={registrationStatusFilter}
                  onChange={(e) => setRegistrationStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  data-testid="select-registration-status-filter"
                >
                  <option value="all">All</option>
                  <option value="registered">Registered</option>
                  <option value="attended">Attended</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="waitlisted">Waitlisted</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const headers = ['Name', 'Email', 'School', 'Country', 'Status', 'Registered Date'];
                  const rows = eventRegistrations.map(reg => [
                    `${reg.user.firstName} ${reg.user.lastName}`,
                    reg.user.email,
                    reg.school?.name || 'N/A',
                    reg.school?.country || 'N/A',
                    reg.status,
                    reg.registeredAt ? format(new Date(reg.registeredAt), 'd MMM yyyy HH:mm') : 'N/A'
                  ]);
                  
                  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${viewingEventRegistrations?.title.replace(/\s+/g, '_')}_registrations.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            
            {registrationsLoading ? (
              <div className="py-8">
                <LoadingSpinner message="Loading registrations..." />
              </div>
            ) : eventRegistrations.length === 0 ? (
              <EmptyState
                title="No registrations yet"
                description="This event has no registrations"
                icon={Users}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-registrations">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registered</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegistrations.map((registration) => (
                      <tr key={registration.id} className="border-b hover:bg-gray-50" data-testid={`row-registration-${registration.id}`}>
                        <td className="px-4 py-3 text-sm text-gray-900" data-testid={`text-name-${registration.id}`}>
                          {registration.user.firstName} {registration.user.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-email-${registration.id}`}>
                          {registration.user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-school-${registration.id}`}>
                          {registration.school?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm" data-testid={`text-status-${registration.id}`}>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            registration.status === 'attended' ? 'bg-green-100 text-green-700' :
                            registration.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                            registration.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {registration.status ? registration.status.charAt(0).toUpperCase() + registration.status.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-date-${registration.id}`}>
                          {registration.registeredAt ? format(new Date(registration.registeredAt), 'd MMM yyyy') : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {registration.status === 'registered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateRegistrationMutation.mutate({ id: registration.id, status: 'attended' });
                              }}
                              disabled={updateRegistrationMutation.isPending}
                              data-testid={`button-mark-attended-${registration.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Attended
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
