import { UseFormReturn } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Trash2, Image as ImageIcon, Video } from "lucide-react";
import type { TemplateConfig } from "../templateConfigurations";

interface SelectedMediaSummaryProps {
  form: UseFormReturn<any>;
  templateConfig: TemplateConfig;
}

export function SelectedMediaSummary({ form, templateConfig }: SelectedMediaSummaryProps) {
  const currentImages = form.watch("images") || [];
  const beforeImage = form.watch("beforeImage");
  const afterImage = form.watch("afterImage");
  const videos = form.watch("videos") || [];

  const evidenceImages = currentImages.filter((img: any) => img.source === 'evidence');
  const customImages = currentImages.filter((img: any) => img.source === 'custom' || !img.source);
  
  const totalImages = currentImages.length;
  const meetsMinimum = totalImages >= templateConfig.requiredFields.minImages;
  const meetsBeforeAfter = !templateConfig.requiredFields.requiresBeforeAfter || (beforeImage && afterImage);
  const meetsAllRequirements = meetsMinimum && meetsBeforeAfter;

  const removeImage = (index: number) => {
    const updatedImages = currentImages.filter((_: any, idx: number) => idx !== index);
    form.setValue("images", updatedImages);
  };

  const getSourceBadge = (image: any) => {
    if (image.source === 'evidence') {
      return <Badge variant="secondary" className="text-xs">Evidence Gallery</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Custom Upload</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Requirements Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={meetsMinimum ? "border-green-200 bg-green-50/50" : "border-destructive/50 bg-destructive/5"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Gallery Images</p>
                <p className="text-2xl font-bold mt-1">
                  {totalImages} / {templateConfig.requiredFields.minImages}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum required
                </p>
              </div>
              {meetsMinimum ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <AlertCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>

        {templateConfig.requiredFields.requiresBeforeAfter && (
          <Card className={meetsBeforeAfter ? "border-green-200 bg-green-50/50" : "border-destructive/50 bg-destructive/5"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Before & After</p>
                  <p className="text-2xl font-bold mt-1">
                    {beforeImage && afterImage ? "2 / 2" : `${(beforeImage ? 1 : 0) + (afterImage ? 1 : 0)} / 2`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for Visual Story
                  </p>
                </div>
                {meetsBeforeAfter ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {templateConfig.requiredFields.allowVideos && videos.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Videos</p>
                  <p className="text-2xl font-bold mt-1">{videos.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional embeds
                  </p>
                </div>
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overall Status Alert */}
      {!meetsAllRequirements && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Missing required media:</strong>
            <ul className="mt-2 space-y-1 text-sm">
              {!meetsMinimum && (
                <li>• Need {templateConfig.requiredFields.minImages - totalImages} more image(s) for gallery</li>
              )}
              {!meetsBeforeAfter && (
                <li>• Need to upload {!beforeImage ? "Before" : ""} {!beforeImage && !afterImage ? "and" : ""} {!afterImage ? "After" : ""} image(s)</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {meetsAllRequirements && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            ✓ All media requirements met! You're ready to proceed.
          </AlertDescription>
        </Alert>
      )}

      {/* Gallery Images Grid */}
      {totalImages > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Selected Gallery Images ({totalImages})</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentImages.map((image: any, index: number) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border-2 border-border hover:border-primary/50 transition-all"
                data-testid={`summary-image-${index}`}
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={image.url}
                    alt={image.altText || image.caption || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Source badge */}
                <div className="absolute top-2 left-2">
                  {getSourceBadge(image)}
                </div>

                {/* Remove button on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(index)}
                    data-testid={`button-summary-remove-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Caption on hover */}
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="line-clamp-2">{image.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Breakdown by source */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>• Evidence Gallery: {evidenceImages.length}</span>
            <span>• Custom Uploads: {customImages.length}</span>
          </div>
        </div>
      )}

      {/* Before/After Summary */}
      {templateConfig.requiredFields.requiresBeforeAfter && (beforeImage || afterImage) && (
        <div className="space-y-4 border-t pt-6">
          <h4 className="text-sm font-semibold">Before & After Comparison</h4>
          <div className="grid grid-cols-2 gap-4">
            {beforeImage && (
              <div className="relative">
                <img src={beforeImage} alt="Before" className="w-full h-32 object-cover rounded-lg border-2 border-border" />
                <Badge className="absolute top-2 left-2" variant="secondary">Before</Badge>
              </div>
            )}
            {afterImage && (
              <div className="relative">
                <img src={afterImage} alt="After" className="w-full h-32 object-cover rounded-lg border-2 border-primary" />
                <Badge className="absolute top-2 left-2">After</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Videos Summary */}
      {videos.length > 0 && (
        <div className="space-y-4 border-t pt-6">
          <h4 className="text-sm font-semibold">Embedded Videos ({videos.length})</h4>
          <div className="space-y-2">
            {videos.map((video: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Video className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{video.url || "No URL"}</p>
                  <p className="text-xs text-muted-foreground">
                    Platform: {video.platform} {video.embedId && `• ID: ${video.embedId}`}
                  </p>
                </div>
                <Badge variant="outline">{video.platform}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalImages === 0 && !beforeImage && !afterImage && videos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No media selected yet. Add images from the sections above to see them here.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground italic">
        💡 Tip: Drag-and-drop reordering will be available in a future update
      </p>
    </div>
  );
}
