/**
 * Shared constants for admin sections
 */

export const QUERY_KEYS = {
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_EVIDENCE: '/api/admin/evidence',
  ADMIN_AUDITS: '/api/admin/audits/pending',
  ADMIN_PHOTO_CONSENT: '/api/admin/photo-consent/pending',
  ADMIN_SCHOOLS: '/api/admin/schools',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_EVENTS: '/api/admin/events',
  ADMIN_EVIDENCE_REQUIREMENTS: '/api/evidence-requirements',
  ADMIN_ACTIVITY_LOGS: '/api/admin/activity-logs',
  SCHOOL_TEACHERS: (schoolId: string) => `/api/admin/schools/${schoolId}/teachers`,
  SCHOOL_PROMISES: (schoolId: string) => `/api/reduction-promises/school/${schoolId}`,
  EVENT_REGISTRATIONS: (eventId: string) => `/api/admin/events/${eventId}/registrations`,
} as const;

export const PROGRAM_STAGES = [
  { value: 'inspire', label: 'Inspire' },
  { value: 'investigate', label: 'Investigate' },
  { value: 'act', label: 'Act' },
] as const;

export const EVIDENCE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export const AUDIT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;
