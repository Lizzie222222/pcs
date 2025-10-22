import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { X, Clock } from "lucide-react";
import type { 
  CaseStudy, 
  CaseStudyImage, 
  CaseStudyVideo, 
  StudentQuote, 
  ImpactMetric, 
  TimelineSection 
} from "@shared/schema";
import { 
  caseStudyImageSchema,
  caseStudyVideoSchema,
  studentQuoteSchema,
  impactMetricSchema,
  timelineSectionSchema
} from "@shared/schema";

import { SidebarWizardNav } from "./wizard/SidebarWizardNav";
import { WizardNavigation } from "./wizard/WizardNavigation";
import { Step1TemplateBasics } from "./wizard/steps/Step1TemplateBasics";
import { Step2Content } from "./wizard/steps/Step2Content";
import { Step3Media } from "./wizard/steps/Step3Media";
import { Step4Enhancements } from "./wizard/steps/Step4Enhancements";
import { Step5Review } from "./wizard/steps/Step5Review";
import { getTemplateConfig } from "./wizard/templateConfigurations";
import { useIsMobile } from "@/hooks/use-mobile";
import { PreviewContainer, PreviewToggleButton } from "./PreviewContainer";
import { CaseStudyPreview } from "@/components/case-study-preview";
import { transformFormToPreview } from "./formToPreviewTransformer";
import { VersionHistoryDialog } from "./VersionHistoryDialog";

interface CaseStudyEditorProps {
  caseStudy?: CaseStudy;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const caseStudyFormSchema = z.object({
  evidenceId: z.string().optional().nullable(),
  schoolId: z.string().min(1, "School is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  stage: z.enum(["inspire", "investigate", "act"], {
    required_error: "Program stage is required",
  }),
  impact: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  priority: z.number().default(0),
  images: z.array(caseStudyImageSchema).optional().default([]),
  videos: z.array(caseStudyVideoSchema).optional().default([]),
  studentQuotes: z.array(studentQuoteSchema).optional().default([]),
  impactMetrics: z.array(impactMetricSchema).optional().default([]),
  timelineSections: z.array(timelineSectionSchema).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["draft", "published"], {
    required_error: "Status is required",
  }),
  templateType: z.string().min(1, "Template is required"),
  beforeImage: z.string().optional().nullable(),
  afterImage: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  createdBy: z.string().min(1, "Creator is required"),
}).refine((data) => {
  // When publishing, enforce minimum media requirements based on template
  if (data.status === "published") {
    const config = getTemplateConfig(data.templateType);
    const imagesCount = data.images?.length || 0;
    
    // Check minimum images
    if (imagesCount < config.requiredFields.minImages) {
      return false;
    }
    
    // Check before/after if required
    if (config.requiredFields.requiresBeforeAfter && (!data.beforeImage || !data.afterImage)) {
      return false;
    }
    
    // Check template-specific requirements
    if (config.requiredFields.requiresMetrics) {
      const metricsCount = data.impactMetrics?.length || 0;
      if (metricsCount < (config.requiredFields.minMetrics || 0)) {
        return false;
      }
    }
    
    if (config.requiredFields.requiresTimeline) {
      const timelineCount = data.timelineSections?.length || 0;
      if (timelineCount < (config.requiredFields.minTimelineSections || 0)) {
        return false;
      }
    }
    
    if (config.requiredFields.requiresQuotes) {
      const quotesCount = data.studentQuotes?.length || 0;
      if (quotesCount < (config.requiredFields.minQuotes || 0)) {
        return false;
      }
    }
  }
  return true;
}, {
  message: "Publishing requirements not met. Check template requirements.",
  path: ["status"],
});

type CaseStudyFormData = z.infer<typeof caseStudyFormSchema>;

const WIZARD_STEPS = [
  { id: 1, label: "Template & Basics", description: "Choose layout" },
  { id: 2, label: "Content", description: "Write your story" },
  { id: 3, label: "Media", description: "Add images" },
  { id: 4, label: "Enhancements", description: "Quotes & metrics" },
  { id: 5, label: "Review & Publish", description: "Final check" },
];

