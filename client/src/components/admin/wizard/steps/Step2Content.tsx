import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTemplateConfig } from "../templateConfigurations";
import { Info } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Step2ContentProps {
  form: UseFormReturn<any>;
}

export function Step2Content({ form }: Step2ContentProps) {
  const templateType = form.watch("templateType") || "standard";
  const config = getTemplateConfig(templateType);

  return (
    <div className="space-y-8">
      <h2 id="step-2-heading" className="text-2xl font-semibold">Step 2 · Content</h2>
      
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight" data-testid="text-step2-title">Story Content</h3>
          <CardDescription>
            Tell your school's plastic reduction story in a compelling way
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template-specific guidance */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{config.name} Template:</strong> {config.description}
            </AlertDescription>
          </Alert>

          {/* Description */}
          <RichTextEditor
            name="description"
            label={`Description ${config.requiredFields.description ? "*" : ""}`}
            placeholder="Tell the story of your school's journey... What was the challenge? What actions did you take? What were the outcomes?"
            description={`The main narrative of your case study. Be specific and use concrete examples.${
              templateType === "visual" ? " Keep it concise - the images will tell much of your story." : ""
            }`}
            minHeight="min-h-[200px]"
            testId="rich-text-description"
          />

          {/* Impact - conditional based on template */}
          {config.requiredFields.impact && (
            <RichTextEditor
              name="impact"
              label="Impact Summary *"
              placeholder="Summarize the key impact and outcomes of this initiative..."
              description={`Highlight the most significant results and lasting changes.${
                templateType === "metrics" ? " This will appear alongside your impact metrics." : ""
              }`}
              minHeight="min-h-[150px]"
              testId="rich-text-impact"
            />
          )}

          {/* Visual template guidance */}
          {templateType === "visual" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> For Visual Story templates, focus on clear, concise text that complements your images. 
                The before/after photos will be the main focus, so your description should provide context and highlight the transformation.
              </AlertDescription>
            </Alert>
          )}

          {/* Timeline template guidance */}
          {templateType === "timeline" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> For Timeline templates, provide an overview here. You'll add detailed chronological milestones in the next step.
              </AlertDescription>
            </Alert>
          )}

          {/* Metrics template guidance */}
          {templateType === "metrics" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> For Impact Focused templates, your quantifiable results will take center stage. 
                Use this section to explain the context and methodology behind your metrics.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
