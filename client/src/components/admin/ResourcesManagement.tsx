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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/states";
import { BookOpen, Plus, Search, Edit, Trash2, X, FileText, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  ageRange: string | null;
  language: string | null;
  country: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  downloadCount: number;
  visibility: 'public' | 'registered';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    description: resource?.description || '',
    stage: resource?.stage || 'inspire',
    ageRange: resource?.ageRange || '',
    language: resource?.language || 'English',
    country: resource?.country || 'global',
    fileUrl: resource?.fileUrl || '',
    fileType: resource?.fileType || '',
    fileSize: resource?.fileSize || 0,
    visibility: resource?.visibility || 'public',
    isActive: resource?.isActive ?? true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGetUploadParameters = async () => {
    try {
      const response = await fetch('/api/objects/upload', {
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
        const aclResponse = await fetch('/api/evidence-files', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileURL: fileUrl,
            visibility: formData.visibility,
            filename: uploadedFile.name || `resource-${Date.now()}`,
            owner: user.id,
          }),
        });

        if (!aclResponse.ok) {
          const errorData = await aclResponse.json();
          throw new Error(errorData.message || 'Failed to set file permissions');
        }

        // Update form data with file information
        setFormData(prev => ({
          ...prev,
          fileUrl: fileUrl,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const endpoint = resource ? `/api/resources/${resource.id}` : '/api/resources';
      const method = resource ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        country: formData.country === 'global' ? null : formData.country,
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
                  Program Stage *
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <Select 
                  value={formData.language} 
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger data-testid="select-resource-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
                  <SelectItem value="registered">Registered Only (requires login)</SelectItem>
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
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-pcs_blue mx-auto" />
                    <p className="text-sm text-gray-600 font-medium">
                      {formData.fileUrl.split('/').pop()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(formData.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
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
                disabled={isSubmitting || !formData.title.trim()}
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
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
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

  const handleFilterChange = (key: string, value: string) => {
    setResourceFilters(prev => ({ ...prev, [key]: value }));
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

  if (isLoading) {
    return <LoadingSpinner message="Loading resources..." />;
  }

  return (
    <div className="space-y-6" data-refactor-source="ResourcesManagement">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Resource Management
            </CardTitle>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-add-resource"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <SelectTrigger data-testid="select-stage-filter">
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
              <SelectTrigger data-testid="select-country-filter">
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
              <SelectTrigger data-testid="select-language-filter">
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
              <SelectTrigger data-testid="select-visibility-filter">
                <SelectValue placeholder="All Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="registered">Registered Only</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={resourceFilters.isActive} 
              onValueChange={(value) => handleFilterChange('isActive', value)}
            >
              <SelectTrigger data-testid="select-status-filter">
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
                  <th className="text-left p-3 font-medium text-gray-700">Title</th>
                  <th className="text-left p-3 font-medium text-gray-700">Stage</th>
                  <th className="text-left p-3 font-medium text-gray-700">Visibility</th>
                  <th className="text-left p-3 font-medium text-gray-700">Country</th>
                  <th className="text-left p-3 font-medium text-gray-700">Language</th>
                  <th className="text-left p-3 font-medium text-gray-700">File Size</th>
                  <th className="text-left p-3 font-medium text-gray-700">Downloads</th>
                  <th className="text-left p-3 font-medium text-gray-700">Status</th>
                  <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-navy">{resource.title}</div>
                      {resource.description && (
                        <div className="text-sm text-gray-600 truncate max-w-xs">
                          {resource.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge className={getStageColor(resource.stage)}>
                        {resource.stage}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant={resource.visibility === 'public' ? 'default' : 'secondary'}
                        className={resource.visibility === 'public' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                        data-testid={`badge-visibility-${resource.id}`}
                      >
                        {resource.visibility === 'public' ? 'Public' : 'Registered Only'}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-600">{resource.country || 'Global'}</td>
                    <td className="p-3 text-gray-600">{resource.language || 'English'}</td>
                    <td className="p-3 text-gray-600">{formatFileSize(resource.fileSize) || 'N/A'}</td>
                    <td className="p-3 text-gray-600">{resource.downloadCount || 0}</td>
                    <td className="p-3">
                      <Badge variant={resource.isActive ? 'default' : 'secondary'}>
                        {resource.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
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
                ))}
              </tbody>
            </table>
            
            {resources.length === 0 && (
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
    </div>
  );
}
