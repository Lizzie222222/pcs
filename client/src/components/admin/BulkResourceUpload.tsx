import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCountries } from "@/hooks/useCountries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/ui/states";
import { Upload, X, FileText, CheckCircle2, XCircle, Edit2, Save, Sparkles, Loader2, Languages } from "lucide-react";
import { LANGUAGE_FLAG_MAP, LANGUAGE_NAME_MAP } from "@/lib/languageUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SelectedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadedResource {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string;
  languages: string[];
  country: string | null;
  resourceType: string | null;
  theme: string | null;
  visibility: 'public' | 'registered';
  isActive: boolean;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface BatchEditState {
  stage?: 'inspire' | 'investigate' | 'act';
  visibility?: 'public' | 'registered';
  resourceType?: string;
  theme?: string;
  ageRange?: string;
  country?: string;
}

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ar', 'zh', 'el', 'ru', 'ko', 'id', 'cy'];
const RESOURCE_TYPES = ['lesson_plan', 'assembly', 'teacher_toolkit', 'student_workbook', 'printable_activities'];
const RESOURCE_THEMES = ['ocean_literacy', 'climate_change', 'plastic_pollution', 'science', 'design_technology', 'geography', 'cross_curricular', 'enrichment'];

export default function BulkResourceUpload({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const { data: countryOptions = [] } = useCountries();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadedResources, setUploadedResources] = useState<UploadedResource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchEditValues, setBatchEditValues] = useState<BatchEditState>({});
  const [dragActive, setDragActive] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const newFiles: SelectedFile[] = files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending' as const,
      progress: 0,
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    
    selectedFiles.forEach(selectedFile => {
      formData.append('files', selectedFile.file);
    });

    try {
      // Update all files to uploading status
      setSelectedFiles(prev => 
        prev.map(f => ({ ...f, status: 'uploading' as const, progress: 50 }))
      );

      const response = await fetch('/api/resources/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const result = await response.json();
      
      // Calculate summary from actual response structure
      const successfulCount = result.results?.length || 0;
      const failedCount = result.errors?.length || 0;
      const totalCount = successfulCount + failedCount;
      
      // Update file statuses based on results
      const updatedFiles = selectedFiles.map(selectedFile => {
        const uploadResult = result.results?.find((r: any) => 
          r.filename === selectedFile.file.name
        );
        
        const errorResult = result.errors?.find((e: any) => 
          e.filename === selectedFile.file.name
        );
        
        if (uploadResult?.success) {
          return {
            ...selectedFile,
            status: 'success' as const,
            progress: 100,
          };
        } else if (errorResult) {
          return {
            ...selectedFile,
            status: 'error' as const,
            progress: 0,
            error: errorResult.error || 'Upload failed',
          };
        } else {
          return {
            ...selectedFile,
            status: 'error' as const,
            progress: 0,
            error: 'Upload failed',
          };
        }
      });

      setSelectedFiles(updatedFiles);

      // Extract successfully uploaded resources
      const resources = (result.results || [])
        .filter((r: any) => r.success && r.resource)
        .map((r: any) => ({
          ...r.resource,
          description: r.resource.description || '',
          ageRange: r.resource.ageRange || '',
          languages: r.resource.languages || ['en'],
          country: r.resource.country || 'global',
          resourceType: r.resource.resourceType || 'none',
          theme: r.resource.theme || 'none',
        }));

      setUploadedResources(resources);
      setUploadComplete(true);

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successfulCount} of ${totalCount} files.`,
      });

      if (failedCount > 0) {
        toast({
          title: "Some Uploads Failed",
          description: `${failedCount} files failed to upload. Check the status below.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files. Please try again.",
        variant: "destructive",
      });
      
      setSelectedFiles(prev => 
        prev.map(f => ({ ...f, status: 'error' as const, progress: 0, error: 'Upload failed' }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleResourceChange = (resourceId: string, field: string, value: any) => {
    setUploadedResources(prev => 
      prev.map(r => r.id === resourceId ? { ...r, [field]: value } : r)
    );
  };

  const handleLanguageToggle = (resourceId: string, languageCode: string) => {
    setUploadedResources(prev => 
      prev.map(r => {
        if (r.id !== resourceId) return r;
        const languages = r.languages || [];
        const isSelected = languages.includes(languageCode);
        
        return {
          ...r,
          languages: isSelected
            ? languages.filter(code => code !== languageCode)
            : [...languages, languageCode]
        };
      })
    );
  };

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resourceId)) {
        newSet.delete(resourceId);
      } else {
        newSet.add(resourceId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedResourceIds.size === uploadedResources.length) {
      setSelectedResourceIds(new Set());
    } else {
      setSelectedResourceIds(new Set(uploadedResources.map(r => r.id)));
    }
  };

  const applyBatchEdit = () => {
    if (selectedResourceIds.size === 0) {
      toast({
        title: "No Resources Selected",
        description: "Please select resources to apply batch edits.",
        variant: "destructive",
      });
      return;
    }

    setUploadedResources(prev => 
      prev.map(r => {
        if (!selectedResourceIds.has(r.id)) return r;
        
        const updates: Partial<UploadedResource> = {};
        if (batchEditValues.stage) updates.stage = batchEditValues.stage;
        if (batchEditValues.visibility) updates.visibility = batchEditValues.visibility;
        if (batchEditValues.resourceType !== undefined) updates.resourceType = batchEditValues.resourceType || null;
        if (batchEditValues.theme !== undefined) updates.theme = batchEditValues.theme || null;
        if (batchEditValues.ageRange !== undefined) updates.ageRange = batchEditValues.ageRange;
        if (batchEditValues.country !== undefined) updates.country = batchEditValues.country || null;
        
        return { ...r, ...updates };
      })
    );

    toast({
      title: "Batch Edit Applied",
      description: `Updated ${selectedResourceIds.size} resources.`,
    });

    setBatchEditMode(false);
    setBatchEditValues({});
    setSelectedResourceIds(new Set());
  };

  const handleAIAutoFill = async () => {
    if (uploadedResources.length === 0) {
      toast({
        title: "No Resources",
        description: "No resources available to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingMetadata(true);

    try {
      const resourcesPayload = uploadedResources.map(r => ({
        id: r.id,
        title: r.title,
        filename: r.title,
        fileType: r.fileType,
      }));

      const res = await apiRequest('POST', '/api/resources/ai-analyze-metadata', {
        resources: resourcesPayload,
      });

      const response = await res.json();

      if (response.suggestions && Array.isArray(response.suggestions)) {
        setUploadedResources(prev => 
          prev.map(resource => {
            const suggestion = response.suggestions.find((s: any) => s.id === resource.id);
            
            if (!suggestion) return resource;

            // Merge suggestions with existing data, keeping user edits
            return {
              ...resource,
              title: suggestion.title || resource.title,
              description: suggestion.description || resource.description || '',
              stage: suggestion.stage || resource.stage,
              theme: suggestion.theme === 'none' 
                ? resource.theme 
                : (resource.theme === 'none' ? suggestion.theme : resource.theme),
              ageRange: suggestion.ageRange || resource.ageRange || '',
              resourceType: suggestion.resourceType === 'none' 
                ? resource.resourceType 
                : (resource.resourceType === 'none' ? suggestion.resourceType : resource.resourceType),
            };
          })
        );

        toast({
          title: "AI Suggestions Applied",
          description: `AI-generated titles and descriptions applied to ${response.suggestions.length} resources.`,
        });
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error: any) {
      console.error('AI auto-fill error:', error);
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Failed to generate AI suggestions. You can still edit metadata manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const resource of uploadedResources) {
        try {
          await apiRequest('PUT', `/api/resources/${resource.id}`, {
            title: resource.title,
            description: resource.description,
            stage: resource.stage,
            ageRange: resource.ageRange,
            languages: resource.languages,
            country: resource.country === 'global' ? null : resource.country,
            resourceType: resource.resourceType === 'none' ? null : resource.resourceType,
            theme: resource.theme === 'none' ? null : resource.theme,
            visibility: resource.visibility,
            isActive: resource.isActive,
            fileUrl: resource.fileUrl,
            fileType: resource.fileType,
            fileSize: resource.fileSize,
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to update resource ${resource.id}:`, error);
        }
      }

      if (errorCount === 0) {
        toast({
          title: "Changes Saved",
          description: `Successfully updated ${successCount} resources.`,
        });
        
        // Invalidate resources cache
        queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
        
        onSuccess();
      } else {
        toast({
          title: "Partial Success",
          description: `Updated ${successCount} resources, but ${errorCount} failed.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-pcs_blue text-white';
      case 'investigate': return 'bg-teal text-white';
      case 'act': return 'bg-coral text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatEnumLabel = (value: string) => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy">
              Bulk Resource Upload
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="button-close-bulk-upload"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!uploadComplete ? (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-pcs_blue bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                data-testid="drop-zone-bulk-upload"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drag and drop files here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to select files (PDF, DOC, PPT, XLS, etc.)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-select"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-pcs_blue hover:bg-blue-600"
                  data-testid="button-select-files"
                >
                  Select Files
                </Button>
                <p className="text-xs text-gray-500 mt-3">
                  Maximum 50 files, 150MB per file
                </p>
              </div>

              {/* File List Preview */}
              {selectedFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Selected Files ({selectedFiles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedFiles.map(selectedFile => (
                        <div
                          key={selectedFile.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          data-testid={`file-item-${selectedFile.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-5 w-5 text-gray-600" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {selectedFile.file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(selectedFile.file.size)}
                              </p>
                            </div>
                            {selectedFile.status === 'uploading' && (
                              <div className="w-32">
                                <Progress value={selectedFile.progress} className="h-2" />
                              </div>
                            )}
                            {selectedFile.status === 'success' && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" data-testid={`icon-success-${selectedFile.id}`} />
                            )}
                            {selectedFile.status === 'error' && (
                              <div className="flex items-center gap-2">
                                <XCircle className="h-5 w-5 text-red-600" data-testid={`icon-error-${selectedFile.id}`} />
                                <span className="text-xs text-red-600">{selectedFile.error}</span>
                              </div>
                            )}
                          </div>
                          {selectedFile.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(selectedFile.id)}
                              data-testid={`button-remove-file-${selectedFile.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={handleUpload}
                        disabled={isUploading || selectedFiles.length === 0}
                        className="flex-1 bg-pcs_blue hover:bg-blue-600"
                        data-testid="button-start-upload"
                      >
                        {isUploading ? (
                          <>
                            <LoadingSpinner message="" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Edit Controls */}
              {batchEditMode && (
                <Card className="border-pcs_blue">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Edit2 className="h-5 w-5" />
                      Batch Edit Mode ({selectedResourceIds.size} selected)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stage
                        </label>
                        <Select
                          value={batchEditValues.stage || ''}
                          onValueChange={(value) => setBatchEditValues(prev => ({ ...prev, stage: value as any }))}
                        >
                          <SelectTrigger data-testid="select-batch-stage">
                            <SelectValue placeholder="Select stage..." />
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
                          Visibility
                        </label>
                        <Select
                          value={batchEditValues.visibility || ''}
                          onValueChange={(value) => setBatchEditValues(prev => ({ ...prev, visibility: value as any }))}
                        >
                          <SelectTrigger data-testid="select-batch-visibility">
                            <SelectValue placeholder="Select visibility..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="registered">Registered Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resource Type
                        </label>
                        <Select
                          value={batchEditValues.resourceType || 'none'}
                          onValueChange={(value) => setBatchEditValues(prev => ({ ...prev, resourceType: value === 'none' ? '' : value }))}
                        >
                          <SelectTrigger data-testid="select-batch-resource-type">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {RESOURCE_TYPES.map(type => (
                              <SelectItem key={type} value={type}>
                                {formatEnumLabel(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Theme
                        </label>
                        <Select
                          value={batchEditValues.theme || 'none'}
                          onValueChange={(value) => setBatchEditValues(prev => ({ ...prev, theme: value === 'none' ? '' : value }))}
                        >
                          <SelectTrigger data-testid="select-batch-theme">
                            <SelectValue placeholder="Select theme..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {RESOURCE_THEMES.map(theme => (
                              <SelectItem key={theme} value={theme}>
                                {formatEnumLabel(theme)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Age Range
                        </label>
                        <Input
                          value={batchEditValues.ageRange || ''}
                          onChange={(e) => setBatchEditValues(prev => ({ ...prev, ageRange: e.target.value }))}
                          placeholder="e.g., 8-12 years"
                          data-testid="input-batch-age-range"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <Select
                          value={batchEditValues.country || 'global'}
                          onValueChange={(value) => setBatchEditValues(prev => ({ ...prev, country: value === 'global' ? '' : value }))}
                        >
                          <SelectTrigger data-testid="select-batch-country">
                            <SelectValue placeholder="Select country..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="global">Global</SelectItem>
                            {countryOptions.map(country => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={applyBatchEdit}
                        className="bg-pcs_blue hover:bg-blue-600"
                        data-testid="button-apply-batch-edit"
                      >
                        Apply to Selected
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBatchEditMode(false);
                          setBatchEditValues({});
                          setSelectedResourceIds(new Set());
                        }}
                        data-testid="button-cancel-batch-edit"
                      >
                        Cancel Batch Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resources Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Uploaded Resources ({uploadedResources.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleAIAutoFill}
                        disabled={isGeneratingMetadata}
                        variant="outline"
                        className="gap-2"
                        data-testid="button-ai-autofill"
                      >
                        {isGeneratingMetadata ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isGeneratingMetadata ? 'Generating...' : 'Auto-fill with AI'}
                      </Button>
                      {!batchEditMode && (
                        <Button
                          variant="outline"
                          onClick={() => setBatchEditMode(true)}
                          data-testid="button-enable-batch-edit"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Batch Edit
                        </Button>
                      )}
                      <Button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-save-all-changes"
                      >
                        {isSaving ? (
                          <>
                            <LoadingSpinner message="" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save All Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          {batchEditMode && (
                            <th className="text-left p-3">
                              <Checkbox
                                checked={selectedResourceIds.size === uploadedResources.length && uploadedResources.length > 0}
                                onCheckedChange={toggleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </th>
                          )}
                          <th className="text-left p-3 font-medium text-gray-700">Title</th>
                          <th className="text-left p-3 font-medium text-gray-700">Stage</th>
                          <th className="text-left p-3 font-medium text-gray-700">Visibility</th>
                          <th className="text-left p-3 font-medium text-gray-700">Type</th>
                          <th className="text-left p-3 font-medium text-gray-700">Theme</th>
                          <th className="text-left p-3 font-medium text-gray-700">Age Range</th>
                          <th className="text-left p-3 font-medium text-gray-700">Languages</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedResources.map(resource => (
                          <tr key={resource.id} className="border-b hover:bg-gray-50">
                            {batchEditMode && (
                              <td className="p-3">
                                <Checkbox
                                  checked={selectedResourceIds.has(resource.id)}
                                  onCheckedChange={() => toggleResourceSelection(resource.id)}
                                  data-testid={`checkbox-select-${resource.id}`}
                                />
                              </td>
                            )}
                            <td className="p-3">
                              <Input
                                value={resource.title}
                                onChange={(e) => handleResourceChange(resource.id, 'title', e.target.value)}
                                className="min-w-[200px]"
                                data-testid={`input-title-${resource.id}`}
                              />
                            </td>
                            <td className="p-3">
                              <Select
                                value={resource.stage}
                                onValueChange={(value) => handleResourceChange(resource.id, 'stage', value)}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-stage-${resource.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="inspire">Inspire</SelectItem>
                                  <SelectItem value="investigate">Investigate</SelectItem>
                                  <SelectItem value="act">Act</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value={resource.visibility}
                                onValueChange={(value) => handleResourceChange(resource.id, 'visibility', value)}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-visibility-${resource.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="registered">Registered</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value={resource.resourceType || 'none'}
                                onValueChange={(value) => handleResourceChange(resource.id, 'resourceType', value === 'none' ? null : value)}
                              >
                                <SelectTrigger className="w-40" data-testid={`select-type-${resource.id}`}>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {RESOURCE_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>
                                      {formatEnumLabel(type)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Select
                                value={resource.theme || 'none'}
                                onValueChange={(value) => handleResourceChange(resource.id, 'theme', value === 'none' ? null : value)}
                              >
                                <SelectTrigger className="w-40" data-testid={`select-theme-${resource.id}`}>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {RESOURCE_THEMES.map(theme => (
                                    <SelectItem key={theme} value={theme}>
                                      {formatEnumLabel(theme)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Input
                                value={resource.ageRange}
                                onChange={(e) => handleResourceChange(resource.id, 'ageRange', e.target.value)}
                                placeholder="e.g., 8-12"
                                className="w-28"
                                data-testid={`input-age-range-${resource.id}`}
                              />
                            </td>
                            <td className="p-3">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-between"
                                    data-testid={`button-languages-${resource.id}`}
                                  >
                                    <span className="flex items-center gap-1">
                                      <Languages className="h-4 w-4" />
                                      {resource.languages.length} selected
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                                  <div className="space-y-2">
                                    <h4 className="font-medium text-sm mb-3">Select Languages</h4>
                                    <div className="space-y-2">
                                      {SUPPORTED_LANGUAGES.map((langCode) => (
                                        <div key={langCode} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`${resource.id}-language-${langCode}`}
                                            checked={resource.languages.includes(langCode)}
                                            onCheckedChange={() => handleLanguageToggle(resource.id, langCode)}
                                            data-testid={`checkbox-lang-${langCode}-${resource.id}`}
                                          />
                                          <label
                                            htmlFor={`${resource.id}-language-${langCode}`}
                                            className="text-sm font-medium leading-none cursor-pointer"
                                          >
                                            {LANGUAGE_FLAG_MAP[langCode]} {LANGUAGE_NAME_MAP[langCode]}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
