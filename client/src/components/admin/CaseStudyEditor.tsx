import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
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

import { WizardStepper } from "./wizard/WizardStepper";
import { WizardNavigation } from "./wizard/WizardNavigation";
import { Step1TemplateBasics } from "./wizard/steps/Step1TemplateBasics";
import { Step2Content } from "./wizard/steps/Step2Content";
import { Step3Media } from "./wizard/steps/Step3Media";
import { Step4Enhancements } from "./wizard/steps/Step4Enhancements";
import { Step5Review } from "./wizard/steps/Step5Review";
import { getTemplateConfig } from "./wizard/templateConfigurations";

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
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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

  // Validate current step
  const validateStep = async (step: number): Promise<boolean> => {
    const values = form.getValues();
    const config = getTemplateConfig(values.templateType || "standard");

    switch (step) {
      case 1:
        // Template & Basics
        return !!(values.schoolId && values.title && values.stage && values.templateType);
      
      case 2:
        // Content
        if (config.requiredFields.description && !values.description) return false;
        if (config.requiredFields.impact && !values.impact) return false;
        return true;
      
      case 3:
        // Media
        const imagesCount = values.images?.length || 0;
        if (imagesCount < config.requiredFields.minImages) return false;
        if (config.requiredFields.requiresBeforeAfter && (!values.beforeImage || !values.afterImage)) return false;
        return true;
      
      case 4:
        // Enhancements
        const quotesCount = values.studentQuotes?.length || 0;
        const metricsCount = values.impactMetrics?.length || 0;
        const timelineCount = values.timelineSections?.length || 0;
        
        if (config.requiredFields.requiresQuotes && quotesCount < (config.requiredFields.minQuotes || 0)) return false;
        if (config.requiredFields.requiresMetrics && metricsCount < (config.requiredFields.minMetrics || 0)) return false;
        if (config.requiredFields.requiresTimeline && timelineCount < (config.requiredFields.minTimelineSections || 0)) return false;
        return true;
      
      case 5:
        // Review - all previous validations
        return await validateStep(1) && await validateStep(2) && await validateStep(3) && await validateStep(4);
      
      default:
        return true;
    }
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
    const isValid = await validateStep(5);
    
    if (!isValid) {
      toast({
        title: "Cannot Publish",
        description: "Please complete all required fields before publishing",
        variant: "destructive",
      });
      return;
    }

    const data = form.getValues();
    form.setValue("status", "published");
    handleSave(data, "published");
  };

  // State to track if current step is valid
  const [canProceedState, setCanProceedState] = useState(true);

  // Check validation whenever form values or step changes
  useEffect(() => {
    validateStep(currentStep).then(setCanProceedState);
  }, [currentStep, form.watch()]);

  return (
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

          {/* Progress Stepper */}
          <WizardStepper 
            steps={WIZARD_STEPS} 
            currentStep={currentStep} 
            completedSteps={completedSteps}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="max-w-4xl mx-auto">
              {/* Step Content */}
              {currentStep === 1 && (
                <Step1TemplateBasics form={form} isEditing={!!caseStudy} />
              )}
              {currentStep === 2 && (
                <Step2Content form={form} />
              )}
              {currentStep === 3 && (
                <Step3Media form={form} />
              )}
              {currentStep === 4 && (
                <Step4Enhancements form={form} />
              )}
              {currentStep === 5 && (
                <Step5Review form={form} />
              )}

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
          </form>
        </Form>
      </div>
    </div>
  );
}