export function CaseStudyEditor({ caseStudy, onSave, onCancel }: CaseStudyEditorProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [stepValidation, setStepValidation] = useState<Record<number, { valid: boolean; warnings: string[]; errors: string[] }>>({
    1: { valid: false, warnings: [], errors: [] },
    2: { valid: false, warnings: [], errors: [] },
    3: { valid: false, warnings: [], errors: [] },
    4: { valid: false, warnings: [], errors: [] },
    5: { valid: false, warnings: [], errors: [] },
  });

  const form = useForm<CaseStudyFormData>({
    resolver: zodResolver(caseStudyFormSchema),
    mode: "onChange",
    defaultValues: caseStudy ? {
      evidenceId: caseStudy.evidenceId || null,
      schoolId: caseStudy.schoolId,
      title: caseStudy.title,
      description: caseStudy.description || "",
      stage: caseStudy.stage,
      impact: caseStudy.impact || "",
      imageUrl: caseStudy.imageUrl || null,
      featured: caseStudy.featured || false,
      priority: caseStudy.priority || 0,
      images: (caseStudy.images as CaseStudyImage[]) || [],
      videos: (caseStudy.videos as CaseStudyVideo[]) || [],
      studentQuotes: (caseStudy.studentQuotes as StudentQuote[]) || [],
      impactMetrics: (caseStudy.impactMetrics as ImpactMetric[]) || [],
      timelineSections: (caseStudy.timelineSections as TimelineSection[]) || [],
      categories: Array.isArray(caseStudy.categories) ? caseStudy.categories : [],
      tags: Array.isArray(caseStudy.tags) ? caseStudy.tags : [],
      status: caseStudy.status || "draft",
      templateType: caseStudy.templateType || "standard",
      beforeImage: caseStudy.beforeImage || null,
      afterImage: caseStudy.afterImage || null,
      metaDescription: caseStudy.metaDescription || "",
      metaKeywords: caseStudy.metaKeywords || "",
      createdBy: caseStudy.createdBy,
    } : {
      evidenceId: null,
      schoolId: "",
      title: "",
      description: "",
      stage: "inspire" as const,
      impact: "",
      imageUrl: null,
      featured: false,
      priority: 0,
      images: [],
      videos: [],
      studentQuotes: [],
      impactMetrics: [],
      timelineSections: [],
      categories: [],
      tags: [],
      status: "draft" as const,
      templateType: "standard",
      beforeImage: null,
      afterImage: null,
      metaDescription: "",
      metaKeywords: "",
      createdBy: "",
    },
  });

  // Watch all form fields for live preview
  const formValues = form.watch();
  
  // Debounce for 300ms to avoid excessive re-renders
  const debouncedFormValues = useDebounce(formValues, 300);
  
  // Fetch school data based on selected schoolId
  const { data: school } = useQuery<{ id: string; name: string; country?: string; location?: string }>({
    queryKey: ['/api/schools', debouncedFormValues.schoolId],
    enabled: !!debouncedFormValues.schoolId,
  });
  
  // Transform form data to preview data
  const previewData = useMemo(
    () => transformFormToPreview(debouncedFormValues, school),
    [debouncedFormValues, school]
  );

  // Get detailed validation for a step
  const getStepValidationDetails = (step: number): { valid: boolean; warnings: string[]; errors: string[] } => {
    const values = form.getValues();
    const config = getTemplateConfig(values.templateType || "standard");
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (step) {
      case 1:
        // Template & Basics
        if (!values.schoolId) errors.push("School is required");
        if (!values.title) errors.push("Title is required");
        if (!values.stage) errors.push("Program stage is required");
        if (!values.templateType) errors.push("Template is required");
        break;
      
      case 2:
        // Content
        if (config.requiredFields.description && !values.description) {
          errors.push("Description is required");
        }
        if (config.requiredFields.impact && !values.impact) {
          errors.push("Impact is required");
        }
        if (values.description && values.description.length < 50) {
          warnings.push("Description is quite short");
        }
        break;
      
      case 3:
        // Media - warnings only for drafts, errors only for publishing
        const imagesCount = values.images?.length || 0;
        if (imagesCount < config.requiredFields.minImages) {
          warnings.push(`Recommended: ${config.requiredFields.minImages} images (currently ${imagesCount})`);
        }
        if (config.requiredFields.requiresBeforeAfter) {
          if (!values.beforeImage) warnings.push("Before image recommended");
          if (!values.afterImage) warnings.push("After image recommended");
        }
        if (imagesCount > 0 && imagesCount < 3) {
          warnings.push("Consider adding more images for better engagement");
        }
        break;
      
      case 4:
        // Enhancements
        const quotesCount = values.studentQuotes?.length || 0;
        const metricsCount = values.impactMetrics?.length || 0;
        const timelineCount = values.timelineSections?.length || 0;
        
        if (config.requiredFields.requiresQuotes && quotesCount < (config.requiredFields.minQuotes || 0)) {
          errors.push(`Need at least ${config.requiredFields.minQuotes} quotes (currently ${quotesCount})`);
        }
        if (config.requiredFields.requiresMetrics && metricsCount < (config.requiredFields.minMetrics || 0)) {
          errors.push(`Need at least ${config.requiredFields.minMetrics} metrics (currently ${metricsCount})`);
        }
        if (config.requiredFields.requiresTimeline && timelineCount < (config.requiredFields.minTimelineSections || 0)) {
          errors.push(`Need at least ${config.requiredFields.minTimelineSections} timeline sections (currently ${timelineCount})`);
        }
        
        if (quotesCount === 0 && !config.requiredFields.requiresQuotes) {
          warnings.push("Consider adding student quotes for authenticity");
        }
        if (metricsCount === 0 && !config.requiredFields.requiresMetrics) {
          warnings.push("Consider adding impact metrics to showcase results");
        }
        break;
      
      case 5:
        // Review - aggregate all previous validations
        for (let i = 1; i < 5; i++) {
          const stepVal = getStepValidationDetails(i);
          errors.push(...stepVal.errors);
          warnings.push(...stepVal.warnings);
        }
        if (!values.metaDescription) {
          warnings.push("Consider adding a meta description for better SEO");
        }
        break;
      
      default:
        break;
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  };

  // Validate current step (simple boolean)
  const validateStep = async (step: number): Promise<boolean> => {
    const validation = getStepValidationDetails(step);
    return validation.valid;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    
    if (!isValid) {
      toast({
        title: "Incomplete Step",
        description: "Please complete all required fields before proceeding",
        variant: "destructive",
      });
      return;
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }

    setCurrentStep(Math.min(currentStep + 1, WIZARD_STEPS.length));
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleStepChange = async (targetStep: number) => {
    // Always allow backward navigation
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    // For forward navigation, validate all steps between current and target
    const validSteps: number[] = [];
    for (let i = currentStep; i < targetStep; i++) {
      const isValid = await validateStep(i);
      if (!isValid) {
        const validation = getStepValidationDetails(i);
        toast({
          title: "Cannot Skip Steps",
          description: `Step ${i} has ${validation.errors.length} error(s) that must be resolved first.`,
          variant: "destructive",
        });
        return;
      }
      validSteps.push(i);
    }

    // Mark all validated steps as completed in a single update
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev);
      validSteps.forEach(step => newCompleted.add(step));
      return Array.from(newCompleted);
    });

    // All intermediate steps are valid, navigate to target
    setCurrentStep(targetStep);
  };

  const handleSave = async (data: CaseStudyFormData, publishStatus?: "draft" | "published") => {
    try {
      setIsSaving(true);
      
      const saveData = {
        ...data,
        status: publishStatus || data.status,
      };

      await onSave(saveData);
      
      toast({
        title: publishStatus === "published" ? "Published!" : "Saved!",
        description: `Case study has been ${publishStatus === "published" ? "published" : "saved as draft"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save case study",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    form.setValue("status", "draft");
    handleSave(data, "draft");
  };

  const handlePublish = async () => {
    // Set status to published first so Zod validation can check publish requirements
    form.setValue("status", "published");
    
    // Trigger form validation which runs Zod schema including the refine() rules
    const isValid = await form.trigger();
    
    if (!isValid) {
      // Get all form errors
      const errors = form.formState.errors;
      const errorMessages: string[] = [];
      
      // Check for publishing errors
      if (errors.status?.message) {
        errorMessages.push(errors.status.message);
      }
      
      // Check template requirements
      const data = form.getValues();
      const config = getTemplateConfig(data.templateType);
      const imagesCount = data.images?.length || 0;
      
      if (imagesCount < config.requiredFields.minImages) {
        errorMessages.push(`Need ${config.requiredFields.minImages} images (have ${imagesCount})`);
      }
      
      if (config.requiredFields.requiresBeforeAfter && (!data.beforeImage || !data.afterImage)) {
        errorMessages.push("Before and After images required");
      }
      
      toast({
        title: "Cannot Publish",
        description: errorMessages.length > 0 
          ? errorMessages.join(". ") 
          : "Please complete all required fields before publishing",
        variant: "destructive",
      });
      
      // Reset status back to draft
      form.setValue("status", "draft");
      return;
    }

    const data = form.getValues();
    handleSave(data, "published");
  };

  // State to track if current step is valid
  const [canProceedState, setCanProceedState] = useState(true);

  // Watch only the critical fields that affect validation
  const schoolId = form.watch('schoolId');
  const title = form.watch('title');
  const stage = form.watch('stage');
  const templateType = form.watch('templateType');
  const description = form.watch('description');
  const impact = form.watch('impact');
  const images = form.watch('images');
  const beforeImage = form.watch('beforeImage');
  const afterImage = form.watch('afterImage');
  const quotes = form.watch('studentQuotes');
  const metrics = form.watch('impactMetrics');
  const timeline = form.watch('timelineSections');

  // Update validation state whenever step changes or watched fields change
  useEffect(() => {
    const updateValidation = () => {
      const newValidation: Record<number, { valid: boolean; warnings: string[]; errors: string[] }> = {};
      for (let i = 1; i <= WIZARD_STEPS.length; i++) {
        newValidation[i] = getStepValidationDetails(i);
      }
      setStepValidation(newValidation);
      
      // Update canProceed for current step
      setCanProceedState(newValidation[currentStep].valid);
    };

    updateValidation();
  }, [currentStep, schoolId, title, stage, templateType, description, impact, images, beforeImage, afterImage, quotes, metrics, timeline]);

  return (
    <PreviewContainer
      preview={
        <CaseStudyPreview
          caseStudy={previewData}
          showHero={false}
          animate={false}
          className="scale-90 origin-top"
        />
      }
    >
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-editor-title">
                  {caseStudy ? "Edit Case Study" : "Create Case Study"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {form.watch("title") || "Untitled Case Study"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {caseStudy?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVersionHistoryOpen(true)}
                    data-testid="button-view-versions"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Version History
                  </Button>
                )}
                <PreviewToggleButton />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSaving}
                  data-testid="button-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className={isMobile ? "flex flex-col" : "grid grid-cols-[280px_1fr]"}>
              {/* Left: Sidebar Navigation (Desktop) or Mobile Button */}
              <SidebarWizardNav
                steps={WIZARD_STEPS}
                currentStep={currentStep}
                completedSteps={completedSteps}
                stepValidation={stepValidation}
                onStepChange={handleStepChange}
              />

              {/* Right: Step Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-8">
                  <div className="max-w-4xl mx-auto">
                    {/* Step Content */}
                    <section aria-labelledby={`step-${currentStep}-heading`} className="space-y-10">
                      {currentStep === 1 && (
                        <Step1TemplateBasics form={form} isEditing={!!caseStudy} />
                      )}
                      {currentStep === 2 && (
                        <Step2Content form={form} />
                      )}
                      {currentStep === 3 && (
                        <Step3Media form={form} templateType={templateType} />
                      )}
                      {currentStep === 4 && (
                        <Step4Enhancements form={form} />
                      )}
                      {currentStep === 5 && (
                        <Step5Review form={form} onStepChange={handleStepChange} />
                      )}
                    </section>

                    {/* Navigation */}
                    <WizardNavigation
                      currentStep={currentStep}
                      totalSteps={WIZARD_STEPS.length}
                      onNext={handleNext}
                      onPrevious={handlePrevious}
                      onSaveDraft={handleSaveDraft}
                      onPublish={handlePublish}
                      isFirstStep={currentStep === 1}
                      isLastStep={currentStep === WIZARD_STEPS.length}
                      isSaving={isSaving}
                      canProceed={canProceedState}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
      
      {caseStudy?.id && (
        <VersionHistoryDialog
          caseStudyId={caseStudy.id}
          open={versionHistoryOpen}
          onOpenChange={setVersionHistoryOpen}
          onRestore={() => {
            toast({
              title: "Version restored",
              description: "The case study has been restored to the selected version.",
            });
            window.location.reload();
          }}
        />
      )}
    </PreviewContainer>
  );
}
