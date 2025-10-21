import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CategorisationSection } from "../../case-study-sections/CategorisationSection";
import { TemplateStatusSection } from "../../case-study-sections/TemplateStatusSection";
import { CheckCircle2, AlertTriangle, Image as ImageIcon, MessageSquare, BarChart3, Calendar, Eye } from "lucide-react";
import { getTemplateConfig } from "../templateConfigurations";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { PreviewToggleButton, usePreviewContext } from "../../PreviewContainer";

interface Step5ReviewProps {
  form: UseFormReturn<any>;
}

export function Step5Review({ form }: Step5ReviewProps) {
  const previewContext = usePreviewContext();
  const isMobile = previewContext?.isMobile ?? false;
  const formValues = form.watch();
  const templateType = formValues.templateType || "standard";
  const config = getTemplateConfig(templateType);
  const beforeImage = formValues.beforeImage;
  const afterImage = formValues.afterImage;

  // Validation checks
  const validationChecks = {
    hasTitle: !!formValues.title,
    hasSchool: !!formValues.schoolId,
    hasStage: !!formValues.stage,
    hasDescription: !!formValues.description,
    hasRequiredImpact: config.requiredFields.impact ? !!formValues.impact : true,
    hasMinImages: (formValues.images?.length || 0) >= config.requiredFields.minImages,
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

  return (
    <div className="space-y-8">
      <h2 id="step-5-heading" className="text-2xl font-semibold">Step 5 · Review & Publish</h2>
      
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
      
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight" data-testid="text-step5-title">Readiness Check</h3>
          <CardDescription>
            Review your case study before publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
              isReadyToPublish ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}>
              {isReadyToPublish ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {isReadyToPublish 
                  ? "Ready to Publish!" 
                  : "Almost There"
                }
              </h3>
              <p className="text-sm text-muted-foreground">
                {passedChecks} of {totalChecks} requirements met
              </p>
            </div>
          </div>

          <Separator />

          {/* Validation Checklist */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Requirements:</h4>
            <div className="grid gap-2">
              <CheckItem checked={validationChecks.hasTitle} label="Title provided" />
              <CheckItem checked={validationChecks.hasSchool} label="School selected" />
              <CheckItem checked={validationChecks.hasStage} label="Program stage selected" />
              <CheckItem checked={validationChecks.hasDescription} label="Description written" />
              
              {config.requiredFields.impact && (
                <CheckItem checked={validationChecks.hasRequiredImpact} label="Impact summary provided" />
              )}
              
              <CheckItem 
                checked={validationChecks.hasMinImages} 
                label={`At least ${config.requiredFields.minImages} image(s) added (${formValues.images?.length || 0})`} 
              />
              
              {config.requiredFields.requiresBeforeAfter && (
                <CheckItem checked={validationChecks.hasBeforeAfter} label="Before & After images uploaded" />
              )}
              
              {config.requiredFields.requiresQuotes && (
                <CheckItem 
                  checked={validationChecks.hasMinQuotes} 
                  label={`At least ${config.requiredFields.minQuotes} student quote(s) (${formValues.studentQuotes?.length || 0})`} 
                />
              )}
              
              {config.requiredFields.requiresMetrics && (
                <CheckItem 
                  checked={validationChecks.hasMinMetrics} 
                  label={`At least ${config.requiredFields.minMetrics} impact metric(s) (${formValues.impactMetrics?.length || 0})`} 
                />
              )}
              
              {config.requiredFields.requiresTimeline && (
                <CheckItem 
                  checked={validationChecks.hasMinTimeline} 
                  label={`At least ${config.requiredFields.minTimelineSections} timeline section(s) (${formValues.timelineSections?.length || 0})`} 
                />
              )}
            </div>
          </div>

          {!isReadyToPublish && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required fields before publishing. You can save as draft to continue later.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Content Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Content Summary</h3>
          <CardDescription>
            Preview of your case study content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Template</p>
              <p className="font-medium">
                <Badge variant="outline">{config.name}</Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Program Stage</p>
              <p className="font-medium capitalize">{formValues.stage || "Not set"}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground mb-1">Title</p>
            <p className="font-medium">{formValues.title || "No title yet"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="text-sm line-clamp-3">
              {formValues.description || "No description yet"}
            </p>
          </div>

          {formValues.impact && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Impact Summary</p>
              <p className="text-sm line-clamp-2">
                {formValues.impact}
              </p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Images</p>
                <p className="font-semibold">{formValues.images?.length || 0}</p>
              </div>
            </div>
            
            {config.requiredFields.allowQuotes && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Quotes</p>
                  <p className="font-semibold">{formValues.studentQuotes?.length || 0}</p>
                </div>
              </div>
            )}
            
            {config.requiredFields.allowMetrics && (
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Metrics</p>
                  <p className="font-semibold">{formValues.impactMetrics?.length || 0}</p>
                </div>
              </div>
            )}
            
            {config.requiredFields.allowTimeline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Timeline</p>
                  <p className="font-semibold">{formValues.timelineSections?.length || 0}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Before/After Preview (Visual Story only) */}
      {templateType === 'visual' && beforeImage && afterImage && (
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
              beforeImage={beforeImage}
              afterImage={afterImage}
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
      <Card>
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
      <Card>
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

// Helper component for checklist items
function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
      )}
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
