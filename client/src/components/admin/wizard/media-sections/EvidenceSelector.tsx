import { UseFormReturn } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { nanoid } from 'nanoid';

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

interface EvidenceSelectorProps {
  form: UseFormReturn<any>;
  evidence: Evidence[] | undefined;
  isLoading?: boolean;
  schoolId: string | undefined;
}

export function EvidenceSelector({ form, evidence, isLoading, schoolId }: EvidenceSelectorProps) {
  const [stageFilter, setStageFilter] = useState<string>("all");

  const evidenceImages = evidence?.flatMap(ev => 
    ev.fileUrls.map(url => ({
      url,
      evidenceTitle: ev.title,
      evidenceId: ev.id,
      stage: ev.stage,
    }))
  ) || [];

  // Filter by stage
  const filteredImages = stageFilter === "all" 
    ? evidenceImages 
    : evidenceImages.filter(img => img.stage === stageFilter);

  const currentImages = form.watch("images") || [];
  const selectedCount = currentImages.filter((img: any) => img.source === 'evidence').length;

  const handleToggleEvidence = (imageUrl: string, evidenceId: string, evidenceTitle: string) => {
    const currentImages = form.getValues("images") || [];
    
    // Check if image is already selected
    const existingIndex = currentImages.findIndex((img: any) => img.url === imageUrl);
    
    if (existingIndex >= 0) {
      // Remove the image
      const updatedImages = currentImages.filter((_: any, idx: number) => idx !== existingIndex);
      form.setValue("images", updatedImages);
    } else {
      // Add the image with evidence metadata
      const newImage = {
        id: nanoid(),
        url: imageUrl,
        caption: evidenceTitle,
        altText: evidenceTitle,
        source: 'evidence',
        evidenceId: evidenceId,
      };
      form.setValue("images", [...currentImages, newImage]);
    }
  };

  const isImageSelected = (imageUrl: string) => {
    return currentImages.some((img: any) => img.url === imageUrl);
  };

  // Get unique stages for filtering
  const availableStages = Array.from(new Set(evidenceImages.map(img => img.stage)));

  if (!schoolId) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Please select a school in Step 1 to view approved evidence submissions
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading approved evidence...
      </div>
    );
  }

  if (evidenceImages.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>No eligible evidence found.</strong> To appear here, evidence must be:
          <ul className="mt-2 ml-4 space-y-1 text-sm list-disc">
            <li><strong>Approved</strong> by an administrator</li>
            <li>Set to <strong>Public</strong> visibility</li>
            <li>From a school with <strong>approved photo consent</strong></li>
          </ul>
          <p className="mt-2 text-sm">
            You can upload custom images in the "Upload Custom Images" section below.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Info Alert */}
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Permission Verified:</strong> All images shown below are from schools with approved photo consent and are set to public visibility, making them safe to use in case studies.
        </AlertDescription>
      </Alert>
      
      {/* Filter and count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {selectedCount} selected from Evidence Gallery
          </Badge>
          
          {availableStages.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by stage:</span>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-stage-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {availableStages.map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Evidence grid */}
      {filteredImages.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No evidence found for the selected stage filter.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((evidence, index) => {
            const isSelected = isImageSelected(evidence.url);
            
            return (
              <div
                key={`${evidence.evidenceId}-${index}`}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected 
                    ? "border-primary shadow-lg ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/50 hover:shadow-md"
                }`}
                onClick={() => handleToggleEvidence(evidence.url, evidence.evidenceId, evidence.evidenceTitle)}
                data-testid={`evidence-image-${index}`}
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={evidence.url}
                    alt={evidence.evidenceTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Selection overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <div className="bg-primary rounded-full p-2">
                      <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                {/* Metadata on hover */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-medium truncate">{evidence.evidenceTitle}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">
                    Stage: {evidence.stage.charAt(0).toUpperCase() + evidence.stage.slice(1)}
                  </p>
                </div>

                {/* Stage badge (always visible) */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 left-2 text-[10px] px-2 py-0.5"
                >
                  {evidence.stage.charAt(0).toUpperCase() + evidence.stage.slice(1)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Help text */}
      <p className="text-sm text-muted-foreground italic">
        💡 Tip: Click images to toggle selection. Selected images will appear in the summary below.
      </p>
    </div>
  );
}
