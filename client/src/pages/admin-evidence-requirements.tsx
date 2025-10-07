import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { Edit, Trash2, Plus, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface EvidenceRequirement {
  id: string;
  stage: 'inspire' | 'investigate' | 'act';
  title: string;
  description: string;
  orderIndex: number;
  resourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const requirementFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().min(1, "Description is required"),
  resourceUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type RequirementFormValues = z.infer<typeof requirementFormSchema>;

export default function AdminEvidenceRequirements() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState<'inspire' | 'investigate' | 'act'>('inspire');
  const [editingRequirement, setEditingRequirement] = useState<EvidenceRequirement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingRequirement, setDeletingRequirement] = useState<EvidenceRequirement | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementFormSchema),
    defaultValues: {
      title: "",
      description: "",
      resourceUrl: "",
    },
  });

  // Fetch all requirements
  const { data: requirements = [], isLoading } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
  });

  // Filter requirements by stage
  const getRequirementsForStage = (stage: string) => {
    return requirements
      .filter(req => req.stage === stage)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: RequirementFormValues & { stage: string; orderIndex: number }) => {
      return await apiRequest('POST', '/api/evidence-requirements', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create evidence requirement.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RequirementFormValues> }) => {
      return await apiRequest('PATCH', `/api/evidence-requirements/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setIsDialogOpen(false);
      setEditingRequirement(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update evidence requirement.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/evidence-requirements/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Evidence requirement deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-requirements'] });
      setIsDeleteDialogOpen(false);
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

  // Reorder mutation
  const reorderMutation = useMutation({
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

  const handleOpenDialog = (requirement?: EvidenceRequirement) => {
    if (requirement) {
      setEditingRequirement(requirement);
      form.reset({
        title: requirement.title,
        description: requirement.description,
        resourceUrl: requirement.resourceUrl || "",
      });
    } else {
      setEditingRequirement(null);
      form.reset({
        title: "",
        description: "",
        resourceUrl: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: RequirementFormValues) => {
    if (editingRequirement) {
      updateMutation.mutate({
        id: editingRequirement.id,
        data: {
          ...values,
          resourceUrl: values.resourceUrl || undefined,
        },
      });
    } else {
      const stageRequirements = getRequirementsForStage(activeStage);
      const maxOrder = stageRequirements.length > 0
        ? Math.max(...stageRequirements.map(r => r.orderIndex))
        : -1;
      
      createMutation.mutate({
        ...values,
        stage: activeStage,
        orderIndex: maxOrder + 1,
        resourceUrl: values.resourceUrl || undefined,
      } as any);
    }
  };

  const handleDelete = (requirement: EvidenceRequirement) => {
    setDeletingRequirement(requirement);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingRequirement) {
      deleteMutation.mutate(deletingRequirement.id);
    }
  };

  const handleMoveUp = (requirement: EvidenceRequirement) => {
    const stageRequirements = getRequirementsForStage(requirement.stage);
    const currentIndex = stageRequirements.findIndex(r => r.id === requirement.id);
    
    if (currentIndex > 0) {
      const prevRequirement = stageRequirements[currentIndex - 1];
      reorderMutation.mutate({ id: requirement.id, newOrderIndex: prevRequirement.orderIndex });
      reorderMutation.mutate({ id: prevRequirement.id, newOrderIndex: requirement.orderIndex });
    }
  };

  const handleMoveDown = (requirement: EvidenceRequirement) => {
    const stageRequirements = getRequirementsForStage(requirement.stage);
    const currentIndex = stageRequirements.findIndex(r => r.id === requirement.id);
    
    if (currentIndex < stageRequirements.length - 1) {
      const nextRequirement = stageRequirements[currentIndex + 1];
      reorderMutation.mutate({ id: requirement.id, newOrderIndex: nextRequirement.orderIndex });
      reorderMutation.mutate({ id: nextRequirement.id, newOrderIndex: requirement.orderIndex });
    }
  };

  if (authLoading) {
    return <LoadingSpinner message="Loading..." fullScreen />;
  }

  if (!isAuthenticated || !user?.isAdmin) {
    window.location.href = "/admin";
    return null;
  }

  const renderRequirementsList = (stage: 'inspire' | 'investigate' | 'act') => {
    const stageRequirements = getRequirementsForStage(stage);

    if (isLoading) {
      return (
        <div className="py-8">
          <LoadingSpinner message="Loading requirements..." />
        </div>
      );
    }

    if (stageRequirements.length === 0) {
      return (
        <EmptyState
          title="No requirements yet"
          description="Add your first evidence requirement for this stage"
          icon={Plus}
        />
      );
    }

    return (
      <div className="space-y-3">
        {stageRequirements.map((requirement, index) => (
          <Card key={requirement.id} data-testid={`requirement-card-${requirement.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(requirement)}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                        data-testid={`button-move-up-${requirement.id}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(requirement)}
                        disabled={index === stageRequirements.length - 1}
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
                      {requirement.resourceUrl && (
                        <a
                          href={requirement.resourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                          data-testid={`link-resource-${requirement.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Helpful Resource Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(requirement)}
                    data-testid={`button-edit-${requirement.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(requirement)}
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
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-navy" data-testid="text-page-title">
              Evidence Requirements Management
            </CardTitle>
            <CardDescription data-testid="text-page-description">
              Configure required evidence for each program stage
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs value={activeStage} onValueChange={(value) => setActiveStage(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="inspire" data-testid="tab-inspire">
              Inspire
            </TabsTrigger>
            <TabsTrigger value="investigate" data-testid="tab-investigate">
              Investigate
            </TabsTrigger>
            <TabsTrigger value="act" data-testid="tab-act">
              Act
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspire" data-testid="content-inspire">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Inspire Stage Requirements</CardTitle>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-add-inspire"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderRequirementsList('inspire')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investigate" data-testid="content-investigate">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Investigate Stage Requirements</CardTitle>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-add-investigate"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderRequirementsList('investigate')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="act" data-testid="content-act">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Act Stage Requirements</CardTitle>
                  <Button
                    onClick={() => handleOpenDialog()}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-add-act"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {renderRequirementsList('act')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent data-testid="dialog-edit-requirement">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter requirement title"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter requirement description"
                          rows={4}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Helpful Resource Link</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://example.com/resource"
                          data-testid="input-resource-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingRequirement(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
