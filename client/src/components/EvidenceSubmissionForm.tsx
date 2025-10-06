import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Upload, File, Trash2, AlertCircle } from "lucide-react";
import type { UploadResult } from "@uppy/core";

// Factory function for translated schema
const createEvidenceSchema = (t: (key: string, options?: any) => string) => z.object({
  title: z.string().min(1, t('forms:validation.required')).max(200, t('forms:validation.name_too_long', { max: 200 })),
  description: z.string().min(10, t('forms:evidence_submission.description_min_length')),
  stage: z.enum(['inspire', 'investigate', 'act'], {
    required_error: t('forms:validation.invalid_selection'),
  }),
  videoLinks: z.string().optional(),
  visibility: z.enum(['private', 'public'], {
    required_error: t('forms:validation.invalid_selection'),
  }),
});

interface EvidenceSubmissionFormProps {
  onClose: () => void;
  schoolId: string;
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

export default function EvidenceSubmissionForm({ onClose, schoolId }: EvidenceSubmissionFormProps) {
  const { t } = useTranslation(['forms', 'common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const evidenceSchema = createEvidenceSchema(t);

  const form = useForm<z.infer<typeof evidenceSchema>>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      title: '',
      description: '',
      stage: undefined,
      videoLinks: '',
      visibility: 'private',
    },
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof evidenceSchema> & { files: UploadedFile[] }) => {
      await apiRequest('POST', '/api/evidence', {
        ...data,
        schoolId,
        files: data.files,
      });
    },
    onSuccess: () => {
      toast({
        title: t('forms:evidence_submission.success_title'),
        description: t('forms:evidence_submission.success_message'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onClose();
    },
    onError: (error) => {
      console.error("Evidence submission error:", error);
      toast({
        title: t('forms:evidence_submission.error_title'),
        description: t('forms:evidence_submission.error_message'),
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(t('forms:evidence_submission.file_upload_error'));
      }
      
      const { uploadURL } = await response.json();
      return {
        method: 'PUT' as const,
        url: uploadURL,
      };
    } catch (error) {
      console.error('Upload URL error:', error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      setIsUploading(true);
      const successful = result.successful || [];
      
      for (const file of successful) {
        const fileData = {
          name: file.name || 'Unknown file',
          url: file.uploadURL || '',
          size: file.size || 0,
          type: file.type || '',
        };
        
        // Set ACL policy for the uploaded file
        if (fileData.url) {
          await apiRequest('PUT', '/api/evidence-files', {
            fileURL: fileData.url,
            visibility: form.getValues('visibility'),
          });
        }
        
        setUploadedFiles(prev => [...prev, fileData]);
      }
      
      toast({
        title: "Files Uploaded",
        description: `${successful.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Upload Error",
        description: "Files uploaded but failed to process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('pdf')) return '📄';
    return '📁';
  };

  const onSubmit = (data: z.infer<typeof evidenceSchema>) => {
    if (uploadedFiles.length === 0 && !data.videoLinks?.trim()) {
      toast({
        title: "Evidence Required",
        description: "Please upload at least one file or provide a video link.",
        variant: "destructive",
      });
      return;
    }

    submitEvidenceMutation.mutate({
      ...data,
      files: uploadedFiles,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-navy" data-testid="text-evidence-form-title">
              {t('forms:evidence_submission.title')}
            </h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              data-testid="button-close-evidence-form"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Program Stage */}
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms:evidence_submission.stage')} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-program-stage">
                          <SelectValue placeholder={t('forms:evidence_submission.stage_placeholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="inspire">{t('forms:evidence_submission.stage_inspire')}</SelectItem>
                        <SelectItem value="investigate">{t('forms:evidence_submission.stage_investigate')}</SelectItem>
                        <SelectItem value="act">{t('forms:evidence_submission.stage_act')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Evidence Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms:evidence_submission.evidence_title')} *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('forms:evidence_submission.evidence_title_placeholder')}
                        {...field}
                        data-testid="input-evidence-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms:evidence_submission.description')} *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('forms:evidence_submission.description_placeholder')}
                        rows={4}
                        {...field}
                        data-testid="textarea-evidence-description"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('forms:evidence_submission.description_help')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Video Links */}
              <FormField
                control={form.control}
                name="videoLinks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('forms:evidence_submission.video_links')}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={t('forms:evidence_submission.video_links_placeholder')}
                        rows={3}
                        {...field}
                        data-testid="textarea-video-links"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t('forms:evidence_submission.video_links_help')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <div className="space-y-4">
                <FormLabel>{t('forms:evidence_submission.files')}</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={157286400}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="bg-pcs_blue hover:bg-pcs_blue/90 text-white"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {isUploading ? t('forms:evidence_submission.uploading') : t('forms:evidence_submission.upload_files')}
                  </ObjectUploader>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('forms:evidence_submission.upload_help')}
                  </p>
                </div>

                {/* Uploaded Files Preview */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-navy">{t('forms:evidence_submission.uploaded_files')}</h4>
                    {uploadedFiles.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        data-testid={`uploaded-file-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getFileIcon(file.type)}</span>
                          <div>
                            <div className="font-medium text-navy">{file.name}</div>
                            <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-remove-file-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility Settings */}
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>{t('forms:evidence_submission.visibility')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem value="private" id="private" data-testid="radio-visibility-private" />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <label 
                              htmlFor="private"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t('forms:evidence_submission.visibility_private_title')}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {t('forms:evidence_submission.visibility_private_description')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem value="public" id="public" data-testid="radio-visibility-public" />
                          <div className="grid gap-1.5 leading-none flex-1">
                            <label 
                              htmlFor="public"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t('forms:evidence_submission.visibility_public_title')}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              {t('forms:evidence_submission.visibility_public_description')}
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Info Banner */}
              <div className="bg-yellow/10 border border-yellow rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 mb-1">{t('forms:evidence_submission.review_process_title')}</div>
                  <div className="text-yellow-700">
                    {t('forms:evidence_submission.review_process_description')}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  data-testid="button-cancel-evidence"
                >
                  {t('common:buttons.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={submitEvidenceMutation.isPending || isUploading}
                  className="flex-1 bg-coral hover:bg-coral/90"
                  data-testid="button-submit-evidence"
                >
                  {submitEvidenceMutation.isPending ? t('forms:evidence_submission.submitting') : t('forms:evidence_submission.submit_button')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
