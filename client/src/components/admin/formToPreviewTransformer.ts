import { type CaseStudyData } from '@/components/case-study-preview';

interface School {
  id: string;
  name: string;
  country?: string;
  location?: string;
}

export function transformFormToPreview(
  formData: any,
  school?: School
): CaseStudyData {
  return {
    id: formData.id || 'preview-draft',
    title: formData.title || 'Untitled Case Study',
    description: formData.description || '<p>Start writing your case study description...</p>',
    stage: formData.stage || 'inspire',
    impact: formData.impact || '',
    imageUrl: formData.images?.[0]?.url || '',
    featured: false,
    evidenceLink: formData.evidenceLink || null,
    evidenceFiles: null,
    schoolId: formData.schoolId || '',
    schoolName: school?.name || 'Your School',
    schoolCountry: school?.country || '',
    location: school?.location || '',
    createdAt: new Date().toISOString(),
    createdByName: 'Preview',
    
    images: formData.images?.map((img: any) => ({
      url: img.url,
      caption: img.caption || ''
    })) || [],
    
    videos: formData.videos || [],
    
    beforeImage: formData.beforeImage || '',
    afterImage: formData.afterImage || '',
    
    studentQuotes: formData.studentQuotes || [],
    
    impactMetrics: formData.impactMetrics || [],
    
    timelineSections: formData.timelineSections?.map((section: any, index: number) => ({
      ...section,
      order: section.order !== undefined ? section.order : index
    })) || [],
    
    categories: [],
    tags: []
  };
}
