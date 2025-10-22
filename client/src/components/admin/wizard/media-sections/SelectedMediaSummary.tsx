import { useState, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Image as ImageIcon, Video } from "lucide-react";
import type { TemplateConfig } from "../templateConfigurations";
import { SortableImageCard } from './SortableImageCard';
import { ImagePreviewCard } from './ImagePreviewCard';
import { nanoid } from 'nanoid';

interface SelectedMediaSummaryProps {
  form: UseFormReturn<any>;
  templateConfig: TemplateConfig;
}

export function SelectedMediaSummary({ form, templateConfig }: SelectedMediaSummaryProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const rawImages = form.watch("images") || [];
  const currentImages = useMemo(() => {
    console.log('[SelectedMediaSummary] Raw images from form:', rawImages);
    const needsIds = rawImages.some((img: any) => !img.id);
    
    if (needsIds) {
      const normalized = rawImages.map((img: any) => ({
        ...img,
        id: img.id || nanoid()
      }));
      console.log('[SelectedMediaSummary] Normalized images (added IDs):', normalized);
      form.setValue('images', normalized);
      return normalized;
    }
    
    console.log('[SelectedMediaSummary] Using raw images (already have IDs):', rawImages);
    return rawImages;
  }, [rawImages, form]);

  const beforeImage = form.watch("beforeImage");
  const afterImage = form.watch("afterImage");
  const videos = form.watch("videos") || [];

  const evidenceImages = currentImages.filter((img: any) => img.source === 'evidence');
  const customImages = currentImages.filter((img: any) => img.source === 'custom' || !img.source);
  
  const totalImages = currentImages.length;
  const meetsMinimum = totalImages >= templateConfig.requiredFields.minImages;
  const meetsBeforeAfter = !templateConfig.requiredFields.requiresBeforeAfter || (beforeImage && afterImage);
  const meetsAllRequirements = meetsMinimum && meetsBeforeAfter;

  // Configure sensors for drag interaction
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder images
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = currentImages.findIndex((img: any) => img.id === active.id);
      const newIndex = currentImages.findIndex((img: any) => img.id === over.id);
      
      const reorderedImages = arrayMove(currentImages, oldIndex, newIndex);
      form.setValue('images', reorderedImages, { shouldDirty: true, shouldTouch: true });
      
      // Announce to screen readers
      console.log(`[SelectedMediaSummary] Reordered image from position ${oldIndex + 1} to ${newIndex + 1}`);
    }
    
    setActiveId(null);
  };

  // Handle drag cancel - prevents lingering overlay
  const handleDragCancel = () => {
    setActiveId(null);
  };

  const removeImage = (imageId: string) => {
    const updatedImages = currentImages.filter((img: any) => img.id !== imageId);
    form.setValue('images', updatedImages, { shouldDirty: true });
  };

  // Generate unique IDs for sortable items
  const imageIds = currentImages.map((image: any) => image.id);

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

      {/* Gallery Images with Drag-and-Drop */}
      {totalImages > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Selected Gallery Images ({totalImages})</h4>
            <p className="text-sm text-muted-foreground">
              Drag to reorder • {totalImages} image{totalImages !== 1 ? 's' : ''}
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveId(event.active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={imageIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentImages.map((image: any, index: number) => (
                  <SortableImageCard
                    key={image.id}
                    id={image.id}
                    image={image}
                    index={index}
                    onRemove={() => removeImage(image.id)}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeId && (() => {
                const activeImage = currentImages.find((img: any) => img.id === activeId);
                
                if (!activeImage) {
                  return null;
                }
                
                return (
                  <div className="shadow-2xl transform rotate-2 scale-105">
                    <ImagePreviewCard image={activeImage} />
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>

          {/* Breakdown by source */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>• Evidence Gallery: {evidenceImages.length}</span>
            <span>• Custom Uploads: {customImages.length}</span>
          </div>
        </div>
      ) : null}

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
    </div>
  );
}
