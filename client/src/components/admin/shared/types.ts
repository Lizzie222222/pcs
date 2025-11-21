import type { ReductionPromise, Event, EventRegistration, EvidenceWithSchool, CaseStudy } from "@shared/schema";

export interface AdminStats {
  totalSchools: number;
  pendingEvidence: number;
  featuredCaseStudies: number;
  activeUsers: number;
  totalActions: number;
  pendingActionPlansCount: number;
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
  roundNumber: number;
  evidenceRequirementId?: string | null;
  isBonus?: boolean;
  files: any[];
  videoLinks: string | null;
  school?: {
    id: string;
    name: string;
    country: string;
    photoConsent?: {
      status: 'pending' | 'approved' | 'rejected' | null;
      documentUrl: string | null;
    } | null;
  };
  submitter?: {
    id: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean | null;
  } | null;
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
  primaryContactFirstName?: string | null;
  primaryContactLastName?: string | null;
  type?: string;
  address?: string;
  primaryLanguage?: string | null;
  adminEmail?: string | null;
  website?: string | null;
  postcode?: string | null;
  zipCode?: string | null;
  ageRanges?: string[];
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
  resourceIds?: string[] | null;
  customLinks?: Array<{ title: string; url: string }> | null;
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

export interface PendingActionPlan {
  id: string;
  schoolId: string;
  auditId: string | null;
  roundNumber: number;
  plasticItemType: string;
  plasticItemLabel: string;
  baselineQuantity: number;
  targetQuantity: number;
  reductionAmount: number;
  timeframeUnit: string;
  status: 'active' | 'completed' | 'abandoned';
  notes: string | null;
  createdBy: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  school?: {
    id: string;
    name: string;
    country: string;
  };
  submitter?: {
    id: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean | null;
  } | null;
  reviewer?: {
    id: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}
