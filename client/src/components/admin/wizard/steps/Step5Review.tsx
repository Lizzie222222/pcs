import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CategorisationSection } from "../../case-study-sections/CategorisationSection";
import { TemplateStatusSection } from "../../case-study-sections/TemplateStatusSection";
import { CheckCircle2, AlertTriangle, Image as ImageIcon, MessageSquare, BarChart3, Calendar } from "lucide-react";
import { getTemplateConfig } from "../templateConfigurations";

interface Step5ReviewProps {
  form: UseFormReturn<any>;
}

export function Step5Review({ form }: Step5ReviewProps) {
  const formValues = form.watch();
  const templateType = formValues.templateType || "standard";
  const config = getTemplateConfig(templateType);

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
    <div className="space-y-6">
      {/* Validation Summary */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-step5-title">Readiness Check</CardTitle>
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
            <Alert variant="destructive">
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
          <CardTitle>Content Summary</CardTitle>
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

      {/* Categories & Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Categories & Tags</CardTitle>
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
          <CardTitle>Publication Settings</CardTitle>
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
