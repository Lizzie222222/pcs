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
  // Use hero image if set, otherwise use first gallery image
  const heroImage = formData.imageUrl || formData.images?.[0]?.url || '';
  
  return {
    id: formData.id || 'preview-draft',
    title: formData.title || 'Untitled Case Study',
    description: formData.description || '<p>Start writing your case study description...</p>',
    stage: formData.stage || 'inspire',
    impact: formData.impact || '',
    imageUrl: heroImage,
    featured: formData.featured || false,
    evidenceLink: formData.evidenceLink || null,
    evidenceFiles: null,
    schoolId: formData.schoolId || '',
    schoolName: school?.name || 'Your School',
    schoolCountry: school?.country || '',
    location: school?.location || '',
    createdAt: new Date().toISOString(),
    createdByName: 'Preview',
    
    // Map images with proper structure
    images: formData.images?.map((img: any) => ({
      url: img.url || img,
      caption: img.caption || '',
      altText: img.altText || ''
    })) || [],
    
    // Include videos
    videos: formData.videos?.map((vid: any) => ({
      url: vid.url || vid,
      title: vid.title || '',
      description: vid.description || ''
    })) || [],
    
    // Include before/after images for visual story template
    beforeImage: formData.beforeImage || '',
    afterImage: formData.afterImage || '',
    
    // Include student quotes
    studentQuotes: formData.studentQuotes?.map((quote: any) => ({
      quote: quote.quote || quote.text || '',
      studentName: quote.studentName || quote.name || '',
      studentAge: quote.studentAge || quote.age,
      studentRole: quote.studentRole || quote.role || ''
    })) || [],
    
    // Include impact metrics
    impactMetrics: formData.impactMetrics?.map((metric: any) => ({
      label: metric.label || '',
      value: metric.value || '',
      unit: metric.unit || '',
      description: metric.description || ''
    })) || [],
    
    // Include timeline sections
    timelineSections: formData.timelineSections?.map((section: any, index: number) => ({
      title: section.title || '',
      description: section.description || '',
      date: section.date || '',
      order: section.order !== undefined ? section.order : index
    })) || [],
    
    // Include categories and tags
    categories: formData.categories || [],
    tags: formData.tags || []
  };
}
