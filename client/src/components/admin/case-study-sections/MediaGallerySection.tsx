import { useState, useEffect } from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Trash2, Image as ImageIcon, Video, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CaseStudyImage, CaseStudyVideo } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

interface MediaGallerySectionProps {
  form: UseFormReturn<any>;
}

export function MediaGallerySection({ form }: MediaGallerySectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [expandedImageIndex, setExpandedImageIndex] = useState<string | undefined>(undefined);

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: "images",
  });

  // Auto-expand the most recently added image
  useEffect(() => {
    if (imageFields.length > 0) {
      const lastIndex = imageFields.length - 1;
      setExpandedImageIndex(`image-${lastIndex}`);
    }
  }, [imageFields.length]);

  const { fields: videoFields, append: appendVideo, remove: removeVideo } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  const handleImageUpload = async () => {
    try {
      const response = await fetch('/api/case-studies/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
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

  const handleImageComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, type: 'gallery' | 'before' | 'after') => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const imageUrl = uploadedFile.uploadURL?.split('?')[0] || '';

      // Set ACL policy for the uploaded image
      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const aclResponse = await fetch('/api/case-studies/set-acl', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileURL: imageUrl,
            visibility: 'public',
            filename: `case-study-${type}-${Date.now()}.jpg`,
            owner: user.id,
          }),
        });

        if (!aclResponse.ok) {
          const errorData = await aclResponse.json();
          throw new Error(errorData.message || 'Failed to set ACL');
        }

        if (type === 'gallery') {
          const newImage: CaseStudyImage = {
            url: imageUrl,
            caption: "",
            altText: "",
          };
          appendImage(newImage);
          setUploadingImage(false);
          // useEffect will auto-expand the new image
        } else if (type === 'before') {
          form.setValue('beforeImage', imageUrl);
          setUploadingBefore(false);
        } else if (type === 'after') {
          form.setValue('afterImage', imageUrl);
          setUploadingAfter(false);
        }

        toast({
          title: "Image Uploaded",
          description: "Image has been successfully uploaded",
        });
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

  const addVideoUrl = () => {
    const newVideo: CaseStudyVideo = {
      url: "",
      platform: "youtube",
      embedId: "",
    };
    appendVideo(newVideo);
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
      {/* Before/After Images */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Before & After Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="beforeImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Before Image</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {field.value ? (
                      <div className="relative">
                        <img
                          src={field.value}
                          alt="Before"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => form.setValue('beforeImage', '')}
                          data-testid="button-remove-before-image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        onGetUploadParameters={handleImageUpload}
                        onComplete={(result) => handleImageComplete(result, 'before')}
                        buttonClassName="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Before Image
                      </ObjectUploader>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="afterImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>After Image</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {field.value ? (
                      <div className="relative">
                        <img
                          src={field.value}
                          alt="After"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => form.setValue('afterImage', '')}
                          data-testid="button-remove-after-image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        onGetUploadParameters={handleImageUpload}
                        onComplete={(result) => handleImageComplete(result, 'after')}
                        buttonClassName="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload After Image
                      </ObjectUploader>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Image Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Image Gallery</h3>
            <p className="text-sm text-muted-foreground">
              Upload multiple images to showcase your project
            </p>
          </div>
          <ObjectUploader
            maxNumberOfFiles={5}
            onGetUploadParameters={handleImageUpload}
            onComplete={(result) => handleImageComplete(result, 'gallery')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Images
          </ObjectUploader>
        </div>

        {imageFields.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No images yet. Click "Upload Images" to get started.
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
            {imageFields.map((field, index) => (
              <AccordionItem key={field.id} value={`image-${index}`}>
                <AccordionTrigger data-testid={`accordion-image-${index}`}>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Image {index + 1} {!form.watch(`images.${index}.caption`) && <span className="text-destructive ml-2">• Caption required</span>}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <img
                      src={form.watch(`images.${index}.url`)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />

                    <FormField
                      control={form.control}
                      name={`images.${index}.caption`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Caption</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Add a caption"
                              {...field}
                              value={field.value || ""}
                              data-testid={`input-image-caption-${index}`}
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
                              data-testid={`input-image-alt-${index}`}
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
                      onClick={() => removeImage(index)}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Image
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Embedded Videos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Embedded Videos</h3>
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
                No videos yet. Click "Add Video" to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {videoFields.map((field, index) => (
              <AccordionItem key={field.id} value={`video-${index}`}>
                <AccordionTrigger data-testid={`accordion-video-${index}`}>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>
                      {form.watch(`videos.${index}.platform`) || "Video"} {index + 1}
                    </span>
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
                          <FormDescription>
                            Paste a YouTube or Vimeo URL
                          </FormDescription>
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

                    {form.watch(`videos.${index}.embedId`) && (
                      <div className="p-2 bg-muted rounded">
                        <p className="text-sm text-muted-foreground">
                          Embed ID detected: {form.watch(`videos.${index}.embedId`)}
                        </p>
                      </div>
                    )}

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
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
