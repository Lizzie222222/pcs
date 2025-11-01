import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCountries } from "@/hooks/useCountries";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/ui/states";
import { BookOpen, Plus, Search, Edit, Trash2, X, FileText, Upload, Eye, Image, FileType, Sheet, File as FileIcon, Sparkles, Loader2 } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LANGUAGE_FLAG_MAP, LANGUAGE_NAME_MAP, languageCodeFromName } from "@/lib/languageUtils";
import type { UploadResult } from "@uppy/core";
import BulkResourceUpload from "./BulkResourceUpload";
import { ResourcePreviewDialog } from "./ResourcePreviewDialog";
import { apiRequest } from "@/lib/queryClient";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string | null;
  language: string | null;
  languages?: string[] | null;
  country: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  downloadCount: number;
  visibility: 'public' | 'private';
  isActive: boolean;
  hiddenOnResourcesPage: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// All 14 supported language codes
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ar', 'zh', 'el', 'ru', 'ko', 'id', 'cy'];
const RESOURCE_TYPES = ['lesson_plan', 'assembly', 'teacher_toolkit', 'student_workbook', 'printable_activities'];
const RESOURCE_THEMES = ['ocean_literacy', 'climate_change', 'plastic_pollution', 'science', 'design_technology', 'geography', 'cross_curricular', 'enrichment', 'student_action'];
const RESOURCE_TAGS = ['all_stages', 'beginner', 'advanced', 'featured'];

