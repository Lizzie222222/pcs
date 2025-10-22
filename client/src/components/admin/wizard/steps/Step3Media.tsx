import { useMemo, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTemplateConfig } from "../templateConfigurations";
import { Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EvidenceSelector } from "../media-sections/EvidenceSelector";
import { CustomUploadManager } from "../media-sections/CustomUploadManager";
import { BeforeAfterBuilder } from "../media-sections/BeforeAfterBuilder";
import { SelectedMediaSummary } from "../media-sections/SelectedMediaSummary";

interface Evidence {
  id: string;
  title: string;
  fileUrls: string[];
  schoolId: string;
  schoolName: string;
  stage: string;
  visibility: string;
  status: string;
  createdAt: string;
}

interface Step3MediaProps {
  form: UseFormReturn<any>;
  templateType?: string;
}

export function Step3Media({ form, templateType: propTemplateType }: Step3MediaProps) {
  const templateType = propTemplateType || form.watch("templateType") || "standard";
  
  // Use useMemo to ensure config updates when templateType changes
  const config = useMemo(() => getTemplateConfig(templateType), [templateType]);
  
  const schoolId = form.watch("schoolId");
  
  // Debug: Enhanced logging for template changes
  console.log('[Step3Media] RENDER - propTemplateType:', propTemplateType, '| form.watch("templateType"):', form.watch("templateType"), '| final templateType:', templateType);
  console.log('[Step3Media] Current before/after in form:', { 
    beforeImage: form.getValues('beforeImage'), 
    afterImage: form.getValues('afterImage') 
  });
  console.log('[Step3Media] Will show Before/After section?', templateType === 'visual');

  // Component mount/unmount tracking
  useEffect(() => {
    console.log('[Step3Media] MOUNTED with templateType:', templateType);
    return () => {
      console.log('[Step3Media] UNMOUNTING');
    };
  }, []);

  // Clear before/after images when switching away from Visual template
  useEffect(() => {
    console.log('[Step3Media] useEffect triggered - templateType:', templateType);
    if (templateType !== 'visual') {
      const currentBefore = form.getValues('beforeImage');
      const currentAfter = form.getValues('afterImage');
      
      console.log('[Step3Media] Template is NOT visual. Checking if cleanup needed...', { currentBefore, currentAfter });
      
      if (currentBefore || currentAfter) {
        console.log('[Step3Media] Clearing before/after images...');
        form.setValue('beforeImage', '');
        form.setValue('afterImage', '');
        console.log('[Step3Media] ✅ Cleared before/after images - template is now:', templateType);
      } else {
        console.log('[Step3Media] No cleanup needed - before/after already empty');
      }
    } else {
      console.log('[Step3Media] Template is visual - keeping before/after section visible');
    }
  }, [templateType, form]);

  // Fetch approved public evidence submissions for this school
  const { data: evidenceList, isLoading: isLoadingEvidence } = useQuery<Evidence[]>({
    queryKey: ['/api/evidence', { 
      schoolId, 
      status: 'approved', 
      visibility: 'public' 
    }],
    enabled: !!schoolId,
  });

  const currentImages = form.watch("images") || [];
  const beforeImage = form.watch("beforeImage");
  const afterImage = form.watch("afterImage");

  return (
    <div className="space-y-10">
      <div>
        <h2 id="step-4-heading" className="text-2xl font-semibold">Step 4 · Media</h2>
        <p className="text-muted-foreground mt-2">
          Add compelling visuals to showcase your school's plastic reduction journey
        </p>
      </div>
      
      {/* Template Requirements Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{config.name} Template Requirements:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Minimum images: {config.requiredFields.minImages} (currently: {currentImages.length})</li>
            <li>• Maximum images: {config.requiredFields.maxImages}</li>
            {config.requiredFields.requiresBeforeAfter && (
              <li className="text-primary font-medium">
                • Before & After images required {beforeImage && afterImage ? "✓" : "⚠️"}
              </li>
            )}
            {config.requiredFields.allowVideos && <li>• Videos allowed (optional)</li>}
          </ul>
        </AlertDescription>
      </Alert>

      {/* Section 1: Evidence Gallery Selection */}
      <Card data-testid="card-evidence-gallery">
        <CardHeader>
          <CardTitle className="text-lg">Select from Evidence Gallery</CardTitle>
          <CardDescription>
            Choose approved evidence submissions from your school to showcase in this case study
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvidenceSelector 
            form={form} 
            evidence={evidenceList}
            isLoading={isLoadingEvidence}
            schoolId={schoolId}
          />
        </CardContent>
      </Card>
      
      {/* Section 2: Custom Uploads */}
      <Card data-testid="card-custom-upload">
        <CardHeader>
          <CardTitle className="text-lg">Upload Custom Images</CardTitle>
          <CardDescription>
            Add images that aren't in the Evidence Gallery, such as additional photos or graphics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomUploadManager 
            form={form} 
            templateConfig={config}
          />
        </CardContent>
      </Card>
      
      {/* Section 3: Before/After (conditional) */}
      {templateType === 'visual' && (
        <Card className="border-primary/50" data-testid="card-before-after">
          <CardHeader>
            <CardTitle className="text-lg">Before & After Comparison</CardTitle>
            <CardDescription>
              Show the transformation your school achieved (required for Visual Story template)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BeforeAfterBuilder form={form} />
          </CardContent>
        </Card>
      )}
      
      {/* Section 4: Summary & Review */}
      <Card className="bg-muted/30" data-testid="card-media-summary">
        <CardHeader>
          <CardTitle className="text-lg">Selected Media Summary</CardTitle>
          <CardDescription>
            Review all images and videos for this case study
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SelectedMediaSummary 
            form={form} 
            templateConfig={config}
          />
        </CardContent>
      </Card>
    </div>
  );
}
