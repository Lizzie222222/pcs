import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileText,
  Languages,
  BookOpen,
  Check,
  ImageIcon,
  FileVideo,
  Trash
} from "lucide-react";
import type { Event } from "@shared/schema";
import type { EventFormData } from "./types";

interface EventEditorProps {
  isOpen: boolean;
  onClose: () => void;
  editingEvent: Event | null;
  allResources: any[];
  resourcesLoading: boolean;
  onSubmitEvent: (data: any, isUpdate: boolean) => void;
  onAttachResource: (eventId: string, resourceId: string) => void;
  onDetachResource: (eventId: string, resourceId: string) => void;
  eventResources: any[];
  isVirtualEventCreationInProgress: boolean;
}

export default function EventEditor({
  isOpen,
  onClose,
  editingEvent,
  allResources,
  resourcesLoading,
  onSubmitEvent,
  onAttachResource,
  onDetachResource,
  eventResources,
  isVirtualEventCreationInProgress,
}: EventEditorProps) {
  const { toast } = useToast();

  // Form state
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
  
  // Configuration states
  const [featuredVideoIndex, setFeaturedVideoIndex] = useState<number>(0);
  const [eventPackBannerImageUrl, setEventPackBannerImageUrl] = useState<string>('');
  const [showEvidenceSubmission, setShowEvidenceSubmission] = useState<boolean>(false);
  const [isUploadingPackBanner, setIsUploadingPackBanner] = useState(false);

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
    if (!isOpen) {
      setCurrentEventStep(1);
      setShowPageBuilderWarning(false);
      setEventDialogTab('details');
    }
  }, [isOpen]);

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

  // Initialize form when editing event
  useEffect(() => {
    if (editingEvent && isOpen) {
      const event = editingEvent as any;
      
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
    } else if (!editingEvent && isOpen) {
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
  }, [editingEvent, isOpen]);
  
  // Auto-save current language content before switching, then load new language content
  useEffect(() => {
    if (!isOpen) return;
    
    const previousLang = previousLanguageRef.current;
    
    if (previousLang !== selectedLanguage) {
      const currentFormValues = pageBuilderForm.getValues();
      
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
      
      replaceVideos(currentVideos);
      replacePackFiles(currentFiles);
      replaceTestimonials(currentTestimonials);
    }
  }, [selectedLanguage, isOpen, youtubeVideoTranslations, eventPackFileTranslations, testimonialTranslations, replaceVideos, replacePackFiles, replaceTestimonials]);

  // Event image upload handler
  const handleEventImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WEBP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingEventImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      setUploadedEventImage({
        name: file.name,
        url: data.url,
      });
      
      setEventFormData(prev => ({
        ...prev,
        imageUrl: data.url,
      }));

      toast({
        title: "Success",
        description: "Image uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingEventImage(false);
    }
  };

  const removeEventImage = () => {
    setUploadedEventImage(null);
    setEventFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  // Pack file upload handler
  const handlePackFileUpload = async (file: File, index: number): Promise<{ fileUrl: string; fileName: string; fileSize: number } | null> => {
    if (!file.type.match(/application\/pdf/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "PDF must be less than 50MB.",
        variant: "destructive",
      });
      return null;
    }

    setUploadingPackFiles(prev => ({ ...prev, [index]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      
      toast({
        title: "Success",
        description: "PDF uploaded successfully.",
      });

      return {
        fileUrl: data.url,
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingPackFiles(prev => ({ ...prev, [index]: false }));
    }
  };

  // Submit handler
  const handleSave = () => {
    if (!eventFormData.title || !eventFormData.description || !eventFormData.startDateTime || !eventFormData.endDateTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Convert datetime strings to ISO format
    const convertToISO = (dateStr: string): string => {
      if (!dateStr) throw new Error('Date is required');
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      return date.toISOString();
    };

    // Save current language content before submitting
    const currentFormValues = pageBuilderForm.getValues();
    const finalVideoTranslations = {
      ...youtubeVideoTranslations,
      [selectedLanguage]: currentFormValues.youtubeVideos || []
    };
    const finalFileTranslations = {
      ...eventPackFileTranslations,
      [selectedLanguage]: currentFormValues.eventPackFiles || []
    };
    const finalTestimonialTranslations = {
      ...testimonialTranslations,
      [selectedLanguage]: currentFormValues.testimonials || []
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
      publicSlug: currentFormValues.publicSlug || (editingEvent?.publicSlug || generateSlug(eventFormData.title)),
      youtubeVideos: finalVideoTranslations.en || [],
      eventPackFiles: finalFileTranslations.en || [],
      testimonials: finalTestimonialTranslations.en || [],
      titleTranslations,
      descriptionTranslations,
      youtubeVideoTranslations: finalVideoTranslations,
      eventPackFileTranslations: finalFileTranslations,
      testimonialTranslations: finalTestimonialTranslations,
      featuredVideoIndex,
      eventPackBannerImageUrl,
      showEvidenceSubmission,
      evidenceSubmissionText,
    };

    // Only include status if creating new event OR if status is actually changing
    if (!editingEvent) {
      eventData.status = eventFormData.status;
    } else if (editingEvent.status !== eventFormData.status) {
      eventData.status = eventFormData.status;
    }

    onSubmitEvent(eventData, !!editingEvent);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Prevent closing if we're in the middle of virtual event creation workflow
        if (!open && isVirtualEventCreationInProgress) {
          return;
        }
        if (!open) {
          onClose();
        }
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
            
            <input
              ref={eventImageInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleEventImageUpload}
              className="hidden"
              data-testid="input-event-image-file"
            />

            {!uploadedEventImage && !eventFormData.imageUrl ? (
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
            onClick={onClose}
            data-testid="button-cancel-event-details"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-pcs_blue hover:bg-pcs_blue/90"
            data-testid="button-save-event-details"
          >
            {editingEvent ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </div>
    </TabsContent>

    {/* Page Builder Tab */}
    <TabsContent value="page-builder" data-testid="tab-content-page-builder">
      <Form {...pageBuilderForm}>
        <form className="space-y-6">
          {/* Language Selector */}
          <div className="pb-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Content Language
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create content in different languages for your event page
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {supportedLanguages.map(lang => (
                <Button
                  key={lang}
                  type="button"
                  variant={selectedLanguage === lang ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang)}
                  className={selectedLanguage === lang ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                  data-testid={`button-lang-${lang}`}
                >
                  {languageNames[lang]}
                </Button>
              ))}
            </div>
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
                  
                  toast({
                    title: "Translating...",
                    description: `Translating to ${languageNames[selectedLanguage]}. This may take a moment.`,
                  });
                  
                  try {
                    const response = await apiRequest('POST', `/api/admin/events/${editingEvent.id}/auto-translate`, { 
                      languages: [selectedLanguage]
                    });
                    
                    const data = await response.json();
                    
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
                      description: "Failed to auto-translate. Please try again or translate manually.",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex items-center gap-2"
                data-testid="button-auto-translate"
              >
                <Languages className="h-4 w-4" />
                Auto-Translate
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title ({languageNames[selectedLanguage]})
                </label>
                <Input
                  value={titleTranslations[selectedLanguage] || ''}
                  onChange={(e) => setTitleTranslations(prev => ({ ...prev, [selectedLanguage]: e.target.value }))}
                  placeholder={selectedLanguage === 'en' ? eventFormData.title : `Title in ${languageNames[selectedLanguage]}`}
                  data-testid="input-title-translation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description ({languageNames[selectedLanguage]})
                </label>
                <Textarea
                  value={descriptionTranslations[selectedLanguage] || ''}
                  onChange={(e) => setDescriptionTranslations(prev => ({ ...prev, [selectedLanguage]: e.target.value }))}
                  rows={4}
                  placeholder={selectedLanguage === 'en' ? eventFormData.description : `Description in ${languageNames[selectedLanguage]}`}
                  data-testid="textarea-description-translation"
                />
              </div>
            </div>
          </div>

          {/* Public Slug Section */}
          <div>
            <FormField
              control={pageBuilderForm.control}
              name="publicSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public URL Slug</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={generateSlug(eventFormData.title || 'event-name')}
                      data-testid="input-public-slug"
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500 mt-1">
                    Event page URL: {window.location.origin}/events/{field.value || generateSlug(eventFormData.title || 'event-name')}
                  </p>
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
                      <div className="flex items-center gap-2">
                        {index === featuredVideoIndex && (
                          <Badge variant="default" className="bg-green-500">Featured</Badge>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFeaturedVideoIndex(index)}
                          disabled={index === featuredVideoIndex}
                          data-testid={`button-set-featured-${index}`}
                        >
                          Set as Featured
                        </Button>
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
          </div>

          {/* Event Pack Banner Section */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Event Pack Banner Image</h3>
              <p className="text-sm text-gray-600 mt-1">
                Optional banner image displayed above event pack files
              </p>
            </div>
            
            <div>
              {!eventPackBannerImageUrl ? (
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
                        toast({
                          title: "Invalid file type",
                          description: "Please upload a JPG, PNG, or WEBP image.",
                          variant: "destructive",
                        });
                        return;
                      }

                      if (file.size > 10 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description: "Image must be less than 10MB.",
                          variant: "destructive",
                        });
                        return;
                      }

                      setIsUploadingPackBanner(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const response = await fetch('/api/objects/upload', {
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
                                  <div className="relative aspect-[4/3] w-full bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                    <PDFThumbnail
                                      url={`/api/objects${field.value}`}
                                      className="w-full h-full"
                                    />
                                  </div>
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
                    
                    const urlWithoutQuery = resource.fileUrl?.split('?')[0] || '';
                    const urlExtension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                    
                    const isImage = resource.fileType?.includes('image') || 
                                   ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(urlExtension);
                    const isPdf = resource.fileType?.includes('pdf') || urlExtension === 'pdf';
                    const isVideo = resource.fileType?.includes('video') || 
                                   ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(urlExtension);
                    
                    const getProxyUrl = (url: string | null) => {
                      if (!url) return '';
                      try {
                        const urlObj = new URL(url);
                        const pathname = decodeURIComponent(urlObj.pathname);
                        
                        const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
                        if (privateUploadsMatch) {
                          return `/objects/uploads/${privateUploadsMatch[1]}`;
                        }
                        
                        const publicMatch = pathname.match(/\/public\/(.+)$/);
                        if (publicMatch) {
                          return `/objects/public/${publicMatch[1]}`;
                        }
                        
                        if (url.startsWith('/objects/')) {
                          return url;
                        }
                        
                        return url;
                      } catch {
                        return url;
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
                            onDetachResource(editingEvent.id, resource.id);
                          } else {
                            onAttachResource(editingEvent.id, resource.id);
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
                          <FormLabel>Role/Position (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Teacher, School Name" data-testid={`input-testimonial-role-${index}`} />
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

          {/* Evidence Submission Configuration */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showEvidenceSubmission}
                onChange={(e) => setShowEvidenceSubmission(e.target.checked)}
                className="h-4 w-4"
                data-testid="checkbox-show-evidence-submission"
              />
              <label className="text-sm font-medium text-gray-700">
                Enable Evidence Submission
              </label>
            </div>
            
            {showEvidenceSubmission && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Evidence Submission Text ({languageNames[selectedLanguage]})
                </label>
                <Textarea
                  value={evidenceSubmissionText[selectedLanguage] || ''}
                  onChange={(e) => setEvidenceSubmissionText(prev => ({ ...prev, [selectedLanguage]: e.target.value }))}
                  rows={3}
                  placeholder="Enter instructions for evidence submission..."
                  data-testid="textarea-evidence-submission-text"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-page-builder"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-save-page-builder"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </TabsContent>
  </Tabs>
</DialogContent>
</Dialog>
  );
}
