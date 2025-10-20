// Template-specific field requirements
export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  requiredFields: {
    // Step 2: Content
    description: boolean;
    impact: boolean;
    
    // Step 3: Media
    requiresBeforeAfter: boolean;
    minImages: number;
    maxImages: number;
    allowVideos: boolean;
    
    // Step 4: Enhancements
    allowQuotes: boolean;
    requiresQuotes: boolean;
    minQuotes?: number;
    
    allowMetrics: boolean;
    requiresMetrics: boolean;
    minMetrics?: number;
    
    allowTimeline: boolean;
    requiresTimeline: boolean;
    minTimelineSections?: number;
  };
}

export const TEMPLATE_CONFIGURATIONS: Record<string, TemplateConfig> = {
  standard: {
    id: "standard",
    name: "Standard",
    description: "Comprehensive layout with all content types",
    requiredFields: {
      description: true,
      impact: true,
      requiresBeforeAfter: false,
      minImages: 1,
      maxImages: 12,
      allowVideos: true,
      allowQuotes: true,
      requiresQuotes: false,
      minQuotes: 0,
      allowMetrics: true,
      requiresMetrics: false,
      minMetrics: 0,
      allowTimeline: true,
      requiresTimeline: false,
      minTimelineSections: 0,
    },
  },
  
  visual: {
    id: "visual",
    name: "Visual Story",
    description: "Image-focused layout with before/after transformation",
    requiredFields: {
      description: true,
      impact: false,
      requiresBeforeAfter: true, // Visual stories NEED before/after
      minImages: 3,
      maxImages: 20,
      allowVideos: true,
      allowQuotes: true,
      requiresQuotes: false,
      minQuotes: 0,
      allowMetrics: false, // No metrics in visual template
      requiresMetrics: false,
      minMetrics: 0,
      allowTimeline: false, // No timeline in visual template
      requiresTimeline: false,
      minTimelineSections: 0,
    },
  },
  
  timeline: {
    id: "timeline",
    name: "Timeline",
    description: "Chronological journey with milestones",
    requiredFields: {
      description: true,
      impact: true,
      requiresBeforeAfter: false,
      minImages: 1,
      maxImages: 10,
      allowVideos: false, // No videos in timeline
      allowQuotes: true,
      requiresQuotes: false,
      minQuotes: 0,
      allowMetrics: false, // No metrics in timeline template
      requiresMetrics: false,
      minMetrics: 0,
      allowTimeline: true,
      requiresTimeline: true, // Timeline template REQUIRES timeline
      minTimelineSections: 3,
    },
  },
  
  metrics: {
    id: "metrics",
    name: "Impact Focused",
    description: "Data-driven layout highlighting measurable results",
    requiredFields: {
      description: true,
      impact: true,
      requiresBeforeAfter: false,
      minImages: 1,
      maxImages: 6,
      allowVideos: false, // Keep focus on metrics
      allowQuotes: true,
      requiresQuotes: false,
      minQuotes: 0,
      allowMetrics: true,
      requiresMetrics: true, // Metrics template REQUIRES metrics
      minMetrics: 3,
      allowTimeline: false, // No timeline in metrics template
      requiresTimeline: false,
      minTimelineSections: 0,
    },
  },
};

// Helper function to get template config
export function getTemplateConfig(templateType: string): TemplateConfig {
  return TEMPLATE_CONFIGURATIONS[templateType] || TEMPLATE_CONFIGURATIONS.standard;
}

// Helper to check if a field should be shown for a template
export function shouldShowField(templateType: string, fieldName: keyof TemplateConfig['requiredFields']): boolean {
  const config = getTemplateConfig(templateType);
  
  // Map field names to their visibility logic
  const fieldVisibilityMap: Record<string, boolean> = {
    beforeAfter: config.requiredFields.requiresBeforeAfter,
    quotes: config.requiredFields.allowQuotes,
    metrics: config.requiredFields.allowMetrics,
    timeline: config.requiredFields.allowTimeline,
    videos: config.requiredFields.allowVideos,
  };
  
  return fieldVisibilityMap[fieldName] !== undefined ? fieldVisibilityMap[fieldName] : true;
}
