import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useCollaboration } from "@/hooks/useCollaboration";
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
  Lock,
  Users,
} from "lucide-react";
import { CaseStudyEditor } from "@/components/admin/CaseStudyEditor";
import DocumentLockWarning from "@/components/admin/DocumentLockWarning";
import type { CaseStudy } from "@shared/schema";

interface CaseStudyManagementProps {
  user: any;
  schools: any[];
  countryOptions: string[];
  isActive: boolean;
}

export default function CaseStudyManagement({ user, schools, countryOptions, isActive }: CaseStudyManagementProps) {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { requestDocumentLock, releaseDocumentLock, getDocumentLock, getViewersForDocument } = useCollaboration();
  
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
  const [documentLocked, setDocumentLocked] = useState(false);

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
        title: t('caseStudies.toasts.created.title'),
        description: t('caseStudies.toasts.created.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setEditorOpen(false);
      setEditingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: t('caseStudies.toasts.createFailed.title'),
        description: error.message || t('caseStudies.toasts.createFailed.description'),
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
        title: t('caseStudies.toasts.updated.title'),
        description: t('caseStudies.toasts.updated.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setEditorOpen(false);
      setEditingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: t('caseStudies.toasts.updateFailed.title'),
        description: error.message || t('caseStudies.toasts.updateFailed.description'),
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
        title: t('caseStudies.toasts.deleted.title'),
        description: t('caseStudies.toasts.deleted.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setDeletingCaseStudy(null);
    },
    onError: (error: any) => {
      toast({
        title: t('caseStudies.toasts.deleteFailed.title'),
        description: error.message || t('caseStudies.toasts.deleteFailed.description'),
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
        title: t('caseStudies.toasts.featuredUpdated.title'),
        description: t('caseStudies.toasts.featuredUpdated.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/case-studies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
    },
    onError: (error) => {
      toast({
        title: t('caseStudies.toasts.featuredUpdateFailed.title'),
        description: t('caseStudies.toasts.featuredUpdateFailed.description'),
        variant: "destructive",
      });
    },
  });

  // Request document lock when opening editor for existing case study
  useEffect(() => {
    if (editorOpen && editingCaseStudy?.id) {
      requestDocumentLock(editingCaseStudy.id, 'case_study').then((response) => {
        if (!response.success) {
          if (response.locked) {
            setDocumentLocked(true);
            toast({
              title: t('caseStudies.toasts.locked.title'),
              description: t('caseStudies.toasts.locked.description', { lockedBy: response.lockedBy || 'another user' }),
              variant: "destructive",
            });
          }
        } else {
          setDocumentLocked(false);
        }
      });
    }
  }, [editorOpen, editingCaseStudy?.id, requestDocumentLock, toast]);

  // Release lock when closing editor or component unmounts
  useEffect(() => {
    return () => {
      if (editingCaseStudy?.id) {
        releaseDocumentLock(editingCaseStudy.id, 'case_study');
      }
    };
  }, [editingCaseStudy?.id, releaseDocumentLock]);

  // Handle editor close
  const handleEditorClose = () => {
    if (editingCaseStudy?.id) {
      releaseDocumentLock(editingCaseStudy.id, 'case_study');
    }
    setEditorOpen(false);
    setEditingCaseStudy(null);
    setDocumentLocked(false);
  };

  // Handle take over lock
  const handleTakeOver = async () => {
    if (editingCaseStudy?.id) {
      // Release the current lock (if any) and request a new one
      await releaseDocumentLock(editingCaseStudy.id, 'case_study');
      const response = await requestDocumentLock(editingCaseStudy.id, 'case_study');
      if (response.success) {
        setDocumentLocked(false);
        toast({
          title: t('caseStudies.toasts.lockAcquired.title'),
          description: t('caseStudies.toasts.lockAcquired.description'),
        });
      }
    }
  };

  const currentLock = editingCaseStudy?.id ? getDocumentLock(editingCaseStudy.id, 'case_study') : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Star className="h-5 w-5" />
            {t('caseStudies.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <Input
              placeholder={t('caseStudies.filters.placeholders.search')}
              value={caseStudyFilters.search}
              onChange={(e) => setCaseStudyFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full sm:max-w-sm min-h-11"
              data-testid="input-case-study-search"
            />
            <Select
              value={caseStudyFilters.stage}
              onValueChange={(value) => setCaseStudyFilters(prev => ({ ...prev, stage: value }))}
            >
              <SelectTrigger className="w-full sm:w-[180px] min-h-11" data-testid="select-case-study-stage">
                <SelectValue placeholder={t('caseStudies.filters.labels.stage')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('caseStudies.filters.options.allStages')}</SelectItem>
                <SelectItem value="inspire">{t('caseStudies.filters.stages.inspire')}</SelectItem>
                <SelectItem value="investigate">{t('caseStudies.filters.stages.investigate')}</SelectItem>
                <SelectItem value="act">{t('caseStudies.filters.stages.act')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={caseStudyFilters.featured}
              onValueChange={(value) => setCaseStudyFilters(prev => ({ ...prev, featured: value }))}
            >
              <SelectTrigger className="w-full sm:w-[180px] min-h-11" data-testid="select-case-study-featured">
                <SelectValue placeholder={t('caseStudies.filters.labels.featuredStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('caseStudies.filters.options.all')}</SelectItem>
                <SelectItem value="true">{t('caseStudies.filters.options.featured')}</SelectItem>
                <SelectItem value="false">{t('caseStudies.filters.options.notFeatured')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setEditingCaseStudy(null);
                setEditorOpen(true);
              }}
              className="bg-pcs_blue hover:bg-pcs_blue/90 min-h-11 px-3 sm:px-4"
              data-testid="button-create-case-study"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('caseStudies.buttons.createCaseStudy')}</span>
              <span className="sm:hidden">{t('caseStudies.buttons.createShort')}</span>
            </Button>
          </div>

          {/* Case Studies List */}
          <div className="space-y-4">
            {caseStudies?.map((caseStudy: any) => {
              const viewers = getViewersForDocument(caseStudy.id, 'case_study');
              const lock = getDocumentLock(caseStudy.id, 'case_study');
              
              return (
                <Card key={caseStudy.id} className="border-l-4 border-l-pcs_blue relative">
                  <CardContent className="p-4">
                    {/* Presence Badges - Top Right */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {lock && (
                        <Badge 
                          variant="outline" 
                          className="bg-red-50 border-red-300 text-red-700 text-xs"
                          data-testid={`badge-lock-${caseStudy.id}`}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Editing: {lock.lockedByName}
                        </Badge>
                      )}
                      {viewers.length > 0 && !lock && (
                        <Badge 
                          variant="outline" 
                          className="bg-blue-50 border-blue-300 text-blue-700 text-xs"
                          data-testid={`badge-viewers-${caseStudy.id}`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Viewing: {viewers.map(v => v.name).join(', ')}
                        </Badge>
                      )}
                    </div>

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
                            {t('caseStudies.badges.featured')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2" data-testid={`case-study-description-${caseStudy.id}`}>
                        {caseStudy.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500">
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
                            {t('caseStudies.buttons.preview')}
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
                          {t('caseStudies.buttons.edit')}
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
                          {caseStudy.featured ? t('caseStudies.buttons.unfeature') : t('caseStudies.buttons.feature')}
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
              );
            })}

            {caseStudies?.length === 0 && (
              <div className="text-center py-8 text-gray-500" data-testid="no-case-studies">
                {t('caseStudies.emptyStates.noCaseStudies')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Case Study Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={handleEditorClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0" data-testid="dialog-case-study-editor">
          <div className="p-6 space-y-4">
            {currentLock && documentLocked && (
              <DocumentLockWarning
                lock={currentLock}
                documentType="case_study"
                onTakeOver={handleTakeOver}
              />
            )}
            <CaseStudyEditor
              caseStudy={editingCaseStudy || undefined}
              onSave={(data) => {
                if (documentLocked) {
                  toast({
                    title: t('caseStudies.toasts.cannotSave.title'),
                    description: t('caseStudies.toasts.cannotSave.description'),
                    variant: "destructive",
                  });
                  return;
                }
                if (editingCaseStudy) {
                  updateCaseStudyMutation.mutate({ ...data, id: editingCaseStudy.id });
                } else {
                  createCaseStudyMutation.mutate({ ...data, createdBy: user?.id || '' });
                }
              }}
              onCancel={handleEditorClose}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Case Study Confirmation */}
      <AlertDialog open={!!deletingCaseStudy} onOpenChange={() => setDeletingCaseStudy(null)}>
        <AlertDialogContent data-testid="dialog-delete-case-study">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('caseStudies.dialogs.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('caseStudies.dialogs.delete.description', { title: deletingCaseStudy?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('caseStudies.buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCaseStudy && deleteCaseStudyMutation.mutate(deletingCaseStudy.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {t('caseStudies.buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
