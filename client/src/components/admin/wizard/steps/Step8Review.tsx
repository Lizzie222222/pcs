import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CategorisationSection } from "../../case-study-sections/CategorisationSection";
import { TemplateStatusSection } from "../../case-study-sections/TemplateStatusSection";
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Image as ImageIcon, 
  MessageSquare, 
  BarChart3, 
  Calendar, 
  Eye,
  FileText,
  BookOpen,
  Sparkles,
  Video,
  ArrowRight
} from "lucide-react";
import { getTemplateConfig } from "../templateConfigurations";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { PreviewToggleButton, usePreviewContext } from "../../PreviewContainer";
import { useQuery } from "@tanstack/react-query";

interface Step8ReviewProps {
  form: UseFormReturn<any>;
  onStepChange?: (step: number) => void;
}

// Helper component for displaying form values
function SummaryItem({ 
  label, 
  value, 
  isHtml = false, 
  preview = false, 
  fallback = "Not provided",
  testId
}: {
  label: string;
  value?: string | null;
  isHtml?: boolean;
  preview?: boolean;
  fallback?: string;
  testId?: string;
}) {
  if (!value || value.trim() === '') {
    return (
      <div className="flex justify-between items-start py-2 border-b last:border-0" data-testid={testId}>
        <span className="text-sm font-medium text-muted-foreground">{label}:</span>
        <span className="text-sm text-muted-foreground italic">{fallback}</span>
      </div>
    );
  }

  return (
    <div className="py-2 border-b last:border-0" data-testid={testId}>
      <span className="text-sm font-medium text-muted-foreground block mb-1">{label}:</span>
      {isHtml ? (
        <div 
          className={`prose prose-sm max-w-none dark:prose-invert ${preview ? 'line-clamp-3' : ''}`}
          dangerouslySetInnerHTML={{ __html: value }} 
        />
      ) : (
        <span className="text-sm">{value}</span>
      )}
    </div>
  );
}

// Helper component for requirement checklist items
function RequirementItem({ met, text, testId }: { met: boolean; text: string; testId?: string }) {
  return (
    <li className="flex items-start gap-2" data-testid={testId}>
      {met ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
      )}
      <span className={met ? "text-green-800 dark:text-green-200" : "text-destructive font-medium"}>
        {text}
      </span>
    </li>
  );
}

const PROGRAM_STAGE_LABELS: Record<string, string> = {
  inspire: "Inspire",
  investigate: "Investigate",
  act: "Act",
};

