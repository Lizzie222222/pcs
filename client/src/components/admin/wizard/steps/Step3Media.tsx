import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTemplateConfig } from "../templateConfigurations";
import { Info, Image as ImageIcon, Upload, CheckCircle2 } from "lucide-react";
import { MediaGallerySection } from "../../case-study-sections/MediaGallerySection";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

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
}

export function Step3Media({ form }: Step3MediaProps) {
  const templateType = form.watch("templateType") || "standard";
  const config = getTemplateConfig(templateType);
  const schoolId = form.watch("schoolId");
  const [selectedTab, setSelectedTab] = useState("evidence");

  // Fetch approved public evidence submissions for this school
  const { data: evidenceList, isLoading: isLoadingEvidence } = useQuery<Evidence[]>({
    queryKey: ['/api/evidence', { 
      schoolId, 
      status: 'approved', 
      visibility: 'public' 
    }],
    enabled: !!schoolId,
  });

  const handleSelectEvidenceImage = (imageUrl: string) => {
    const currentImages = form.getValues("images") || [];
    
    // Check if image is already added
    const alreadyAdded = currentImages.some((img: any) => img.url === imageUrl);
    if (alreadyAdded) return;

    // Add to images array
    const newImage = {
      url: imageUrl,
      caption: "",
      altText: "",
    };
    
    form.setValue("images", [...currentImages, newImage]);
  };

  const evidenceImages = evidenceList?.flatMap(evidence => 
    evidence.fileUrls.map(url => ({
      url,
      evidenceTitle: evidence.title,
      evidenceId: evidence.id,
    }))
  ) || [];

  const currentImages = form.watch("images") || [];
  const beforeImage = form.watch("beforeImage");
  const afterImage = form.watch("afterImage");

  return (
    <div className="space-y-8">
      <h2 id="step-3-heading" className="text-2xl font-semibold">Step 3 · Media</h2>
      
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight" data-testid="text-step3-title">Media Requirements</h3>
          <CardDescription>
            Add images to bring your case study to life
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template requirements */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{config.name} Template Requirements:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Minimum images: {config.requiredFields.minImages}</li>
                <li>• Maximum images: {config.requiredFields.maxImages}</li>
                {config.requiredFields.requiresBeforeAfter && (
                  <li className="text-primary font-medium">• Before & After images required</li>
                )}
                {config.requiredFields.allowVideos && <li>• Videos allowed</li>}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Image source tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evidence" data-testid="tab-evidence-gallery">
                <ImageIcon className="h-4 w-4 mr-2" />
                Evidence Gallery ({evidenceImages.length})
              </TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-custom-upload">
                <Upload className="h-4 w-4 mr-2" />
                Custom Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evidence" className="mt-6 space-y-4">
              {!schoolId ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Please select a school in Step 1 to view approved evidence submissions
                  </AlertDescription>
                </Alert>
              ) : isLoadingEvidence ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading approved evidence...
                </div>
              ) : evidenceImages.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No approved public evidence submissions found for this school. 
                    You can upload custom images in the "Custom Upload" tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select from approved evidence submissions. Click an image to add it to your case study.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {evidenceImages.map((evidence, index) => {
                      const isSelected = currentImages.some((img: any) => img.url === evidence.url);
                      
                      return (
                        <div
                          key={`${evidence.evidenceId}-${index}`}
                          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected 
                              ? "border-primary shadow-lg" 
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleSelectEvidenceImage(evidence.url)}
                          data-testid={`evidence-image-${index}`}
                        >
                          <div className="aspect-square bg-muted">
                            <img
                              src={evidence.url}
                              alt={evidence.evidenceTitle}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <CheckCircle2 className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {evidence.evidenceTitle}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {currentImages.length > 0 && (
                    <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        ✓ {currentImages.length} image(s) selected
                      </p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-6">
              <MediaGallerySection form={form} />
            </TabsContent>
          </Tabs>

          {/* Current selection summary */}
          <div className="border-t pt-6 mt-6">
            <h4 className="font-semibold mb-2">Current Selection</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gallery Images:</span>
                <span className={`ml-2 font-medium ${
                  currentImages.length >= config.requiredFields.minImages 
                    ? "text-green-600" 
                    : "text-destructive"
                }`}>
                  {currentImages.length} / {config.requiredFields.minImages} minimum
                </span>
              </div>
              {config.requiredFields.requiresBeforeAfter && (
                <div>
                  <span className="text-muted-foreground">Before & After:</span>
                  <span className={`ml-2 font-medium ${
                    beforeImage && afterImage ? "text-green-600" : "text-destructive"
                  }`}>
                    {beforeImage && afterImage ? "✓ Complete" : "⚠ Required"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
