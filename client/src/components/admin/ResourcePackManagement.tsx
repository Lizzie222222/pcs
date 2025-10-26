import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Package, Plus, Search, Edit, Trash2, X, BookOpen, Download, GripVertical } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  fileUrl: string | null;
  downloadCount: number;
}

interface ResourcePackItem {
  id: string;
  packId: string;
  resourceId: string;
  orderIndex: number;
  resource: Resource;
}

interface ResourcePack {
  id: string;
  title: string;
  description: string | null;
  stage: 'inspire' | 'investigate' | 'act';
  theme: string | null;
  visibility: 'public' | 'registered';
  isActive: boolean;
  downloadCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resources?: ResourcePackItem[];
}

const THEME_OPTIONS = [
  { value: 'ocean_literacy', label: 'Ocean Literacy' },
  { value: 'climate_change', label: 'Climate Change' },
  { value: 'plastic_pollution', label: 'Plastic Pollution' },
  { value: 'science', label: 'Science' },
  { value: 'design_technology', label: 'Design & Technology' },
  { value: 'geography', label: 'Geography' },
  { value: 'cross_curricular', label: 'Cross-Curricular' },
  { value: 'enrichment', label: 'Enrichment' },
];

function SortableResourceItem({ resource, onRemove }: { resource: ResourcePackItem; onRemove: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
      data-testid={`sortable-resource-${resource.resourceId}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{resource.resource.title}</p>
        {resource.resource.description && (
          <p className="text-xs text-gray-500 truncate">{resource.resource.description}</p>
        )}
      </div>
      <Badge variant="outline" className="text-xs capitalize">
        {resource.resource.stage}
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRemove(resource.resourceId)}
        data-testid={`button-remove-resource-${resource.resourceId}`}
      >
        <X className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );
}

function PackEditorDialog({ pack, onClose, onSuccess }: {
  pack?: ResourcePack;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'resources'>('details');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    title: pack?.title || '',
    description: pack?.description || '',
    stage: pack?.stage || 'inspire',
    theme: pack?.theme || '',
    visibility: pack?.visibility || 'public',
    isActive: pack?.isActive ?? true,
  });

  const [packResources, setPackResources] = useState<ResourcePackItem[]>(pack?.resources || []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: availableResources = [] } = useQuery<Resource[]>({
    queryKey: ['/api/resources'],
    enabled: activeTab === 'resources',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPackResources((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        return reordered.map((item, index) => ({
          ...item,
          orderIndex: index,
        }));
      });
    }
  };

  const addResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      if (!pack?.id) return null;
      
      const orderIndex = packResources.length;
      return await apiRequest('POST', `/api/resource-packs/${pack.id}/resources`, {
        resourceId,
        orderIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-packs', pack?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/resource-packs'] });
    },
  });

  const removeResourceMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      if (!pack?.id) return null;
      return await apiRequest('DELETE', `/api/resource-packs/${pack.id}/resources/${resourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-packs', pack?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/resource-packs'] });
    },
  });

  const handleAddResource = async (resourceId: string) => {
    const resourceExists = packResources.some(item => item.resourceId === resourceId);
    
    if (resourceExists) {
      toast({
        title: "Resource Already Added",
        description: "This resource is already in the pack.",
        variant: "destructive",
      });
      return;
    }

    if (pack?.id) {
      try {
        await addResourceMutation.mutateAsync(resourceId);
        
        const resource = availableResources.find(r => r.id === resourceId);
        if (resource) {
          setPackResources(prev => [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              packId: pack.id,
              resourceId: resource.id,
              orderIndex: prev.length,
              resource,
            },
          ]);
        }
        
        toast({
          title: "Resource Added",
          description: "Resource has been added to the pack.",
        });
      } catch (error: any) {
        toast({
          title: "Failed to Add Resource",
          description: error.message || "Could not add resource to pack.",
          variant: "destructive",
        });
      }
    } else {
      const resource = availableResources.find(r => r.id === resourceId);
      if (resource) {
        setPackResources(prev => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            packId: '',
            resourceId: resource.id,
            orderIndex: prev.length,
            resource,
          },
        ]);
      }
    }
  };

  const handleRemoveResource = async (resourceId: string) => {
    if (pack?.id) {
      try {
        await removeResourceMutation.mutateAsync(resourceId);
        setPackResources(prev => prev.filter(item => item.resourceId !== resourceId));
        
        toast({
          title: "Resource Removed",
          description: "Resource has been removed from the pack.",
        });
      } catch (error: any) {
        toast({
          title: "Failed to Remove Resource",
          description: error.message || "Could not remove resource from pack.",
          variant: "destructive",
        });
      }
    } else {
      setPackResources(prev => prev.filter(item => item.resourceId !== resourceId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const endpoint = pack ? `/api/resource-packs/${pack.id}` : '/api/resource-packs';
      const method = pack ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        theme: formData.theme || null,
        createdBy: user?.id,
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('Failed to save resource pack');
      }

      const savedPack = await response.json();

      if (!pack && packResources.length > 0) {
        for (let i = 0; i < packResources.length; i++) {
          const item = packResources[i];
          await fetch(`/api/resource-packs/${savedPack.id}/resources`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              resourceId: item.resourceId,
              orderIndex: i,
            }),
          });
        }
      }

      if (pack && packResources.length > 0) {
        for (let i = 0; i < packResources.length; i++) {
          const item = packResources[i];
          await fetch(`/api/resource-packs/${pack.id}/resources`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              resourceId: item.resourceId,
              orderIndex: i,
            }),
          });
        }
      }

      toast({
        title: pack ? "Pack Updated" : "Pack Created",
        description: `The resource pack has been successfully ${pack ? 'updated' : 'created'}.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save resource pack. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredResources = availableResources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase());
    const notInPack = !packResources.some(item => item.resourceId === resource.id);
    return matchesSearch && notInPack;
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle data-testid="text-pack-editor-title">
            {pack ? 'Edit Resource Pack' : 'Create New Resource Pack'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b mb-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'border-b-2 border-pcs_blue text-pcs_blue'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-testid="button-tab-details"
          >
            Pack Details
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'border-b-2 border-pcs_blue text-pcs_blue'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            data-testid="button-tab-resources"
          >
            Resources ({packResources.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pack Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter pack title"
                  required
                  data-testid="input-pack-title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter pack description"
                  rows={3}
                  data-testid="textarea-pack-description"
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
                    <SelectTrigger data-testid="select-pack-stage">
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
                    Theme
                  </label>
                  <Select 
                    value={formData.theme} 
                    onValueChange={(value) => handleInputChange('theme', value)}
                  >
                    <SelectTrigger data-testid="select-pack-theme">
                      <SelectValue placeholder="Select theme (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No theme</SelectItem>
                      {THEME_OPTIONS.map(theme => (
                        <SelectItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </SelectItem>
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
                  <SelectTrigger data-testid="select-pack-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (visible to everyone)</SelectItem>
                    <SelectItem value="registered">Registered Only (requires login)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="rounded border-gray-300"
                  data-testid="checkbox-pack-active"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (visible to users)
                </label>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resources in Pack ({packResources.length})
                </label>
                
                {packResources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">No resources added yet</p>
                    <p className="text-xs mt-1">Add resources from the list below</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={packResources.map(r => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2" data-testid="container-pack-resources">
                        {packResources.map((item) => (
                          <SortableResourceItem
                            key={item.id}
                            resource={item}
                            onRemove={handleRemoveResource}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Resources
                </label>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search resources..."
                      className="pl-10"
                      data-testid="input-search-resources"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                  {filteredResources.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchQuery ? 'No resources found matching your search' : 'All resources have been added'}
                    </p>
                  ) : (
                    filteredResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-3 bg-white rounded border hover:border-pcs_blue transition-colors"
                        data-testid={`available-resource-${resource.id}`}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {resource.title}
                          </p>
                          {resource.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize mr-2">
                          {resource.stage}
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddResource(resource.id)}
                          data-testid={`button-add-resource-${resource.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-pack"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title}
              data-testid="button-save-pack"
            >
              {isSubmitting ? 'Saving...' : pack ? 'Update Pack' : 'Create Pack'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ResourcePackManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [editingPack, setEditingPack] = useState<ResourcePack | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [deletingPack, setDeletingPack] = useState<ResourcePack | null>(null);

  const { data: packs = [], isLoading } = useQuery<ResourcePack[]>({
    queryKey: ['/api/resource-packs'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (packId: string) => {
      await apiRequest('DELETE', `/api/resource-packs/${packId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resource-packs'] });
      toast({
        title: "Pack Deleted",
        description: "The resource pack has been successfully deleted.",
      });
      setDeletingPack(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete resource pack. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = async (pack: ResourcePack) => {
    try {
      const response = await fetch(`/api/resource-packs/${pack.id}`);
      if (!response.ok) throw new Error('Failed to fetch pack details');
      
      const fullPack = await response.json();
      setEditingPack(fullPack);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load pack details",
        variant: "destructive",
      });
    }
  };

  const handleCloseEditor = () => {
    setEditingPack(undefined);
    setIsCreating(false);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/resource-packs'] });
    handleCloseEditor();
  };

  const filteredPacks = packs.filter(pack => {
    const matchesSearch = pack.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'all' || pack.stage === stageFilter;
    const matchesTheme = themeFilter === 'all' || pack.theme === themeFilter;
    const matchesVisibility = visibilityFilter === 'all' || pack.visibility === visibilityFilter;
    
    return matchesSearch && matchesStage && matchesTheme && matchesVisibility;
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading resource packs..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">Resource Pack Management</h2>
          <p className="text-gray-600 mt-1">Create and manage curated resource packs</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          data-testid="button-create-pack"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Pack
        </Button>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-sm text-gray-700">
          <strong className="text-navy">How to create a resource pack:</strong>
          <ol className="mt-2 ml-4 space-y-1 list-decimal">
            <li>Click "Create Pack" to start a new pack</li>
            <li>Fill in pack details (title, description, stage, theme)</li>
            <li>Switch to the "Resources" tab in the dialog</li>
            <li>Search and add individual resources to your pack</li>
            <li>Drag and drop to reorder resources</li>
            <li>Save when finished</li>
          </ol>
          <p className="mt-2 text-xs text-gray-600">
            💡 Tip: Resource packs are collections of related materials that schools can download together. Perfect for themed lessons or multi-part activities.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Resource Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search packs..."
                  className="pl-10"
                  data-testid="input-search-packs"
                />
              </div>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger data-testid="select-filter-stage">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="inspire">Inspire</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>

              <Select value={themeFilter} onValueChange={setThemeFilter}>
                <SelectTrigger data-testid="select-filter-theme">
                  <SelectValue placeholder="All Themes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Themes</SelectItem>
                  {THEME_OPTIONS.map(theme => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger data-testid="select-filter-visibility">
                  <SelectValue placeholder="All Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="registered">Registered Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredPacks.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No Resource Packs Found"
                description={searchQuery || stageFilter !== 'all' || themeFilter !== 'all' || visibilityFilter !== 'all'
                  ? "No packs match your current filters. Try adjusting your search criteria."
                  : "Create your first resource pack to get started."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Title</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Stage</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Theme</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Visibility</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Resources</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Downloads</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPacks.map((pack) => (
                      <tr 
                        key={pack.id} 
                        className="border-b hover:bg-gray-50"
                        data-testid={`pack-row-${pack.id}`}
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`text-pack-title-${pack.id}`}>
                              {pack.title}
                            </p>
                            {pack.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {pack.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="capitalize" data-testid={`text-pack-stage-${pack.id}`}>
                            {pack.stage}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {pack.theme ? (
                            <Badge variant="secondary" className="text-xs" data-testid={`text-pack-theme-${pack.id}`}>
                              {THEME_OPTIONS.find(t => t.value === pack.theme)?.label || pack.theme}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={pack.visibility === 'public' ? 'default' : 'outline'}
                            className="text-xs"
                            data-testid={`text-pack-visibility-${pack.id}`}
                          >
                            {pack.visibility === 'public' ? 'Public' : 'Registered'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600" data-testid={`text-pack-resource-count-${pack.id}`}>
                            <BookOpen className="h-4 w-4" />
                            {pack.resources?.length || 0}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600" data-testid={`text-pack-download-count-${pack.id}`}>
                            <Download className="h-4 w-4" />
                            {pack.downloadCount}
                          </div>
                        </td>
                        <td className="p-3">
                          {pack.isActive ? (
                            <Badge className="bg-green-500 text-white text-xs" data-testid={`text-pack-status-${pack.id}`}>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs" data-testid={`text-pack-status-${pack.id}`}>
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(pack)}
                              data-testid={`button-edit-pack-${pack.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingPack(pack)}
                              data-testid={`button-delete-pack-${pack.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {(isCreating || editingPack) && (
        <PackEditorDialog
          pack={editingPack}
          onClose={handleCloseEditor}
          onSuccess={handleSuccess}
        />
      )}

      <AlertDialog open={!!deletingPack} onOpenChange={() => setDeletingPack(null)}>
        <AlertDialogContent data-testid="dialog-delete-pack">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource Pack?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPack?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPack && deleteMutation.mutate(deletingPack.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete Pack
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
