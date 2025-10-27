import type { ReductionPromise, Event, EventRegistration, EvidenceWithSchool, CaseStudy } from "@shared/schema";

export interface AdminStats {
  totalSchools: number;
  pendingEvidence: number;
  featuredCaseStudies: number;
  activeUsers: number;
}

export interface PendingEvidence {
  id: string;
  title: string;
  description: string;
  stage: string;
  status: string;
  visibility: string;
  submittedAt: string;
  schoolId: string;
  submittedBy: string;
  assignedTo: string | null;
  files: any[];
  videoLinks: string | null;
  school?: {
    id: string;
    name: string;
    country: string;
    photoConsentStatus?: 'pending' | 'approved' | 'rejected' | null;
    photoConsentDocumentUrl?: string | null;
  };
}

export interface SchoolData {
  id: string;
  name: string;
  country: string;
  currentStage: string;
  progressPercentage: number;
  currentRound?: number;
  inspireCompleted?: boolean;
  investigateCompleted?: boolean;
  actCompleted?: boolean;
  studentCount: number;
  createdAt: string;
  primaryContactId: string;
  primaryContactEmail: string | null;
  type?: string;
  address?: string;
  primaryLanguage?: string | null;
}

export interface VerificationRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  userId: string;
  userName: string;
  userEmail: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SchoolTeacher {
  userId: string;
  name: string;
  email: string;
  role: 'head_teacher' | 'teacher';
  isVerified: boolean;
  joinedAt: string;
}

export interface SchoolWithTeachers {
  id: string;
  name: string;
  country: string;
  teachers: SchoolTeacher[];
}

export interface PendingAudit {
  id: string;
  schoolId: string;
  submittedBy: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  part1Data: any;
  part2Data: any;
  part3Data: any;
  part4Data: any;
  resultsData?: any;
  totalPlasticItems?: number;
  topProblemPlastics?: any[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  submittedAt: string;
  school?: {
    id: string;
    name: string;
    country: string;
  };
  submitter?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface EvidenceRequirement {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  orderIndex: number;
  resourceUrl?: string | null;
  resourceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventWithRegistrations extends Event {
  registrationCount?: number;
  attendanceCount?: number;
}

export interface EventRegistrationWithDetails extends EventRegistration {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  school?: {
    id: string;
    name: string;
    country: string;
  };
}
