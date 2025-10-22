export interface EvidenceFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface ImageItem {
  url: string;
  caption?: string;
}

export interface VideoItem {
  url: string;
  title?: string;
  platform?: string;
}

export interface StudentQuote {
  name: string;
  text: string;
  photo?: string;
  role?: string;
  age?: number;
}

export interface ImpactMetric {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

export interface TimelineSection {
  title: string;
  content: string;
  date?: string;
  order: number;
  imageUrl?: string;
}

export interface CaseStudyData {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  impact: string;
  imageUrl: string;
  featured: boolean;
  evidenceLink: string | null;
  evidenceFiles: EvidenceFile[] | null;
  schoolId: string;
  schoolName: string;
  schoolCountry: string;
  location: string;
  createdAt: string;
  createdByName: string;
  images?: ImageItem[];
  videos?: VideoItem[];
  studentQuotes?: StudentQuote[];
  impactMetrics?: ImpactMetric[];
  timelineSections?: TimelineSection[];
  beforeImage?: string;
  afterImage?: string;
  categories?: string[];
  tags?: string[];
}
