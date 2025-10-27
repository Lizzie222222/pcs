import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { 
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
  ImageIcon,
  FileVideo,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import type { EvidenceRequirement } from "@/components/admin/shared/types";

interface EvidenceRequirementsSectionProps {
  allResources: any[];
  resourcesLoading: boolean;
}

export default function EvidenceRequirementsSection({ 
  allResources, 
  resourcesLoading 
}: EvidenceRequirementsSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Evidence Requirements state
  const [activeEvidenceStage, setActiveEvidenceStage] = useState<'inspire' | 'investigate' | 'act'>('inspire');
  const [editingRequirement, setEditingRequirement] = useState<EvidenceRequirement | null>(null);
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<EvidenceRequirement | null>(null);
  const [requirementDeleteDialogOpen, setRequirementDeleteDialogOpen] = useState(false);
  const [requirementFormData, setRequirementFormData] = useState({
    title: '',
    description: '',
    resourceUrl: '',
    resourceId: '',
  });

  // Evidence Requirements query
  const { data: evidenceRequirements = [], isLoading: requirementsLoading } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
  });

  // Evidence Requirements mutations
  const createRequirementMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; resourceUrl?: string; resourceId?: string; stage: string; orderIndex: number }) => {
      return await apiRequest('POST', '/api/evidence-requirements', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setRequirementDialogOpen(false);
      setRequirementFormData({ title: '', description: '', resourceUrl: '', resourceId: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create evidence requirement.",
        variant: "destructive",
      });
    },
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ title: string; description: string; resourceUrl: string; resourceId: string }> }) => {
      return await apiRequest('PATCH', `/api/evidence-requirements/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setRequirementDialogOpen(false);
      setEditingRequirement(null);
      setRequirementFormData({ title: '', description: '', resourceUrl: '', resourceId: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update evidence requirement.",
        variant: "destructive",
      });
    },
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/evidence-requirements/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setRequirementDeleteDialogOpen(false);
      setDeletingRequirement(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete evidence requirement. It may be linked to existing evidence.",
        variant: "destructive",
      });
    },
  });

  const reorderRequirementMutation = useMutation({
    mutationFn: async ({ id, newOrderIndex }: { id: string; newOrderIndex: number }) => {
      return await apiRequest('PATCH', `/api/evidence-requirements/${id}`, { orderIndex: newOrderIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to reorder requirements.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-navy" data-testid="text-page-title">
            Evidence Requirements Management
          </CardTitle>
          <p className="text-gray-600 mt-2" data-testid="text-page-description">
            Configure required evidence for each program stage
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeEvidenceStage} onValueChange={(value) => setActiveEvidenceStage(value as any)}>
        <div className="bg-gray-100 p-1 rounded-lg w-fit mb-6">
          <button
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeEvidenceStage === 'inspire'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveEvidenceStage('inspire')}
            data-testid="tab-inspire"
          >
            Inspire
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeEvidenceStage === 'investigate'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveEvidenceStage('investigate')}
            data-testid="tab-investigate"
          >
            Investigate
          </button>
          <button
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeEvidenceStage === 'act'
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-600 hover:text-navy'
            }`}
            onClick={() => setActiveEvidenceStage('act')}
            data-testid="tab-act"
          >
            Act
          </button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {activeEvidenceStage.charAt(0).toUpperCase() + activeEvidenceStage.slice(1)} Stage Requirements
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingRequirement(null);
                  setRequirementFormData({ title: '', description: '', resourceUrl: '', resourceId: '' });
                  setRequirementDialogOpen(true);
                }}
                className="bg-pcs_blue hover:bg-pcs_blue/90"
                data-testid={`button-add-${activeEvidenceStage}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Requirement
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {requirementsLoading ? (
              <div className="py-8">
                <LoadingSpinner message="Loading requirements..." />
              </div>
            ) : evidenceRequirements.filter(req => req.stage === activeEvidenceStage).length === 0 ? (
              <EmptyState
                title="No requirements yet"
                description="Add your first evidence requirement for this stage"
                icon={Plus}
              />
            ) : (
              <div className="space-y-3">
                {evidenceRequirements
                  .filter(req => req.stage === activeEvidenceStage)
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((requirement, index, arr) => (
                    <Card key={requirement.id} data-testid={`requirement-card-${requirement.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col gap-1 pt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const prevReq = arr[index - 1];
                                    if (prevReq) {
                                      reorderRequirementMutation.mutate({ id: requirement.id, newOrderIndex: prevReq.orderIndex });
                                      reorderRequirementMutation.mutate({ id: prevReq.id, newOrderIndex: requirement.orderIndex });
                                    }
                                  }}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0"
                                  data-testid={`button-move-up-${requirement.id}`}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const nextReq = arr[index + 1];
                                    if (nextReq) {
                                      reorderRequirementMutation.mutate({ id: requirement.id, newOrderIndex: nextReq.orderIndex });
                                      reorderRequirementMutation.mutate({ id: nextReq.id, newOrderIndex: requirement.orderIndex });
                                    }
                                  }}
                                  disabled={index === arr.length - 1}
                                  className="h-6 w-6 p-0"
                                  data-testid={`button-move-down-${requirement.id}`}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-gray-500">
                                    #{requirement.orderIndex + 1}
                                  </span>
                                  <h3 className="text-base font-semibold text-gray-900" data-testid={`text-title-${requirement.id}`}>
                                    {requirement.title}
                                  </h3>
                                </div>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap" data-testid={`text-description-${requirement.id}`}>
                                  {requirement.description}
                                </p>
                                {requirement.resourceId && (() => {
                                  const resource = allResources.find(r => r.id === requirement.resourceId);
                                  if (!resource) {
                                    return requirement.resourceUrl && (
                                      <a
                                        href={requirement.resourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                        data-testid={`link-resource-${requirement.id}`}
                                      >
                                        <BookOpen className="h-3 w-3" />
                                        Helpful Resource Link
                                      </a>
                                    );
                                  }
                                  
                                  const urlWithoutQuery = resource.fileUrl?.split('?')[0] || '';
                                  const urlExtension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                                  const isPdf = resource.fileType?.includes('pdf') || urlExtension === 'pdf';
                                  
                                  const getProxyUrl = (url: string | null) => {
                                    if (!url) return '';
                                    try {
                                      const urlObj = new URL(url);
                                      const pathname = decodeURIComponent(urlObj.pathname);
                                      const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
                                      if (privateUploadsMatch) return `/objects/uploads/${privateUploadsMatch[1]}`;
                                      const publicMatch = pathname.match(/\/public\/(.+)$/);
                                      if (publicMatch) return `/objects/public/${publicMatch[1]}`;
                                      if (url.startsWith('/objects/')) return url;
                                      return url;
                                    } catch {
                                      return url;
                                    }
                                  };
                                  
                                  const pdfProxyUrl = isPdf ? getProxyUrl(resource.fileUrl) : '';
                                  
                                  return (
                                    <div className="mt-3 space-y-2">
                                      <p className="text-xs font-semibold text-gray-700">Helpful Resource:</p>
                                      {isPdf && pdfProxyUrl && (
                                        <div className="relative aspect-video max-w-xs bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                          <PDFThumbnail
                                            url={pdfProxyUrl}
                                            className="w-full h-full"
                                          />
                                        </div>
                                      )}
                                      <a
                                        href={resource.fileUrl || ''}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                        data-testid={`link-resource-${requirement.id}`}
                                      >
                                        <BookOpen className="h-3 w-3" />
                                        {resource.title}
                                      </a>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRequirement(requirement);
                                setRequirementFormData({
                                  title: requirement.title,
                                  description: requirement.description,
                                  resourceUrl: requirement.resourceUrl || '',
                                  resourceId: requirement.resourceId || '',
                                });
                                setRequirementDialogOpen(true);
                              }}
                              data-testid={`button-edit-${requirement.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeletingRequirement(requirement);
                                setRequirementDeleteDialogOpen(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-${requirement.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Evidence Requirement Add/Edit Dialog */}
      <Dialog open={requirementDialogOpen} onOpenChange={setRequirementDialogOpen}>
        <DialogContent data-testid="dialog-edit-requirement">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                value={requirementFormData.title}
                onChange={(e) => setRequirementFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter requirement title"
                data-testid="input-title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <Textarea
                value={requirementFormData.description}
                onChange={(e) => setRequirementFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter requirement description"
                rows={4}
                data-testid="input-description"
              />
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Helpful Resource (Optional)</h3>
                <p className="text-xs text-gray-600 mt-1">
                  Select a resource from your library to attach to this requirement
                </p>
              </div>
              
              {resourcesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
                  <span className="text-gray-600">Loading resources...</span>
                </div>
              ) : allResources.length === 0 ? (
                <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
                  No resources available. Add resources from the Resources tab first.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                  {allResources.map((resource) => {
                    const isSelected = requirementFormData.resourceId === resource.id;
                    
                    const urlWithoutQuery = resource.fileUrl?.split('?')[0] || '';
                    const urlExtension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                    
                    const isImage = resource.fileType?.includes('image') || 
                                   ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(urlExtension);
                    const isPdf = resource.fileType?.includes('pdf') || urlExtension === 'pdf';
                    const isVideo = resource.fileType?.includes('video') || 
                                   ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(urlExtension);
                    
                    const getProxyUrl = (url: string | null) => {
                      if (!url) return '';
                      try {
                        const urlObj = new URL(url);
                        const pathname = decodeURIComponent(urlObj.pathname);
                        
                        const privateUploadsMatch = pathname.match(/\/.private\/uploads\/(.+)$/);
                        if (privateUploadsMatch) {
                          return `/objects/uploads/${privateUploadsMatch[1]}`;
                        }
                        
                        const publicMatch = pathname.match(/\/public\/(.+)$/);
                        if (publicMatch) {
                          return `/objects/public/${publicMatch[1]}`;
                        }
                        
                        if (url.startsWith('/objects/')) {
                          return url;
                        }
                        
                        return url;
                      } catch {
                        return url;
                      }
                    };
                    
                    const imageProxyUrl = isImage ? getProxyUrl(resource.fileUrl) : '';
                    const pdfProxyUrl = isPdf ? getProxyUrl(resource.fileUrl) : '';
                    
                    return (
                      <Card
                        key={resource.id}
                        className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                          isSelected ? 'border-2 border-pcs_blue bg-blue-50' : 'border hover:border-gray-400'
                        }`}
                        onClick={() => {
                          setRequirementFormData(prev => ({
                            ...prev,
                            resourceId: isSelected ? '' : resource.id,
                          }));
                        }}
                        data-testid={`button-resource-${resource.id}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className="relative w-full">
                              {isImage && imageProxyUrl ? (
                                <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                  <img 
                                    src={imageProxyUrl} 
                                    alt={resource.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                  <ImageIcon className="h-10 w-10 text-gray-400 hidden" />
                                </div>
                              ) : isPdf && pdfProxyUrl ? (
                                <div className="aspect-video w-full bg-gray-100 rounded-md overflow-hidden">
                                  <PDFThumbnail
                                    url={pdfProxyUrl}
                                    className="w-full h-full"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video w-full bg-gray-100 rounded-md flex items-center justify-center">
                                  {isVideo ? (
                                    <FileVideo className="h-10 w-10 text-gray-600" />
                                  ) : (
                                    <BookOpen className="h-10 w-10 text-gray-600" />
                                  )}
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-pcs_blue rounded-full p-1 shadow-md">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="w-full">
                              <p className="text-xs font-medium text-gray-900 line-clamp-2">
                                {resource.title}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {resource.stage}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRequirementDialogOpen(false);
                  setEditingRequirement(null);
                  setRequirementFormData({ title: '', description: '', resourceUrl: '', resourceId: '' });
                }}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-pcs_blue hover:bg-pcs_blue/90 flex-1"
                disabled={!requirementFormData.title.trim() || !requirementFormData.description.trim() || createRequirementMutation.isPending || updateRequirementMutation.isPending}
                onClick={() => {
                  if (editingRequirement) {
                    updateRequirementMutation.mutate({
                      id: editingRequirement.id,
                      data: {
                        title: requirementFormData.title,
                        description: requirementFormData.description,
                        resourceId: requirementFormData.resourceId || undefined,
                        resourceUrl: requirementFormData.resourceUrl || undefined,
                      },
                    });
                  } else {
                    const stageRequirements = evidenceRequirements.filter(req => req.stage === activeEvidenceStage);
                    const maxOrder = stageRequirements.length > 0
                      ? Math.max(...stageRequirements.map(r => r.orderIndex))
                      : -1;
                    
                    createRequirementMutation.mutate({
                      title: requirementFormData.title,
                      description: requirementFormData.description,
                      resourceId: requirementFormData.resourceId || undefined,
                      resourceUrl: requirementFormData.resourceUrl || undefined,
                      stage: activeEvidenceStage,
                      orderIndex: maxOrder + 1,
                    });
                  }
                }}
                data-testid="button-save"
              >
                {createRequirementMutation.isPending || updateRequirementMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Requirement Delete Confirmation Dialog */}
      <AlertDialog open={requirementDeleteDialogOpen} onOpenChange={setRequirementDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this requirement? This cannot be undone.
              {deletingRequirement && (
                <div className="mt-2 p-3 bg-gray-100 rounded-md">
                  <p className="font-semibold">{deletingRequirement.title}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRequirement && deleteRequirementMutation.mutate(deletingRequirement.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteRequirementMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRequirementMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
