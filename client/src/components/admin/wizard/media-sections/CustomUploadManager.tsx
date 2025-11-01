import { useState, useEffect } from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Trash2, Image as ImageIcon, Video, Upload, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TemplateConfig } from "../templateConfigurations";
import type { CaseStudyVideo } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { nanoid } from 'nanoid';

interface CustomUploadManagerProps {
  form: UseFormReturn<any>;
  templateConfig: TemplateConfig;
}

export function CustomUploadManager({ form, templateConfig }: CustomUploadManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [expandedImageIndex, setExpandedImageIndex] = useState<string | undefined>(undefined);

  const { fields: videoFields, append: appendVideo, remove: removeVideo } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  const currentImages = form.watch("images") || [];
  const customImages = currentImages.filter((img: any) => img.source === 'custom' || !img.source);

  // Auto-expand the most recently added custom image
  useEffect(() => {
    if (customImages.length > 0) {
      const lastCustomImageIndex = currentImages.findIndex((img: any, idx: number) => 
        idx === currentImages.length - 1 && (img.source === 'custom' || !img.source)
      );
      if (lastCustomImageIndex >= 0) {
        setExpandedImageIndex(`custom-image-${lastCustomImageIndex}`);
      }
    }
  }, [customImages.length]);

  const handleImageUpload = async (file: any) => {
    try {
      const response = await fetch('/api/case-studies/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
      };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleImageComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const newImages = [];
        let failedCount = 0;

        // Process each uploaded file
        for (const uploadedFile of result.successful) {
          const uploadUrl = uploadedFile.uploadURL?.split('?')[0] || '';

          try {
            // Set ACL policy for each uploaded image
            const aclResponse = await fetch('/api/case-studies/set-acl', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileURL: uploadUrl,
                visibility: 'public',
                filename: `case-study-custom-${Date.now()}-${nanoid(6)}.jpg`,
                owner: user.id,
              }),
            });

            if (!aclResponse.ok) {
              const errorData = await aclResponse.json();
              throw new Error(errorData.message || 'Failed to set ACL');
            }

            const aclData = await aclResponse.json();
            const objectPath = aclData.objectPath || uploadUrl;

            newImages.push({
              id: nanoid(),
              url: objectPath,
              caption: "",
              altText: "",
              source: 'custom',
            });
          } catch (error) {
            console.error('Failed to process image:', uploadUrl, error);
            failedCount++;
          }
        }

        // Add all successfully processed images to the form
        if (newImages.length > 0) {
          const currentImages = form.getValues("images") || [];
          form.setValue("images", [...currentImages, ...newImages]);

          toast({
            title: "Images Uploaded",
            description: `${newImages.length} image${newImages.length > 1 ? 's' : ''} successfully uploaded${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
          });
        } else {
          toast({
            title: "Upload Error",
            description: "Failed to upload images. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to set image permissions";
        toast({
          title: "Upload Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const removeImageAtIndex = (index: number) => {
    const currentImages = form.getValues("images") || [];
    const updatedImages = currentImages.filter((_: any, idx: number) => idx !== index);
    form.setValue("images", updatedImages);
  };

  const addVideoUrl = () => {
    const newVideo: CaseStudyVideo = {
      url: "",
      platform: "youtube",
      embedId: "",
      featured: false,
    };
    appendVideo(newVideo);
  };

  const handleFeaturedToggle = (index: number, checked: boolean) => {
    if (checked) {
      const videos = form.getValues("videos") || [];
      videos.forEach((_: any, idx: number) => {
        if (idx !== index) {
          form.setValue(`videos.${idx}.featured`, false);
        }
      });
    }
    form.setValue(`videos.${index}.featured`, checked);
  };

  const detectVideoPlatform = (url: string, index: number) => {
    let platform = "other";
    let embedId = "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      platform = "youtube";
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match) embedId = match[1];
    } else if (url.includes("vimeo.com")) {
      platform = "vimeo";
      const vimeoRegex = /vimeo\.com\/(\d+)/;
      const match = url.match(vimeoRegex);
      if (match) embedId = match[1];
    }

    form.setValue(`videos.${index}.platform`, platform);
    form.setValue(`videos.${index}.embedId`, embedId);
  };

  return (
    <div className="space-y-8">
      {/* Custom Image Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Upload images that aren't in the Evidence Gallery
          </p>
          <ObjectUploader
            maxNumberOfFiles={5}
            onGetUploadParameters={handleImageUpload}
            onComplete={handleImageComplete}
            dataTestId="button-upload-images"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Images
          </ObjectUploader>
        </div>

        {customImages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No custom images yet. Click "Upload Images" to add your own images.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={expandedImageIndex}
            onValueChange={setExpandedImageIndex}
          >
            {currentImages.map((image: any, index: number) => {
              if (image.source === 'evidence') return null;
              
              return (
                <AccordionItem key={index} value={`custom-image-${index}`}>
                  <AccordionTrigger data-testid={`accordion-custom-image-${index}`}>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      <span>Custom Image {index + 1} {!image.caption && <span className="text-destructive ml-2">• Caption required</span>}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <img
                        src={image.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />

                      <FormField
                        control={form.control}
                        name={`images.${index}.caption`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Caption *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Add a caption describing this image"
                                {...field}
                                value={field.value || ""}
                                data-testid={`input-custom-image-caption-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`images.${index}.altText`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alt Text</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Describe the image for accessibility"
                                {...field}
                                value={field.value || ""}
                                data-testid={`input-custom-image-alt-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImageAtIndex(index)}
                        data-testid={`button-remove-custom-image-${index}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Image
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Embedded Videos (conditional) */}
      {templateConfig.requiredFields.allowVideos && (
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Embedded Videos</h4>
              <p className="text-sm text-muted-foreground">
                Add YouTube or Vimeo videos to your case study
              </p>
            </div>
            <Button
              type="button"
              onClick={addVideoUrl}
              variant="outline"
              size="sm"
              data-testid="button-add-video"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Video
            </Button>
          </div>

          {videoFields.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Video className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No videos yet. Click "Add Video" to embed a YouTube or Vimeo video.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {videoFields.map((field, index) => {
                const isFeatured = form.watch(`videos.${index}.featured`);
                return (
                  <AccordionItem key={field.id} value={`video-${index}`}>
                    <AccordionTrigger data-testid={`accordion-video-${index}`}>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>
                          {form.watch(`videos.${index}.platform`) || "Video"} {index + 1}
                        </span>
                        {isFeatured && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 ml-2" />
                        )}
                      </div>
                    </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <FormField
                        control={form.control}
                        name={`videos.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video URL *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://youtube.com/watch?v=..."
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  detectVideoPlatform(e.target.value, index);
                                }}
                                data-testid={`input-video-url-${index}`}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Paste a YouTube or Vimeo URL
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`videos.${index}.platform`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-video-platform-${index}`}>
                                  <SelectValue placeholder="Select platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="youtube">YouTube</SelectItem>
                                <SelectItem value="vimeo">Vimeo</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`videos.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter video title (optional)"
                                {...field}
                                value={field.value || ""}
                                data-testid={`input-video-title-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch(`videos.${index}.embedId`) && (
                        <div className="p-2 bg-muted rounded">
                          <p className="text-sm text-muted-foreground">
                            ✓ Embed ID detected: {form.watch(`videos.${index}.embedId`)}
                          </p>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name={`videos.${index}.featured`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                <Star className="h-4 w-4" />
                                Featured Video
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Display this video prominently in the videos section
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={(checked) => handleFeaturedToggle(index, checked)}
                                data-testid={`switch-video-featured-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeVideo(index)}
                        data-testid={`button-remove-video-${index}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Video
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      )}
    </div>
  );
}
