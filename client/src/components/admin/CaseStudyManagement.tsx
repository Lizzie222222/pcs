import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  School, 
  Star,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Eye,
} from "lucide-react";
import { CaseStudyEditor } from "@/components/admin/CaseStudyEditor";
import type { CaseStudy } from "@shared/schema";

interface CaseStudyManagementProps {
  user: any;
  schools: any[];
  countryOptions: string[];
  isActive: boolean;
}

export default function CaseStudyManagement({ user, schools, countryOptions, isActive }: CaseStudyManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [caseStudyFilters, setCaseStudyFilters] = useState({
    search: '',
    country: '',
    stage: '',
    featured: '',
    language: '',
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCaseStudy, setEditingCaseStudy] = useState<CaseStudy | null>(null);
  const [deletingCaseStudy, setDeletingCaseStudy] = useState<CaseStudy | null>(null);

  // Clean filters for API (convert "all" values to empty strings)
  const cleanFilters = (filters: typeof caseStudyFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
  };

  // Case studies query
  const { data: caseStudies = [], error: caseStudiesError } = useQuery<any[]>({
    queryKey: ['/api/admin/case-studies', {
      search: caseStudyFilters.search || '',
      country: caseStudyFilters.country || '',
      stage: caseStudyFilters.stage || '',
      language: caseStudyFilters.language || '',
      featured: caseStudyFilters.featured || ''
    }],
    queryFn: async () => {
      const filters = cleanFilters(caseStudyFilters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const url = `/api/admin/case-studies${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: Boolean(user?.role === 'admin' || user?.isAdmin) && isActive,
    retry: false,
  });

  // Case study mutations
  const createCaseStudyMutation = useMutation({
    mutationFn: async (caseStudy: any) => {
      // Transform to insert schema - remove id and auto-generated fields
      const { id, createdAt, updatedAt, schoolName, schoolCountry, ...insertData } = caseStudy;
      return await apiRequest('POST', '/api/admin/case-studies', insertData);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Created",
        description: "Case study has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setEditorOpen(false);
      setEditingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCaseStudyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Remove id and auto-generated/computed fields before sending update
      const { id, createdAt, updatedAt, schoolName, schoolCountry, ...updates } = data;
      return await apiRequest('PUT', `/api/admin/case-studies/${id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Updated",
        description: "Case study has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setEditorOpen(false);
      setEditingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCaseStudyMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/case-studies/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Case Study Deleted",
        description: "Case study has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setDeletingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCaseStudyFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      await apiRequest('PUT', `/api/admin/case-studies/${id}/featured`, { featured });
    },
    onSuccess: () => {
      toast({
        title: "Case Study Updated",
        description: "Case study featured status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update case study. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Case Studies Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search case studies..."
              value={caseStudyFilters.search}
              onChange={(e) => setCaseStudyFilters(prev => ({ ...prev, search: e.target.value }))}
              className="max-w-sm"
              data-testid="input-case-study-search"
            />
            <Select
              value={caseStudyFilters.stage}
              onValueChange={(value) => setCaseStudyFilters(prev => ({ ...prev, stage: value }))}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-case-study-stage">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="inspire">Inspire</SelectItem>
                <SelectItem value="investigate">Investigate</SelectItem>
                <SelectItem value="act">Act</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={caseStudyFilters.featured}
              onValueChange={(value) => setCaseStudyFilters(prev => ({ ...prev, featured: value }))}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-case-study-featured">
                <SelectValue placeholder="Featured Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Featured</SelectItem>
                <SelectItem value="false">Not Featured</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setEditingCaseStudy(null);
                setEditorOpen(true);
              }}
              className="bg-pcs_blue hover:bg-pcs_blue/90"
              data-testid="button-create-case-study"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Case Study
            </Button>
          </div>

          {/* Case Studies List */}
          <div className="space-y-4">
            {caseStudies?.map((caseStudy: any) => (
              <Card key={caseStudy.id} className="border-l-4 border-l-pcs_blue">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-navy" data-testid={`case-study-title-${caseStudy.id}`}>
                          {caseStudy.title}
                        </h3>
                        <Badge 
                          className={caseStudy.stage === 'inspire' ? 'bg-pcs_blue text-white' :
                                   caseStudy.stage === 'investigate' ? 'bg-teal text-white' :
                                   'bg-coral text-white'}
                          data-testid={`case-study-stage-${caseStudy.id}`}
                        >
                          {caseStudy.stage.charAt(0).toUpperCase() + caseStudy.stage.slice(1)}
                        </Badge>
                        {caseStudy.featured && (
                          <Badge className="bg-yellow-500 text-white" data-testid={`case-study-featured-${caseStudy.id}`}>
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2" data-testid={`case-study-description-${caseStudy.id}`}>
                        {caseStudy.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span data-testid={`case-study-school-${caseStudy.id}`}>
                          <School className="h-4 w-4 inline mr-1" />
                          {caseStudy.schoolName}
                        </span>
                        <span data-testid={`case-study-country-${caseStudy.id}`}>
                          <MapPin className="h-4 w-4 inline mr-1" />
                          {caseStudy.schoolCountry}
                        </span>
                        <span data-testid={`case-study-date-${caseStudy.id}`}>
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {new Date(caseStudy.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          data-testid={`button-preview-${caseStudy.id}`}
                        >
                          <a href={`/case-study/${caseStudy.id}`} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCaseStudy(caseStudy as CaseStudy);
                            setEditorOpen(true);
                          }}
                          data-testid={`button-edit-${caseStudy.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={caseStudy.featured ? "default" : "outline"}
                          onClick={() => updateCaseStudyFeaturedMutation.mutate({
                            id: caseStudy.id,
                            featured: !caseStudy.featured
                          })}
                          disabled={updateCaseStudyFeaturedMutation.isPending}
                          data-testid={`button-toggle-featured-${caseStudy.id}`}
                          className="flex-1"
                        >
                          <Star className="h-4 w-4 mr-1" />
                          {caseStudy.featured ? 'Unfeature' : 'Feature'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeletingCaseStudy(caseStudy as CaseStudy)}
                          data-testid={`button-delete-${caseStudy.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {caseStudies?.length === 0 && (
              <div className="text-center py-8 text-gray-500" data-testid="no-case-studies">
                No case studies found. Create one from approved evidence submissions.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Case Study Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0" data-testid="dialog-case-study-editor">
          <CaseStudyEditor
            caseStudy={editingCaseStudy || undefined}
            onSave={(data) => {
              if (editingCaseStudy) {
                updateCaseStudyMutation.mutate({ ...data, id: editingCaseStudy.id });
              } else {
                createCaseStudyMutation.mutate({ ...data, createdBy: user?.id || '' });
              }
            }}
            onCancel={() => {
              setEditorOpen(false);
              setEditingCaseStudy(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Case Study Confirmation */}
      <AlertDialog open={!!deletingCaseStudy} onOpenChange={() => setDeletingCaseStudy(null)}>
        <AlertDialogContent data-testid="dialog-delete-case-study">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case Study</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCaseStudy?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCaseStudy && deleteCaseStudyMutation.mutate(deletingCaseStudy.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