function ResourceForm({ resource, onClose, onSuccess }: {
  resource?: Resource;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: countryOptions = [] } = useCountries();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    description: resource?.description || '',
    stage: resource?.stage || 'inspire',
    ageRange: resource?.ageRange || '',
    resourceType: (resource as any)?.resourceType || '',
    theme: (resource as any)?.theme || '',
    themes: (resource as any)?.themes || [],
    tags: (resource as any)?.tags || [],
    languages: resource?.languages || (() => {
      if (resource?.language) {
        const code = languageCodeFromName(resource.language);
        return code ? [code] : [];
      }
      return [];
    })(),
    country: resource?.country || 'global',
    fileUrl: resource?.fileUrl || '',
    fileType: resource?.fileType || '',
    fileSize: resource?.fileSize || 0,
    visibility: resource?.visibility || 'public',
    isActive: resource?.isActive ?? true,
    hiddenOnResourcesPage: resource?.hiddenOnResourcesPage ?? false,
    isPinned: resource?.isPinned ?? false,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLanguageToggle = (languageCode: string) => {
    setFormData(prev => {
      const currentLanguages = prev.languages as string[];
      const isSelected = currentLanguages.includes(languageCode);
      
      if (isSelected) {
        // Remove language
        return {
          ...prev,
          languages: currentLanguages.filter(code => code !== languageCode)
        };
      } else {
        // Add language
        return {
          ...prev,
          languages: [...currentLanguages, languageCode]
        };
      }
    });
  };

  const handleThemeToggle = (themeValue: string) => {
    setFormData(prev => {
      const currentThemes = prev.themes as string[];
      const isSelected = currentThemes.includes(themeValue);
      
      if (isSelected) {
        return {
          ...prev,
          themes: currentThemes.filter(t => t !== themeValue)
        };
      } else {
        return {
          ...prev,
          themes: [...currentThemes, themeValue]
        };
      }
    });
  };

  const handleTagToggle = (tagValue: string) => {
    setFormData(prev => {
      const currentTags = prev.tags as string[];
      const isSelected = currentTags.includes(tagValue);
      
      if (isSelected) {
        return {
          ...prev,
          tags: currentTags.filter(t => t !== tagValue)
        };
      } else {
        return {
          ...prev,
          tags: [...currentTags, tagValue]
        };
      }
    });
  };

  const handleGetUploadParameters = async (file: any) => {
    try {
      const response = await fetch('/api/case-studies/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }
      
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
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

  const handleFileUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const fileUrl = uploadedFile.uploadURL?.split('?')[0] || '';

      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        // Set ACL policy for the uploaded file
        // Always use 'public' for object storage (resource-level access control is handled separately)
        const aclResponse = await fetch('/api/evidence-files', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileURL: fileUrl,
            visibility: 'public',
            filename: uploadedFile.name || `resource-${Date.now()}`,
            owner: user.id,
          }),
        });

        if (!aclResponse.ok) {
          const errorData = await aclResponse.json();
          throw new Error(errorData.message || 'Failed to set file permissions');
        }

        // Extract the normalized object path from the ACL response
        const aclData = await aclResponse.json();
        const normalizedObjectPath = aclData.objectPath || fileUrl;

        // Update form data with file information
        // Use the normalized object path (not the raw upload URL)
        setFormData(prev => ({
          ...prev,
          fileUrl: normalizedObjectPath,
          fileType: uploadedFile.type || '',
          fileSize: uploadedFile.size || 0,
        }));

        setIsUploading(false);

        toast({
          title: "File Uploaded",
          description: `${uploadedFile.name || 'File'} has been successfully uploaded.`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
        toast({
          title: "Upload Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsUploading(false);
      }
    }
  };

  const handleAIAutoFill = async () => {
    if (!formData.fileUrl || !formData.title) {
      toast({
        title: "Cannot Auto-fill",
        description: "Please upload a file first to use AI auto-fill.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingMetadata(true);

    try {
      const resourcePayload = [{
        id: resource?.id || 'temp',
        title: formData.title,
        filename: formData.title,
        fileType: formData.fileType,
      }];

      const res = await apiRequest('POST', '/api/resources/ai-analyze-metadata', {
        resources: resourcePayload,
      });

      const response = await res.json();

      if (response.suggestions && Array.isArray(response.suggestions) && response.suggestions.length > 0) {
        const suggestion = response.suggestions[0];
        
        // Update form data with AI suggestions
        setFormData(prev => ({
          ...prev,
          title: suggestion.title || prev.title,
          description: suggestion.description || prev.description,
          stage: suggestion.stage || prev.stage,
          ageRange: suggestion.ageRange || prev.ageRange,
          resourceType: suggestion.resourceType || prev.resourceType,
          theme: suggestion.theme || prev.theme,
        }));

        toast({
          title: "AI Auto-fill Complete",
          description: "Resource metadata has been filled with AI suggestions. Review and adjust as needed.",
        });
      } else {
        toast({
          title: "No Suggestions",
          description: "AI couldn't generate suggestions for this resource.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('AI auto-fill error:', error);
      toast({
        title: "AI Auto-fill Failed",
        description: error.message || "Failed to generate AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one language is selected
    if (formData.languages.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one language.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const endpoint = resource ? `/api/resources/${resource.id}` : '/api/resources';
      const method = resource ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        country: formData.country === 'global' ? null : formData.country,
        // For backward compatibility, set language to first selected language or 'English'
        language: formData.languages.length > 0 
          ? (LANGUAGE_NAME_MAP[formData.languages[0]] || 'English')
          : 'English',
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('Failed to save resource');
      }

      toast({
        title: resource ? "Resource Updated" : "Resource Created",
        description: `The resource has been successfully ${resource ? 'updated' : 'created'}.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save resource. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy">
              {resource ? 'Edit Resource' : 'Add New Resource'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-resource-form"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter resource title"
                required
                data-testid="input-resource-title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter resource description"
                rows={3}
                data-testid="textarea-resource-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Programme Stage *
                </label>
                <Select 
                  value={formData.stage} 
                  onValueChange={(value) => handleInputChange('stage', value)}
                >
                  <SelectTrigger data-testid="select-resource-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspire">Inspire</SelectItem>
                    <SelectItem value="investigate">Investigate</SelectItem>
                    <SelectItem value="act">Act</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Range
                </label>
                <Input
                  value={formData.ageRange}
                  onChange={(e) => handleInputChange('ageRange', e.target.value)}
                  placeholder="e.g., 8-12 years"
                  data-testid="input-resource-age-range"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Languages *
              </label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {SUPPORTED_LANGUAGES.map((languageCode) => (
                    <div key={languageCode} className="flex items-center space-x-2">
                      <Checkbox
                        id={`language-${languageCode}`}
                        checked={formData.languages.includes(languageCode)}
                        onCheckedChange={() => handleLanguageToggle(languageCode)}
                        data-testid={`checkbox-language-${languageCode}`}
                      />
                      <label
                        htmlFor={`language-${languageCode}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {LANGUAGE_FLAG_MAP[languageCode]} {LANGUAGE_NAME_MAP[languageCode]}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Select all languages in which this resource is available
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Country
              </label>
              <Select 
                value={formData.country} 
                onValueChange={(value) => handleInputChange('country', value)}
              >
                <SelectTrigger data-testid="select-resource-country">
                  <SelectValue placeholder="Global (all countries)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all countries)</SelectItem>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility *
              </label>
              <Select 
                value={formData.visibility} 
                onValueChange={(value) => handleInputChange('visibility', value)}
              >
                <SelectTrigger data-testid="select-resource-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (visible to everyone)</SelectItem>
                  <SelectItem value="private">Private (requires login)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.visibility === 'public' 
                  ? 'This resource will be visible to all website visitors'
                  : 'This resource will only be visible to registered schools'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {formData.fileUrl ? (
                  <div className="space-y-3">
                    <FileText className="h-8 w-8 text-pcs_blue mx-auto" />
                    <p className="text-sm text-gray-600 font-medium">
                      {formData.fileUrl.split('/').pop()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(formData.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <div className="flex gap-2 justify-center">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={157286400}
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleFileUploadComplete}
                        buttonClassName="bg-teal hover:bg-teal/90 text-white"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Replace File'}
                      </ObjectUploader>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            fileUrl: '',
                            fileType: '',
                            fileSize: 0
                          }));
                        }}
                        data-testid="button-remove-file"
                      >
                        Remove File
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      You can replace the file while keeping the same resource, or remove it entirely.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      Upload a resource file (PDF, DOC, PPT, XLS, etc.)
                    </p>
                    <p className="text-xs text-gray-500">
                      Maximum file size: 150MB
                    </p>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={157286400}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleFileUploadComplete}
                      buttonClassName="bg-pcs_blue hover:bg-blue-600 text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Upload File'}
                    </ObjectUploader>
                  </div>
                )}
              </div>
            </div>

            {formData.fileUrl && (
              <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <h3 className="font-medium text-gray-900">AI Auto-fill</h3>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={handleAIAutoFill}
                          disabled={isGeneratingMetadata}
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-white hover:bg-purple-50 border-purple-200"
                          data-testid="button-ai-autofill-single"
                        >
                          {isGeneratingMetadata ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {isGeneratingMetadata ? 'Generating...' : 'Auto-fill with AI'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-sm">
                          AI analyzes your uploaded file and automatically suggests a title, description, stage, theme, age range, and resource type based on the file content and name.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-gray-600">
                  Let AI analyse your file and suggest metadata to save time. You can review and adjust the suggestions before saving.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Type
                </label>
                <Select 
                  value={formData.resourceType} 
                  onValueChange={(value) => handleInputChange('resourceType', value)}
                >
                  <SelectTrigger data-testid="select-resource-type">
                    <SelectValue placeholder="Select a type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson_plan">Lesson Plan</SelectItem>
                    <SelectItem value="assembly">Assembly</SelectItem>
                    <SelectItem value="teacher_toolkit">Teacher Toolkit</SelectItem>
                    <SelectItem value="student_workbook">Student Workbook</SelectItem>
                    <SelectItem value="printable_activities">Printable Activities</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Themes (Multiple Selection)
                </label>
                <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {RESOURCE_THEMES.filter(t => t !== 'none').map(theme => (
                      <label key={theme} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input
                          type="checkbox"
                          checked={(formData.themes as string[]).includes(theme)}
                          onChange={() => handleThemeToggle(theme)}
                          className="rounded border-gray-300"
                          data-testid={`checkbox-theme-${theme}`}
                        />
                        <span className="text-sm capitalize">
                          {theme.replace(/_/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.themes as string[]).length} theme(s) selected
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {RESOURCE_TAGS.map(tag => (
                    <label key={tag} className="flex items-center gap-2 cursor-pointer hover:bg-white px-3 py-1.5 rounded-full border border-gray-200">
                      <input
                        type="checkbox"
                        checked={(formData.tags as string[]).includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="rounded border-gray-300"
                        data-testid={`checkbox-tag-${tag}`}
                      />
                      <span className="text-sm capitalize">
                        {tag.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(formData.tags as string[]).length} tag(s) selected
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300"
                data-testid="checkbox-resource-active"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active (visible to users)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hiddenOnResourcesPage"
                checked={formData.hiddenOnResourcesPage}
                onChange={(e) => handleInputChange('hiddenOnResourcesPage', e.target.checked)}
                className="rounded border-gray-300"
                data-testid="checkbox-resource-hidden"
              />
              <label htmlFor="hiddenOnResourcesPage" className="text-sm font-medium text-gray-700">
                Hide on Resources page (searchable but not in browse)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => handleInputChange('isPinned', e.target.checked)}
                className="rounded border-gray-300"
                data-testid="checkbox-resource-pinned"
              />
              <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
                Pin to top of Resources page
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-resource"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || formData.languages.length === 0}
                className="flex-1 bg-pcs_blue hover:bg-blue-600"
                data-testid="button-save-resource"
              >
                {isSubmitting ? 'Saving...' : (resource ? 'Update Resource' : 'Create Resource')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: countryOptions = [] } = useCountries();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [resourceFilters, setResourceFilters] = useState({
    search: '',
    stage: 'all',
    country: 'all',
    language: 'all',
    visibility: 'all',
    isActive: 'all',
  });

  const { data: resources = [], isLoading, refetch } = useQuery<Resource[]>({
    queryKey: ['/api/resources', resourceFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...resourceFilters,
        limit: '100',
        offset: '0',
        includeHidden: 'true',
      });
      Object.keys(resourceFilters).forEach(key => {
        const value = resourceFilters[key as keyof typeof resourceFilters];
        if (!value || value === 'all') {
          params.delete(key);
        }
      });
      
      const response = await fetch(`/api/resources?${params}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete resource');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Resource Deleted",
        description: "The resource has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (resourceIds: string[]) => {
      const response = await apiRequest('POST', '/api/admin/resources/bulk-delete', { resourceIds });
      return response;
    },
    onSuccess: (data: any) => {
      const { successCount, failedCount, failures = [] } = data;
      
      // Build description message
      let description = '';
      
      if (failedCount === 0) {
        // All successful
        description = `Successfully deleted ${successCount} resource${successCount > 1 ? 's' : ''}.`;
        
        toast({
          title: "Bulk Delete Successful",
          description,
        });
      } else if (successCount === 0) {
        // All failed
        const failureDetails = Array.isArray(failures) 
          ? failures.map((f: any) => `${f.id}: ${f.reason}`).join('\n')
          : 'Unknown error occurred';
        toast({
          title: "Bulk Delete Failed",
          description: `Failed to delete all selected resources:\n${failureDetails}`,
          variant: "destructive",
        });
      } else {
        // Partial success
        description = `Successfully deleted ${successCount} resource${successCount > 1 ? 's' : ''}. Failed to delete ${failedCount}.`;
        
        const failureDetails = Array.isArray(failures)
          ? failures.map((f: any) => `${f.id}: ${f.reason}`).join('\n')
          : 'Unknown error occurred';
        description += `\n${failureDetails}`;
        
        toast({
          title: "Bulk Delete Partially Successful",
          description,
          variant: "destructive",
        });
      }
      
      setBulkDeleteDialogOpen(false);
      setSelectedResourceIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete resources. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setResourceFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectResource = (resourceId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedResourceIds);
    if (checked) {
      newSelectedIds.add(resourceId);
    } else {
      newSelectedIds.delete(resourceId);
    }
    setSelectedResourceIds(newSelectedIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allResourceIds = resources.map(resource => resource.id);
      setSelectedResourceIds(new Set(allResourceIds));
    } else {
      setSelectedResourceIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedResourceIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedResourceIds));
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string | null, fileUrl: string | null) => {
    if (!fileType) return <FileIcon className="h-8 w-8 text-gray-400" />;
    
    const type = fileType.toLowerCase();
    
    // Images - show thumbnail if possible
    if (type.includes('image')) {
      if (fileUrl) {
        return (
          <div className="w-10 h-10 rounded overflow-hidden border border-gray-200">
            <img 
              src={fileUrl} 
              alt="Thumbnail" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        );
      }
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    
    // PDFs
    if (type.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    
    // Word documents
    if (type.includes('word') || type.includes('doc')) {
      return <FileType className="h-8 w-8 text-blue-600" />;
    }
    
    // Excel/Spreadsheets
    if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) {
      return <Sheet className="h-8 w-8 text-green-600" />;
    }
    
    // PowerPoint
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) {
      return <FileType className="h-8 w-8 text-orange-500" />;
    }
    
    // Default
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  const renderLanguageBadges = (resource: Resource) => {
    const languages = resource.languages || [];
    
    if (languages.length === 0) {
      // Fallback to old language field if no languages array
      return (
        <span className="text-gray-600 text-sm">
          {resource.language || 'English'}
        </span>
      );
    }

    const displayLanguages = languages.slice(0, 5);
    const remainingCount = languages.length - 5;

    return (
      <div 
        className="flex flex-wrap gap-1 items-center" 
        data-testid={`badge-resource-languages-${resource.id}`}
      >
        {displayLanguages.map((langCode) => (
          <span 
            key={langCode}
            className="text-lg" 
            title={LANGUAGE_NAME_MAP[langCode] || langCode}
          >
            {LANGUAGE_FLAG_MAP[langCode] || '🏳️'}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="text-xs text-gray-500 font-medium">
            +{remainingCount} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-refactor-source="ResourcesManagement">
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BookOpen className="h-5 w-5" />
                Resource Management
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                {selectedResourceIds.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="destructive"
                    className="min-h-11 px-3 sm:px-4"
                    data-testid="button-bulk-delete-resources"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedResourceIds.size})
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="bg-pcs_blue hover:bg-blue-600 min-h-11 px-3 sm:px-4"
                  data-testid="button-add-resource"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
                <Button
                  onClick={() => setShowBulkUpload(true)}
                  variant="outline"
                  className="border-pcs_blue text-pcs_blue hover:bg-blue-50 min-h-11 px-3 sm:px-4"
                  data-testid="button-bulk-upload"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resources..."
                value={resourceFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
                data-testid="input-search-resources"
              />
            </div>
            <Select 
              value={resourceFilters.stage} 
              onValueChange={(value) => handleFilterChange('stage', value)}
            >
              <SelectTrigger className="min-h-11" data-testid="select-stage-filter">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="inspire">Inspire</SelectItem>
                <SelectItem value="investigate">Investigate</SelectItem>
                <SelectItem value="act">Act</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.country} 
              onValueChange={(value) => handleFilterChange('country', value)}
            >
              <SelectTrigger className="min-h-11" data-testid="select-country-filter">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countryOptions.map((country) => (
                  <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.language} 
              onValueChange={(value) => handleFilterChange('language', value)}
            >
              <SelectTrigger className="min-h-11" data-testid="select-language-filter">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="German">German</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.visibility} 
              onValueChange={(value) => handleFilterChange('visibility', value)}
            >
              <SelectTrigger className="min-h-11" data-testid="select-visibility-filter">
                <SelectValue placeholder="All Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.isActive} 
              onValueChange={(value) => handleFilterChange('isActive', value)}
            >
              <SelectTrigger className="min-h-11" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="w-12 px-2 py-3">
                    <Checkbox
                      checked={
                        resources.length > 0 &&
                        resources.every(resource => selectedResourceIds.has(resource.id))
                      }
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all-resources"
                    />
                  </th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Preview</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Title</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Stage</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Visibility</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Country</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Languages</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">File Size</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Downloads</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left px-2 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="px-2 py-3">
                        <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-10 w-10 bg-gray-200 rounded"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-6 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-1">
                          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-1">
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  resources.map((resource) => (
                  <tr key={resource.id} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-3">
                      <Checkbox
                        checked={selectedResourceIds.has(resource.id)}
                        onCheckedChange={(checked) => handleSelectResource(resource.id, checked as boolean)}
                        data-testid={`checkbox-resource-${resource.id}`}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => resource.fileUrl && setPreviewResource(resource)}
                        className="flex items-center justify-center hover:bg-gray-100 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!resource.fileUrl}
                        data-testid={`thumbnail-${resource.id}`}
                      >
                        {getFileTypeIcon(resource.fileType, resource.fileUrl)}
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium text-navy">{resource.title}</div>
                      {resource.description && (
                        <div className="text-sm text-gray-600 truncate max-w-xs">
                          {resource.description}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <Badge className={getStageColor(resource.stage)}>
                        {resource.stage}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <Badge 
                        variant={resource.visibility === 'public' ? 'default' : 'secondary'}
                        className={resource.visibility === 'public' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                        data-testid={`badge-visibility-${resource.id}`}
                      >
                        {resource.visibility === 'public' ? 'Public' : 'Private'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-gray-600">{resource.country || 'Global'}</td>
                    <td className="px-2 py-3">
                      {renderLanguageBadges(resource)}
                    </td>
                    <td className="px-2 py-3 text-gray-600">{formatFileSize(resource.fileSize) || 'N/A'}</td>
                    <td className="px-2 py-3 text-gray-600">{resource.downloadCount || 0}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant={resource.isActive ? 'default' : 'secondary'}>
                          {resource.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {resource.hiddenOnResourcesPage && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Hidden
                          </Badge>
                        )}
                        {resource.isPinned && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                            Pinned
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resource.fileUrl && setPreviewResource(resource)}
                          disabled={!resource.fileUrl}
                          data-testid={`button-preview-${resource.id}`}
                          title="Preview file"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingResource(resource)}
                          data-testid={`button-edit-${resource.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this resource?')) {
                              deleteResourceMutation.mutate(resource.id);
                            }
                          }}
                          data-testid={`button-delete-${resource.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {!isLoading && resources.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No resources found. Add your first resource to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <ResourceForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            refetch();
          }}
        />
      )}

      {editingResource && (
        <ResourceForm
          resource={editingResource}
          onClose={() => setEditingResource(null)}
          onSuccess={() => {
            setEditingResource(null);
            refetch();
          }}
        />
      )}

      {showBulkUpload && (
        <BulkResourceUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            refetch();
          }}
        />
      )}

      {previewResource && previewResource.fileUrl && (
        <ResourcePreviewDialog
          fileUrl={previewResource.fileUrl}
          fileName={previewResource.title}
          fileType={previewResource.fileType || 'application/octet-stream'}
          onClose={() => setPreviewResource(null)}
        />
      )}

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-delete-resources">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resources</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedResourceIds.size} resource{selectedResourceIds.size > 1 ? 's' : ''}</strong>? 
              This action cannot be undone.
              {selectedResourceIds.size > 0 && selectedResourceIds.size <= 3 && (
                <div className="mt-2">
                  <p className="font-medium">Resources to be deleted:</p>
                  <ul className="list-disc list-inside mt-1">
                    {Array.from(selectedResourceIds).map(id => {
                      const resource = resources.find(r => r.id === id);
                      return resource ? (
                        <li key={id} className="text-sm">{resource.title}</li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete-resources">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-bulk-delete-resources"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Resources'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