export function Step8Review({ form, onStepChange }: Step8ReviewProps) {
  const previewContext = usePreviewContext();
  const isMobile = previewContext?.isMobile ?? false;
  const formValues = form.watch();
  const templateType = formValues.templateType || "standard";
  const config = getTemplateConfig(templateType);

  // Fetch schools to get school name
  const { data: schools } = useQuery<any[]>({
    queryKey: ['/api/schools'],
  });

  const selectedSchool = schools?.find(school => school.id === formValues.schoolId);
  const schoolName = selectedSchool?.name || "Not selected";

  // Count media items
  const imageCount = formValues.images?.length || 0;
  const videoCount = formValues.videos?.length || 0;
  
  // Check if enhancements exist
  const hasQuotes = (formValues.studentQuotes?.length || 0) > 0;
  const hasMetrics = (formValues.impactMetrics?.length || 0) > 0;
  const hasTimeline = (formValues.timelineSections?.length || 0) > 0;
  const hasEnhancements = hasQuotes || hasMetrics || hasTimeline;

  // Validation checks
  const validationChecks = {
    hasTitle: !!formValues.title,
    hasSchool: !!formValues.schoolId,
    hasStage: !!formValues.stage,
    hasDescription: config.requiredFields.description ? !!formValues.description : true,
    hasRequiredImpact: config.requiredFields.impact ? !!formValues.impact : true,
    hasMinImages: imageCount >= config.requiredFields.minImages,
    hasBeforeAfter: config.requiredFields.requiresBeforeAfter 
      ? !!(formValues.beforeImage && formValues.afterImage)
      : true,
    hasMinQuotes: config.requiredFields.requiresQuotes
      ? (formValues.studentQuotes?.length || 0) >= (config.requiredFields.minQuotes || 0)
      : true,
    hasMinMetrics: config.requiredFields.requiresMetrics
      ? (formValues.impactMetrics?.length || 0) >= (config.requiredFields.minMetrics || 0)
      : true,
    hasMinTimeline: config.requiredFields.requiresTimeline
      ? (formValues.timelineSections?.length || 0) >= (config.requiredFields.minTimelineSections || 0)
      : true,
  };

  const allChecks = Object.values(validationChecks);
  const passedChecks = allChecks.filter(Boolean).length;
  const totalChecks = allChecks.length;
  const isReadyToPublish = allChecks.every(Boolean);

  // Build validation errors with step links
  const validationErrors: Array<{field: string; message: string; stepLink?: number; stepName?: string}> = [];
  
  if (!validationChecks.hasTitle) {
    validationErrors.push({
      field: "Title",
      message: "Please provide a title for your case study",
      stepLink: 1,
      stepName: "Template & Basics"
    });
  }
  
  if (!validationChecks.hasSchool) {
    validationErrors.push({
      field: "School",
      message: "Please select a school",
      stepLink: 1,
      stepName: "Template & Basics"
    });
  }
  
  if (!validationChecks.hasStage) {
    validationErrors.push({
      field: "Program Stage",
      message: "Please select a program stage",
      stepLink: 1,
      stepName: "Template & Basics"
    });
  }
  
  if (config.requiredFields.description && !validationChecks.hasDescription) {
    validationErrors.push({
      field: "Description",
      message: "Please provide a description",
      stepLink: 2,
      stepName: "Content"
    });
  }
  
  if (!validationChecks.hasRequiredImpact) {
    validationErrors.push({
      field: "Impact Summary",
      message: "Please provide an impact summary",
      stepLink: 2,
      stepName: "Content"
    });
  }
  
  if (!validationChecks.hasMinImages) {
    validationErrors.push({
      field: "Images",
      message: `Please add at least ${config.requiredFields.minImages} image(s). Currently have ${imageCount}.`,
      stepLink: 3,
      stepName: "Media"
    });
  }
  
  if (!validationChecks.hasBeforeAfter) {
    validationErrors.push({
      field: "Before & After",
      message: "Please upload both before and after images for the Visual Story template",
      stepLink: 3,
      stepName: "Media"
    });
  }
  
  if (!validationChecks.hasMinQuotes) {
    validationErrors.push({
      field: "Student Quotes",
      message: `Please add at least ${config.requiredFields.minQuotes} student quote(s)`,
      stepLink: 4,
      stepName: "Enhancements"
    });
  }
  
  if (!validationChecks.hasMinMetrics) {
    validationErrors.push({
      field: "Impact Metrics",
      message: `Please add at least ${config.requiredFields.minMetrics} impact metric(s)`,
      stepLink: 4,
      stepName: "Enhancements"
    });
  }
  
  if (!validationChecks.hasMinTimeline) {
    validationErrors.push({
      field: "Timeline",
      message: `Please add at least ${config.requiredFields.minTimelineSections} timeline section(s)`,
      stepLink: 4,
      stepName: "Enhancements"
    });
  }

  return (
    <div className="space-y-8">
      <h2 id="step-8-heading" className="text-2xl font-semibold">Step 8 · Review & Publish</h2>
      
      {/* Preview Callout */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="callout-preview-available">
        <div className="flex items-start gap-3">
          <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Live Preview Available
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              See how your case study will appear to visitors in real-time. The preview updates as you make changes.
            </p>
            {!isMobile && <PreviewToggleButton />}
          </div>
        </div>
      </div>

      {/* Mobile Notice */}
      {isMobile && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-400 text-sm" data-testid="notice-mobile-preview">
          <p className="text-yellow-800 dark:text-yellow-200">
            Preview is available on larger screens. View your case study after publishing.
          </p>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" data-testid="alert-validation-errors">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Please address these issues:</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-3">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2" data-testid={`error-item-${idx}`}>
                  <span className="mt-0.5">•</span>
                  <div className="flex-1">
                    <p className="font-medium">{error.field}</p>
                    <p className="text-sm">{error.message}</p>
                    {error.stepLink && onStepChange && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs mt-1"
                        onClick={() => onStepChange(error.stepLink!)}
                        data-testid={`button-go-to-step-${error.stepLink}`}
                      >
                        Go to {error.stepName} <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Requirements Checklist */}
      <Alert variant={isReadyToPublish ? "default" : "destructive"} data-testid="alert-requirements-checklist">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Template Requirements</AlertTitle>
        <AlertDescription>
          <div className="mt-2 mb-3">
            <p className="text-sm">
              {isReadyToPublish 
                ? "✓ All requirements met! Your case study is ready to publish." 
                : `${passedChecks} of ${totalChecks} requirements met`
              }
            </p>
          </div>
          <ul className="space-y-2">
            <RequirementItem 
              met={validationChecks.hasTitle} 
              text="Title provided" 
              testId="requirement-title"
            />
            <RequirementItem 
              met={validationChecks.hasSchool} 
              text="School selected" 
              testId="requirement-school"
            />
            <RequirementItem 
              met={validationChecks.hasStage} 
              text="Program stage selected" 
              testId="requirement-stage"
            />
            
            {config.requiredFields.description && (
              <RequirementItem 
                met={validationChecks.hasDescription} 
                text="Description written" 
                testId="requirement-description"
              />
            )}
            
            {config.requiredFields.impact && (
              <RequirementItem 
                met={validationChecks.hasRequiredImpact} 
                text="Impact summary provided" 
                testId="requirement-impact"
              />
            )}
            
            <RequirementItem 
              met={validationChecks.hasMinImages} 
              text={`Minimum ${config.requiredFields.minImages} image(s) (currently: ${imageCount})`} 
              testId="requirement-images"
            />
            
            {config.requiredFields.requiresBeforeAfter && (
              <RequirementItem 
                met={validationChecks.hasBeforeAfter} 
                text="Before & After images" 
                testId="requirement-before-after"
              />
            )}
            
            {config.requiredFields.requiresQuotes && (
              <RequirementItem 
                met={validationChecks.hasMinQuotes} 
                text={`At least ${config.requiredFields.minQuotes} student quote(s) (currently: ${formValues.studentQuotes?.length || 0})`} 
                testId="requirement-quotes"
              />
            )}
            
            {config.requiredFields.requiresMetrics && (
              <RequirementItem 
                met={validationChecks.hasMinMetrics} 
                text={`At least ${config.requiredFields.minMetrics} impact metric(s) (currently: ${formValues.impactMetrics?.length || 0})`} 
                testId="requirement-metrics"
              />
            )}
            
            {config.requiredFields.requiresTimeline && (
              <RequirementItem 
                met={validationChecks.hasMinTimeline} 
                text={`At least ${config.requiredFields.minTimelineSections} timeline section(s) (currently: ${formValues.timelineSections?.length || 0})`} 
                testId="requirement-timeline"
              />
            )}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Grouped Summaries */}
      <div className="space-y-6">
        {/* Template & Basics Summary */}
        <Card data-testid="card-template-basics-summary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Template & Basics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryItem 
              label="Template" 
              value={config.name} 
              testId="summary-template"
            />
            <SummaryItem 
              label="School" 
              value={schoolName} 
              testId="summary-school"
            />
            <SummaryItem 
              label="Title" 
              value={formValues.title} 
              testId="summary-title"
            />
            <SummaryItem 
              label="Program Stage" 
              value={formValues.stage ? PROGRAM_STAGE_LABELS[formValues.stage] || formValues.stage : null} 
              testId="summary-stage"
            />
          </CardContent>
        </Card>

        {/* Content Summary */}
        <Card data-testid="card-content-summary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryItem 
              label="Description" 
              value={formValues.description} 
              isHtml 
              preview 
              testId="summary-description"
            />
            {config.requiredFields.impact && (
              <SummaryItem 
                label="Impact Summary" 
                value={formValues.impact} 
                isHtml 
                preview 
                testId="summary-impact"
              />
            )}
          </CardContent>
        </Card>

        {/* Media Summary */}
        <Card data-testid="card-media-summary">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Media ({imageCount} images{config.requiredFields.allowVideos && `, ${videoCount} videos`})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gallery Images</p>
                  <p className="font-semibold" data-testid="count-images">{imageCount}</p>
                </div>
              </div>
              
              {config.requiredFields.allowVideos && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Videos</p>
                    <p className="font-semibold" data-testid="count-videos">{videoCount}</p>
                  </div>
                </div>
              )}
            </div>
            
            {config.requiredFields.requiresBeforeAfter && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Before & After Images:</p>
                  <div className="flex gap-2 text-sm">
                    <span className={formValues.beforeImage ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {formValues.beforeImage ? "✓ Before image uploaded" : "✗ Before image missing"}
                    </span>
                    <span>·</span>
                    <span className={formValues.afterImage ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {formValues.afterImage ? "✓ After image uploaded" : "✗ After image missing"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Thumbnails preview for images */}
            {imageCount > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Image Gallery Preview:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {formValues.images?.slice(0, 8).map((image: string, idx: number) => (
                      <div 
                        key={idx} 
                        className="aspect-square rounded overflow-hidden bg-muted"
                        data-testid={`thumbnail-image-${idx}`}
                      >
                        <img 
                          src={image} 
                          alt={`Preview ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {imageCount > 8 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      + {imageCount - 8} more image(s)
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Enhancements Summary (conditional) */}
        {hasEnhancements && (
          <Card data-testid="card-enhancements-summary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Enhancements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                {config.requiredFields.allowQuotes && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Quotes</p>
                      <p className="font-semibold" data-testid="count-quotes">{formValues.studentQuotes?.length || 0}</p>
                    </div>
                  </div>
                )}
                
                {config.requiredFields.allowMetrics && (
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Metrics</p>
                      <p className="font-semibold" data-testid="count-metrics">{formValues.impactMetrics?.length || 0}</p>
                    </div>
                  </div>
                )}
                
                {config.requiredFields.allowTimeline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Timeline</p>
                      <p className="font-semibold" data-testid="count-timeline">{formValues.timelineSections?.length || 0}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Student Quotes Preview */}
              {hasQuotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Student Quotes:</p>
                    <div className="space-y-2">
                      {formValues.studentQuotes?.slice(0, 2).map((quote: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="p-3 bg-muted/50 rounded-lg text-sm"
                          data-testid={`preview-quote-${idx}`}
                        >
                          <p className="italic line-clamp-2">"{quote.quote}"</p>
                          <p className="text-xs text-muted-foreground mt-1">— {quote.studentName || "Anonymous"}</p>
                        </div>
                      ))}
                    </div>
                    {(formValues.studentQuotes?.length || 0) > 2 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        + {formValues.studentQuotes.length - 2} more quote(s)
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Impact Metrics Preview */}
              {hasMetrics && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Impact Metrics:</p>
                    <div className="space-y-1">
                      {formValues.impactMetrics?.slice(0, 3).map((metric: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 text-sm"
                          data-testid={`preview-metric-${idx}`}
                        >
                          <Badge variant="outline">{metric.value}</Badge>
                          <span>{metric.label}</span>
                        </div>
                      ))}
                    </div>
                    {(formValues.impactMetrics?.length || 0) > 3 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        + {formValues.impactMetrics.length - 3} more metric(s)
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Timeline Preview */}
              {hasTimeline && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Timeline Sections:</p>
                    <div className="space-y-1">
                      {formValues.timelineSections?.map((section: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 text-sm"
                          data-testid={`preview-timeline-${idx}`}
                        >
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{section.phase}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground line-clamp-1">{section.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Before/After Preview (Visual Story only) */}
      {templateType === 'visual' && formValues.beforeImage && formValues.afterImage && (
        <Card data-testid="card-before-after-preview">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Transformation Preview
            </CardTitle>
            <CardDescription>
              This is how your before & after comparison will appear on the public page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BeforeAfterSlider
              beforeImage={formValues.beforeImage}
              afterImage={formValues.afterImage}
              beforeAlt="Before transformation"
              afterAlt="After transformation"
              height="h-64 md:h-96"
            />
            <p className="text-sm text-muted-foreground mt-4 text-center italic">
              💡 Visitors can drag the slider to reveal the transformation
            </p>
          </CardContent>
        </Card>
      )}

      {/* Categories & Tags */}
      <Card data-testid="card-categories-tags">
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Categories & Tags</h3>
          <CardDescription>
            Help others discover your case study
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategorisationSection form={form} />
        </CardContent>
      </Card>

      {/* Publication Settings */}
      <Card data-testid="card-publication-settings">
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Publication Settings</h3>
          <CardDescription>
            Control visibility and SEO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateStatusSection form={form} />
        </CardContent>
      </Card>
    </div>
  );
}
