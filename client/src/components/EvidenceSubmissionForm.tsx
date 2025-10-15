import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Upload, File, Trash2, AlertCircle, Lock } from "lucide-react";

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
  hasChildren: z.boolean().default(false),
}).refine((data) => {
  if (data.hasChildren) {
    return true;
  }
  return true;
}, {
  message: t('forms:evidence_submission.parental_consent_validation'),
  path: ["hasChildren"],
});

interface EvidenceSubmissionFormProps {
  onClose: () => void;
  schoolId?: string;
  evidenceRequirementId?: string;
  preSelectedStage?: 'inspire' | 'investigate' | 'act';
  isAdminOrPartner?: boolean;
}

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface School {
  id: string;
  name: string;
  country: string;
}

interface SchoolDashboardData {
  school: {
    id: string;
    name: string;
    country: string;
    inspireCompleted: boolean;
    investigateCompleted: boolean;
    actCompleted: boolean;
  };
}

export default function EvidenceSubmissionForm({ 
  onClose, 
  schoolId: initialSchoolId, 
  evidenceRequirementId,
  preSelectedStage,
  isAdminOrPartner = false
}: EvidenceSubmissionFormProps) {
  const { t } = useTranslation(['forms', 'common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [consentFiles, setConsentFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingConsent, setIsUploadingConsent] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(initialSchoolId || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consentInputRef = useRef<HTMLInputElement>(null);
  
  // Sync selectedSchoolId when initialSchoolId changes (e.g., when admin selects a school)
  useEffect(() => {
    if (initialSchoolId) {
      setSelectedSchoolId(initialSchoolId);
    }
  }, [initialSchoolId]);
  
  // Fetch schools list for admin/partner
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ['/api/admin/schools'],
    enabled: isAdminOrPartner,
  });
  
  // Fetch school stage completion data
  const { data: schoolData } = useQuery<SchoolDashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: !!selectedSchoolId && !isAdminOrPartner,
  });
  
  // Calculate which stages are locked based on completion status
  const lockedStages = {
    inspire: false, // Always unlocked
    investigate: !schoolData?.school?.inspireCompleted,
    act: !schoolData?.school?.investigateCompleted,
  };
  
  const evidenceSchema = createEvidenceSchema(t);

  const form = useForm<z.infer<typeof evidenceSchema>>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      title: '',
      description: '',
      stage: preSelectedStage,
      videoLinks: '',
      visibility: 'private',
      hasChildren: false,
    },
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof evidenceSchema> & { files: UploadedFile[]; parentalConsentFiles: UploadedFile[] }) => {
      if (!selectedSchoolId) {
        throw new Error(t('forms:evidence_submission.select_school_error'));
      }
      const response = await apiRequest('POST', '/api/evidence', {
        ...data,
        schoolId: selectedSchoolId,
        evidenceRequirementId,
        files: data.files,
        parentalConsentFiles: data.parentalConsentFiles,
      });
      return response;
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
    onError: (error: any) => {
      console.error("Evidence submission error:", error);
      
      // Check for 403 Forbidden error (locked stage)
      if (error?.message?.includes('403') || error?.message?.includes('locked stage') || error?.message?.includes('Cannot submit evidence to locked stage')) {
        toast({
          title: t('forms:evidence_submission.stage_locked_title'),
          description: t('forms:evidence_submission.stage_locked_error_message'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('forms:evidence_submission.error_title'),
          description: error?.message || t('forms:evidence_submission.error_message'),
          variant: "destructive",
        });
      }
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of files) {
        if (file.size > 157286400) {
          toast({
            title: t('forms:evidence_submission.file_too_large_title'),
            description: t('forms:evidence_submission.file_too_large_message', { filename: file.name, limit: 150 }),
            variant: "destructive",
          });
          continue;
        }

        const uploadResponse = await fetch('/api/objects/upload', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to get upload URL');
        }
        
        const { uploadURL } = await uploadResponse.json();
        
        const uploadFileResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });
        
        if (!uploadFileResponse.ok) {
          throw new Error('Failed to upload file');
        }
        
        const aclResponse = await apiRequest('PUT', '/api/evidence-files', {
          fileURL: uploadURL.split('?')[0],
          visibility: form.getValues('visibility'),
          filename: file.name,
        });
        const { objectPath } = await aclResponse.json();
        
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          url: objectPath,
          size: file.size,
          type: file.type,
        }]);
      }
      
      toast({
        title: t('forms:evidence_submission.upload_success_title'),
        description: t('forms:evidence_submission.upload_success_message', { count: files.length }),
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('forms:evidence_submission.upload_failed_title'),
        description: t('forms:evidence_submission.upload_failed_message'),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConsentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingConsent(true);
    
    try {
      for (const file of files) {
        if (file.size > 157286400) {
          toast({
            title: t('forms:evidence_submission.file_too_large_title'),
            description: t('forms:evidence_submission.file_too_large_message', { filename: file.name, limit: 150 }),
            variant: "destructive",
          });
          continue;
        }

        const uploadResponse = await fetch('/api/objects/upload', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to get upload URL');
        }
        
        const { uploadURL } = await uploadResponse.json();
        
        const uploadFileResponse = await fetch(uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
        });
        
        if (!uploadFileResponse.ok) {
          throw new Error('Failed to upload file');
        }
        
        const aclResponse = await apiRequest('PUT', '/api/evidence-files', {
          fileURL: uploadURL.split('?')[0],
          visibility: 'private',
          filename: file.name,
        });
        const { objectPath } = await aclResponse.json();
        
        setConsentFiles(prev => [...prev, {
          name: file.name,
          url: objectPath,
          size: file.size,
          type: file.type,
        }]);
      }
      
      toast({
        title: t('forms:evidence_submission.upload_success_title'),
        description: t('forms:evidence_submission.upload_success_consent_message', { count: files.length }),
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('forms:evidence_submission.upload_failed_title'),
        description: t('forms:evidence_submission.upload_failed_consent_message'),
        variant: "destructive",
      });
    } finally {
      setIsUploadingConsent(false);
      if (consentInputRef.current) {
        consentInputRef.current.value = '';
      }
    }
  };

  const removeConsentFile = (index: number) => {
    setConsentFiles(prev => prev.filter((_, i) => i !== index));
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
        title: t('forms:evidence_submission.evidence_required_title'),
        description: t('forms:evidence_submission.evidence_required_message'),
        variant: "destructive",
      });
      return;
    }

    if (data.hasChildren && consentFiles.length === 0) {
      toast({
        title: t('forms:evidence_submission.parental_consent_required_title'),
        description: t('forms:evidence_submission.parental_consent_required_message'),
        variant: "destructive",
      });
      return;
    }

    // Check if selected stage is locked
    const selectedStage = data.stage as 'inspire' | 'investigate' | 'act';
    if (lockedStages[selectedStage]) {
      const previousStage = selectedStage === 'act' ? t('forms:evidence_submission.stage_name_investigate') : t('forms:evidence_submission.stage_name_inspire');
      toast({
        title: t('forms:evidence_submission.stage_locked_title'),
        description: t('forms:evidence_submission.stage_locked_message', { previousStage }),
        variant: "destructive",
      });
      return;
    }

    submitEvidenceMutation.mutate({
      ...data,
      files: uploadedFiles,
      parentalConsentFiles: consentFiles,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full my-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 max-h-[85vh] overflow-y-auto">
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
              {/* School Selector - only show for admin/partner */}
              {isAdminOrPartner && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('forms:evidence_submission.select_school')} *
                  </label>
                  <Select 
                    value={selectedSchoolId} 
                    onValueChange={setSelectedSchoolId}
                  >
                    <SelectTrigger data-testid="select-school">
                      <SelectValue placeholder={t('forms:evidence_submission.select_school_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name} ({school.country})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedSchoolId && (
                    <p className="text-xs text-red-600">{t('forms:evidence_submission.select_school_required')}</p>
                  )}
                </div>
              )}
              
              {/* Program Stage - only show if not pre-selected */}
              {!preSelectedStage && (
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
                          <SelectItem value="inspire">
                            {t('forms:evidence_submission.stage_inspire')}
                          </SelectItem>
                          <SelectItem 
                            value="investigate" 
                            disabled={lockedStages.investigate}
                          >
                            <div className="flex items-center gap-2">
                              {lockedStages.investigate && <Lock className="h-4 w-4 text-gray-400" />}
                              {t('forms:evidence_submission.stage_investigate')}
                            </div>
                          </SelectItem>
                          <SelectItem 
                            value="act" 
                            disabled={lockedStages.act}
                          >
                            <div className="flex items-center gap-2">
                              {lockedStages.act && <Lock className="h-4 w-4 text-gray-400" />}
                              {t('forms:evidence_submission.stage_act')}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {lockedStages.investigate && field.value === 'investigate' && (
                        <p className="text-xs text-red-600 mt-1">
                          {t('forms:evidence_submission.complete_inspire_first')}
                        </p>
                      )}
                      {lockedStages.act && field.value === 'act' && (
                        <p className="text-xs text-red-600 mt-1">
                          {t('forms:evidence_submission.complete_investigate_first')}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block text-center">
                    <Button
                      type="button"
                      className="bg-pcs_blue hover:bg-pcs_blue/90 text-white mb-2"
                      disabled={isUploading}
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                      data-testid="button-upload-files"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      {isUploading ? t('forms:evidence_submission.uploading') : t('forms:evidence_submission.upload_files')}
                    </Button>
                    <p className="text-sm text-gray-500">
                      {t('forms:evidence_submission.upload_help')}
                    </p>
                  </label>
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

              {/* Child Permission Tracking */}
              <FormField
                control={form.control}
                name="hasChildren"
                render={({ field }) => (
                  <FormItem className="space-y-3 border rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-has-children"
                        />
                      </FormControl>
                      <div className="grid gap-1.5 leading-none flex-1">
                        <FormLabel className="text-sm font-medium">
                          {t('forms:evidence_submission.has_children_label')}
                        </FormLabel>
                        <FormDescription className="text-xs">
                          {t('forms:evidence_submission.has_children_description')}
                        </FormDescription>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Parental Consent Upload */}
              {form.watch('hasChildren') && (
                <div className="space-y-4 border-l-4 border-coral pl-4">
                  <FormLabel className="text-coral font-semibold">{t('forms:evidence_submission.parental_consent_section_title')} *</FormLabel>
                  <p className="text-sm text-gray-600">
                    {t('forms:evidence_submission.parental_consent_section_description')}
                  </p>
                  <div className="border-2 border-dashed border-coral/30 rounded-lg p-6 bg-coral/5">
                    <input
                      ref={consentInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      onChange={handleConsentFileSelect}
                      className="hidden"
                      disabled={isUploadingConsent}
                      id="consent-upload"
                    />
                    <label htmlFor="consent-upload" className="cursor-pointer block text-center">
                      <Button
                        type="button"
                        className="bg-coral hover:bg-coral/90 text-white mb-2"
                        disabled={isUploadingConsent}
                        onClick={(e) => {
                          e.preventDefault();
                          consentInputRef.current?.click();
                        }}
                        data-testid="button-upload-consent"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        {isUploadingConsent ? t('forms:evidence_submission.uploading_consent') : t('forms:evidence_submission.upload_consent_forms')}
                      </Button>
                      <p className="text-sm text-gray-500">
                        {t('forms:evidence_submission.consent_file_help')}
                      </p>
                    </label>
                  </div>

                  {/* Consent Files Preview */}
                  {consentFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-navy">{t('forms:evidence_submission.uploaded_consent_documents')}</h4>
                      {consentFiles.map((file, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          data-testid={`consent-file-${index}`}
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
                            onClick={() => removeConsentFile(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-remove-consent-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                  disabled={
                    submitEvidenceMutation.isPending || 
                    isUploading || 
                    (form.watch('stage') && lockedStages[form.watch('stage') as 'inspire' | 'investigate' | 'act'])
                  }
                  className="flex-1 bg-coral hover:bg-coral/90"
                  data-testid="button-submit-evidence"
                >
                  {submitEvidenceMutation.isPending ? t('forms:evidence_submission.submitting') : t('forms:evidence_submission.submit_button')}
                </Button>
              </div>
              
              {/* Show locked stage warning below submit button */}
              {form.watch('stage') && lockedStages[form.watch('stage') as 'inspire' | 'investigate' | 'act'] && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <div className="font-medium">{t('forms:evidence_submission.stage_locked_warning_title')}</div>
                    <div>
                      {t('forms:evidence_submission.stage_locked_warning_message', { 
                        stageName: form.watch('stage') === 'act' ? t('forms:evidence_submission.stage_name_investigate') : t('forms:evidence_submission.stage_name_inspire')
                      })}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
