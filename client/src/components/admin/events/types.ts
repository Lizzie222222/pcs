import type { Event, EventRegistration } from "@shared/schema";

export interface EventWithRegistrations extends Event {
  registrationsCount?: number;
  registrationCount?: number;
  attendanceCount?: number;
}

export interface EventRegistrationWithDetails extends EventRegistration {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  school: {
    id: string;
    name: string;
    country: string;
  } | null;
}

export interface EventFormData {
  title: string;
  description: string;
  eventType: 'workshop' | 'webinar' | 'community_event' | 'training' | 'celebration' | 'assembly' | 'other';
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  startDateTime: string;
  endDateTime: string;
  location: string;
  isVirtual: boolean;
  meetingLink: string;
  imageUrl: string;
  capacity: string;
  waitlistEnabled: boolean;
  registrationDeadline: string;
  tags: string;
  isPreRecorded: boolean;
  recordingAvailableFrom: string;
  pagePublishedStatus: 'draft' | 'coming_soon' | 'published';
  accessType: 'open' | 'closed';
}

export interface BannerFormData {
  text: string;
  eventId: string;
  backgroundColor: string;
  textColor: string;
  gradient: string;
  isActive: boolean;
}

export interface Banner {
  id: string;
  text: string;
  eventId: string;
  backgroundColor: string;
  textColor: string;
  gradient: string | null;
  isActive: boolean;
  createdAt: string;
  event: {
    id: string;
    title: string;
    startDateTime: string;
    endDateTime: string;
    publicSlug: string | null;
  };
}

export interface EventFilters {
  status: string;
  eventType: string;
  dateFrom: string;
  dateTo: string;
}

export interface EventAnalytics {
  totalEvents: number;
  eventsByStatus: {
    draft: number;
    published: number;
    completed: number;
    cancelled: number;
  };
  totalRegistrations: number;
  averageRegistrationsPerEvent: number;
  registrationConversionRate: number;
  eventsByType: Array<{
    type: string;
    count: number;
  }>;
  topEvents: Array<{
    id: string;
    title: string;
    registrations: number;
    capacity: number | null;
  }>;
  registrationsTrend: Array<{
    date: string;
    count: number;
  }>;
  upcomingEventsCount: number;
  pastEventsCount: number;
}

export interface TeacherEmailsData {
  emails: string[];
  count: number;
}

export interface PageBuilderFormData {
  publicSlug?: string;
  youtubeVideos?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
  eventPackFiles?: Array<{
    title: string;
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string; // MIME type for reliable file type detection
    description?: string;
  }>;
  testimonials?: Array<{
    quote: string;
    author: string;
    role?: string;
  }>;
  titleTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  youtubeVideoTranslations?: Record<string, any[]>;
  eventPackFileTranslations?: Record<string, any[]>;
  testimonialTranslations?: Record<string, any[]>;
  featuredVideoIndex?: number;
  eventPackBannerImageUrl?: string;
  showEvidenceSubmission?: boolean;
  evidenceSubmissionText?: Record<string, string>;
}

export interface UploadedFile {
  name: string;
  url: string;
}
