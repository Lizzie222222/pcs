import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
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
  CheckCircle,
  XCircle,
  Edit,
  Upload,
  Clock,
  Target,
  TrendingDown,
  Droplets,
  Fish,
  Heart,
  Leaf,
  Factory,
  Trash,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  ArrowDown,
  ArrowUp,
  Download,
} from "lucide-react";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { RoundProgressBadges } from "@/components/RoundProgressBadges";
import type { SchoolData } from "@/components/admin/shared/types";
import type { ReductionPromise } from "@shared/schema";
import { calculateAggregateMetrics } from "@shared/plasticMetrics";

interface SchoolDetailsDialogProps {
  viewingSchool: SchoolData | null;
  setViewingSchool: (school: SchoolData | null) => void;
  approvePhotoConsentMutation: any;
  rejectPhotoConsentMutation: any;
  photoConsentRejectDialogOpen: boolean;
  setPhotoConsentRejectDialogOpen: (open: boolean) => void;
  photoConsentRejectNotes: string;
  setPhotoConsentRejectNotes: (notes: string) => void;
  evidenceFormSchoolId: string | null;
  setEvidenceFormSchoolId: (id: string | null) => void;
}

export default function SchoolDetailsDialog({
  viewingSchool,
  setViewingSchool,
  approvePhotoConsentMutation,
  rejectPhotoConsentMutation,
  photoConsentRejectDialogOpen,
  setPhotoConsentRejectDialogOpen,
  photoConsentRejectNotes,
  setPhotoConsentRejectNotes,
  evidenceFormSchoolId,
  setEvidenceFormSchoolId,
}: SchoolDetailsDialogProps) {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSchoolLanguage, setEditingSchoolLanguage] = useState(false);
  const [schoolLanguageValue, setSchoolLanguageValue] = useState<string>('');
  const [editingProgression, setEditingProgression] = useState(false);
  const [progressionFormData, setProgressionFormData] = useState({
    currentStage: 'inspire' as 'inspire' | 'investigate' | 'act',
    currentRound: 1,
    inspireCompleted: false,
    investigateCompleted: false,
    actCompleted: false,
  });
  const [showAdminEvidenceForm, setShowAdminEvidenceForm] = useState(false);

  // Reduction promises query for selected school (filtered by current round)
  const schoolPromisesQuery = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/school', viewingSchool?.id, viewingSchool?.currentRound],
    queryFn: async () => {
      const round = viewingSchool?.currentRound || 1;
      const response = await fetch(`/api/reduction-promises/school/${viewingSchool?.id}?round=${round}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reduction promises');
      }
      return response.json();
    },
    enabled: !!viewingSchool?.id,
    retry: false,
  });

  // Calculate promise metrics
  const promiseMetrics = schoolPromisesQuery.data 
    ? calculateAggregateMetrics(schoolPromisesQuery.data)
    : null;
  
  // Calculate additional metrics needed
  const totalPromises = schoolPromisesQuery.data?.length || 0;
  const totalAnnualReduction = schoolPromisesQuery.data?.reduce((sum, promise) => {
    const frequencyMultipliers: Record<string, number> = {
      week: 52,
      month: 12,
      year: 1,
    };
    const multiplier = frequencyMultipliers[promise.timeframeUnit] || 1;
    return sum + (promise.reductionAmount * multiplier);
  }, 0) || 0;
  const totalAnnualWeightKg = promiseMetrics ? (promiseMetrics.totalGramsReduced / 1000) : 0;

  // Photo consent query - fetch when viewing a school
  const { data: photoConsentStatus, refetch: refetchPhotoConsent } = useQuery<{
    status: string | null;
    documentUrl: string | null;
    uploadedAt: Date | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    reviewedBy: string | null;
    reviewNotes: string | null;
  } | null>({
    queryKey: ['/api/schools', viewingSchool?.id, 'photo-consent'],
    enabled: !!viewingSchool?.id,
  });

  // Certificates query for Round History
  const certificatesQuery = useQuery<any[]>({
    queryKey: ['/api/schools', viewingSchool?.id, 'certificates'],
    queryFn: async () => {
      const response = await fetch(`/api/schools/${viewingSchool?.id}/certificates`);
      if (!response.ok) throw new Error('Failed to fetch certificates');
      return response.json();
    },
    enabled: !!viewingSchool?.id && (viewingSchool?.roundsCompleted || 0) >= 1,
  });

  // Audits query for Round History - fetch all audits for completed rounds
  const completedRounds = Array.from({ length: viewingSchool?.roundsCompleted || 0 }, (_, i) => i + 1);
  const auditsQueries = completedRounds.map(round => 
    useQuery({
      queryKey: ['/api/audits/school', viewingSchool?.id, round],
      queryFn: async () => {
        const response = await fetch(`/api/audits/school/${viewingSchool?.id}?round=${round}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
      },
      enabled: !!viewingSchool?.id && (viewingSchool?.roundsCompleted || 0) >= 1,
    })
  );

  // Update school language mutation
  const updateSchoolLanguageMutation = useMutation({
    mutationFn: async ({ schoolId, primaryLanguage }: { schoolId: string; primaryLanguage: string }) => {
      return await apiRequest('PUT', `/api/admin/schools/${schoolId}`, { primaryLanguage });
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/admin/schools'] });
      
      // Snapshot previous values
      const previousSchools = queryClient.getQueryData(['/api/admin/schools']);
      const previousViewingSchool = viewingSchool;
      
      // Optimistically update the viewing school
      if (viewingSchool) {
        setViewingSchool({
          ...viewingSchool,
          primaryLanguage: variables.primaryLanguage
        });
      }
      
      // Optimistically update schools query cache
      queryClient.setQueryData(['/api/admin/schools'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map(school => 
            school.id === variables.schoolId 
              ? { ...school, primaryLanguage: variables.primaryLanguage }
              : school
          );
        }
        return old;
      });
      
      return { previousSchools, previousViewingSchool };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSchools) {
        queryClient.setQueryData(['/api/admin/schools'], context.previousSchools);
      }
      if (context?.previousViewingSchool) {
        setViewingSchool(context.previousViewingSchool);
      }
      toast({
        title: t('schools.toasts.updateFailed.title'),
        description: t('schools.toasts.updateFailed.description'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('schools.toasts.languageUpdated.title'),
        description: t('schools.toasts.languageUpdated.description'),
      });
      setEditingSchoolLanguage(false);
    },
    onSettled: () => {
      // Surgical invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
    },
  });

  // Update school progression mutation
  const updateSchoolProgressionMutation = useMutation({
    mutationFn: async ({ schoolId, updates }: { 
      schoolId: string; 
      updates: {
        currentStage?: 'inspire' | 'investigate' | 'act';
        currentRound?: number;
        inspireCompleted?: boolean;
        investigateCompleted?: boolean;
        actCompleted?: boolean;
      }
    }) => {
      return await apiRequest('PUT', `/api/admin/schools/${schoolId}/progression`, updates);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/schools'] });
      
      const previousSchools = queryClient.getQueryData(['/api/admin/schools']);
      const previousViewingSchool = viewingSchool;
      
      // Optimistically update viewing school
      if (viewingSchool) {
        setViewingSchool({
          ...viewingSchool,
          ...variables.updates
        });
      }
      
      // Optimistically update schools query cache
      queryClient.setQueryData(['/api/admin/schools'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map(school => 
            school.id === variables.schoolId 
              ? { ...school, ...variables.updates }
              : school
          );
        }
        return old;
      });
      
      return { previousSchools, previousViewingSchool };
    },
    onError: (err, variables, context) => {
      if (context?.previousSchools) {
        queryClient.setQueryData(['/api/admin/schools'], context.previousSchools);
      }
      if (context?.previousViewingSchool) {
        setViewingSchool(context.previousViewingSchool);
      }
      toast({
        title: t('schools.toasts.updateFailed.title'),
        description: t('schools.toasts.progressionUpdateFailed.description'),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: t('schools.toasts.progressionUpdated.title'),
        description: t('schools.toasts.progressionUpdated.description'),
      });
      setEditingProgression(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/school-progress'] });
    },
  });

  if (!viewingSchool) return null;

  return (
    <>
      <Dialog open={!!viewingSchool} onOpenChange={() => {
        setViewingSchool(null);
        setEditingSchoolLanguage(false);
        setSchoolLanguageValue('');
      }}>
        <DialogContent className="max-w-2xl" data-testid={`dialog-school-detail-${viewingSchool.id}`}>
          <DialogHeader>
            <DialogTitle className="text-2xl" data-testid={`text-school-name-${viewingSchool.id}`}>
              {viewingSchool.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.country')}</label>
                <p className="text-base" data-testid={`text-country-${viewingSchool.id}`}>
                  {viewingSchool.country}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.schoolType')}</label>
                <p className="text-base capitalize" data-testid={`text-type-${viewingSchool.id}`}>
                  {viewingSchool.type}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  {t('schools.school_details.labels.preferredLanguage')}
                  {!editingSchoolLanguage && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2"
                      onClick={() => {
                        setEditingSchoolLanguage(true);
                        setSchoolLanguageValue(viewingSchool.primaryLanguage || 'en');
                      }}
                      data-testid={`button-edit-language-${viewingSchool.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </label>
                {editingSchoolLanguage ? (
                  <div className="flex gap-2 items-center">
                    <Select 
                      value={schoolLanguageValue} 
                      onValueChange={setSchoolLanguageValue}
                    >
                      <SelectTrigger className="h-9" data-testid={`select-language-${viewingSchool.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="nl">Dutch</SelectItem>
                        <SelectItem value="el">Greek</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="id">Indonesian</SelectItem>
                        <SelectItem value="cy">Welsh</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateSchoolLanguageMutation.mutate({
                          schoolId: viewingSchool.id,
                          primaryLanguage: schoolLanguageValue,
                        });
                      }}
                      disabled={updateSchoolLanguageMutation.isPending}
                      data-testid={`button-save-language-${viewingSchool.id}`}
                    >
                      {updateSchoolLanguageMutation.isPending && (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      )}
                      {updateSchoolLanguageMutation.isPending ? t('schools.buttons.saving') : t('schools.buttons.save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSchoolLanguage(false)}
                      data-testid={`button-cancel-language-${viewingSchool.id}`}
                    >
                      {t('schools.buttons.cancel')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-base" data-testid={`text-language-${viewingSchool.id}`}>
                    {viewingSchool.primaryLanguage || 'en'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.studentCount')}</label>
                <p className="text-base" data-testid={`text-student-count-${viewingSchool.id}`}>
                  {viewingSchool.studentCount}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.currentStage')}</label>
                <p className="text-base capitalize" data-testid={`text-stage-${viewingSchool.id}`}>
                  {viewingSchool.currentStage}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600 mb-2 block">{t('schools.school_details.labels.progress')}</label>
                <RoundProgressBadges
                  currentRound={viewingSchool.currentRound || 1}
                  roundsCompleted={viewingSchool.roundsCompleted || 0}
                  progressPercentage={viewingSchool.progressPercentage}
                  showProgressBar={true}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.primaryContactEmail')}</label>
                <p className="text-base" data-testid={`text-email-${viewingSchool.id}`}>
                  {viewingSchool.primaryContactFirstName && viewingSchool.primaryContactLastName
                    ? `${viewingSchool.primaryContactFirstName} ${viewingSchool.primaryContactLastName} (${viewingSchool.primaryContactEmail})`
                    : viewingSchool.primaryContactEmail || t('schools.school_table.notAvailable')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.joined')}</label>
                <p className="text-base" data-testid={`text-joined-${viewingSchool.id}`}>
                  {new Date(viewingSchool.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {viewingSchool.address && (
              <div>
                <label className="text-sm font-medium text-gray-600">{t('schools.school_details.labels.address')}</label>
                <p className="text-base" data-testid={`text-address-${viewingSchool.id}`}>
                  {viewingSchool.address}
                </p>
              </div>
            )}

            {/* Manage Progression Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-pcs_blue" />
                    {t('schools.school_details.progression.title')}
                  </div>
                  {!editingProgression && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingProgression(true);
                        setProgressionFormData({
                          currentStage: viewingSchool.currentStage as 'inspire' | 'investigate' | 'act',
                          currentRound: viewingSchool.currentRound || 1,
                          inspireCompleted: viewingSchool.inspireCompleted || false,
                          investigateCompleted: viewingSchool.investigateCompleted || false,
                          actCompleted: viewingSchool.actCompleted || false,
                        });
                      }}
                      data-testid={`button-edit-progression-${viewingSchool.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t('schools.school_details.progression.editButton')}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingProgression ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('schools.school_details.labels.currentStage')}</label>
                        <Select
                          value={progressionFormData.currentStage}
                          onValueChange={(value) => 
                            setProgressionFormData({
                              ...progressionFormData,
                              currentStage: value as 'inspire' | 'investigate' | 'act'
                            })
                          }
                        >
                          <SelectTrigger data-testid={`select-stage-${viewingSchool.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inspire">{t('schools.school_details.stages.inspire')}</SelectItem>
                            <SelectItem value="investigate">{t('schools.school_details.stages.investigate')}</SelectItem>
                            <SelectItem value="act">{t('schools.school_details.stages.act')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('schools.school_details.progression.currentRound')}</label>
                        <Input
                          type="number"
                          min="1"
                          value={progressionFormData.currentRound}
                          onChange={(e) => 
                            setProgressionFormData({
                              ...progressionFormData,
                              currentRound: parseInt(e.target.value) || 1
                            })
                          }
                          data-testid={`input-round-${viewingSchool.id}`}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">{t('schools.school_details.progression.stageCompletion')}</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={progressionFormData.inspireCompleted}
                            onCheckedChange={(checked) => 
                              setProgressionFormData({
                                ...progressionFormData,
                                inspireCompleted: checked as boolean
                              })
                            }
                            data-testid={`checkbox-inspire-${viewingSchool.id}`}
                          />
                          <span className="text-sm">{t('schools.school_details.progression.inspireCompleted')}</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={progressionFormData.investigateCompleted}
                            onCheckedChange={(checked) => 
                              setProgressionFormData({
                                ...progressionFormData,
                                investigateCompleted: checked as boolean
                              })
                            }
                            data-testid={`checkbox-investigate-${viewingSchool.id}`}
                          />
                          <span className="text-sm">{t('schools.school_details.progression.investigateCompleted')}</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={progressionFormData.actCompleted}
                            onCheckedChange={(checked) => 
                              setProgressionFormData({
                                ...progressionFormData,
                                actCompleted: checked as boolean
                              })
                            }
                            data-testid={`checkbox-act-${viewingSchool.id}`}
                          />
                          <span className="text-sm">{t('schools.school_details.progression.actCompleted')}</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setEditingProgression(false)}
                        data-testid={`button-cancel-progression-${viewingSchool.id}`}
                      >
                        {t('schools.buttons.cancel')}
                      </Button>
                      <Button 
                        onClick={() => {
                          updateSchoolProgressionMutation.mutate({
                            schoolId: viewingSchool.id,
                            updates: progressionFormData
                          });
                        }}
                        disabled={updateSchoolProgressionMutation.isPending}
                        className="bg-pcs_blue hover:bg-pcs_blue/90"
                        data-testid={`button-save-progression-${viewingSchool.id}`}
                      >
                        {updateSchoolProgressionMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {updateSchoolProgressionMutation.isPending ? t('schools.buttons.saving') : t('schools.buttons.saveChanges')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <p>{t('schools.school_details.progression.description')}</p>
                    <div className="mt-3 space-y-1">
                      <p><strong>{t('schools.school_details.progression.currentStage')}:</strong> {viewingSchool.currentStage}</p>
                      <p><strong>{t('schools.school_details.progression.currentRound')}:</strong> {viewingSchool.currentRound || 1}</p>
                      <p><strong>{t('schools.school_details.progression.stageCompletion')}:</strong></p>
                      <ul className="ml-4 list-disc">
                        <li>{t('schools.school_details.stages.inspire')}: {viewingSchool.inspireCompleted ? t('schools.school_details.progression.completed') : t('schools.school_details.progression.notCompleted')}</li>
                        <li>{t('schools.school_details.stages.investigate')}: {viewingSchool.investigateCompleted ? t('schools.school_details.progression.completed') : t('schools.school_details.progression.notCompleted')}</li>
                        <li>{t('schools.school_details.stages.act')}: {viewingSchool.actCompleted ? t('schools.school_details.progression.completed') : t('schools.school_details.progression.notCompleted')}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reduction Promises Impact Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-pcs_blue" />
                  {t('schools.school_details.actionPlan.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schoolPromisesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
                    <span className="text-gray-600">{t('schools.school_details.actionPlan.loading')}</span>
                  </div>
                ) : schoolPromisesQuery.error ? (
                  <div className="text-center py-8 text-red-600">
                    {t('schools.school_details.actionPlan.loadingError')}
                  </div>
                ) : totalPromises === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('schools.school_details.actionPlan.noPromises')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.totalPromises')}</label>
                        <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-promises-total">
                          {totalPromises}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.itemsReduced')}</label>
                        <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-items-reduced">
                          {totalAnnualReduction.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.weightReduced')}</label>
                        <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-weight-reduced">
                          {totalAnnualWeightKg.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Ocean Impact Section */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-teal" />
                        {t('schools.school_details.actionPlan.oceanImpact')}
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.oceanBottles')}</label>
                          <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-ocean-bottles">
                            <TrendingDown className="h-4 w-4" />
                            {promiseMetrics?.funMetrics.oceanPlasticBottles.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.fishSaved')}</label>
                          <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-fish-saved">
                            <Fish className="h-4 w-4" />
                            {promiseMetrics?.funMetrics.fishSaved.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.seaTurtles')}</label>
                          <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-sea-turtles">
                            <Heart className="h-4 w-4" />
                            {promiseMetrics?.funMetrics.seaTurtles.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Environmental Impact Section */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-green-600" />
                        {t('schools.school_details.actionPlan.environmentalImpact')}
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.co2Prevented')}</label>
                          <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-co2-prevented">
                            <Factory className="h-4 w-4" />
                            {promiseMetrics?.seriousMetrics.co2Prevented.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.oilSaved')}</label>
                          <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-oil-saved">
                            <Droplets className="h-4 w-4" />
                            {promiseMetrics?.seriousMetrics.oilSaved.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">{t('schools.school_details.actionPlan.metrics.wastePrevented')}</label>
                          <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-waste-prevented">
                            <Trash className="h-4 w-4" />
                            {promiseMetrics?.seriousMetrics.tons.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Round History Card */}
            {viewingSchool && (viewingSchool.roundsCompleted || 0) >= 1 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-pcs_blue" />
                    Round History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certificatesQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
                      <span className="text-gray-600">Loading round history...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {completedRounds.map((round, index) => {
                        const certificate = certificatesQuery.data?.find(
                          (cert: any) => parseInt(cert.metadata?.round || '0') === round
                        );
                        const auditQuery = auditsQueries[index];
                        const auditData = auditQuery?.data;
                        const prevAuditQuery = index > 0 ? auditsQueries[index - 1] : null;
                        const prevAuditData = prevAuditQuery?.data;

                        const currentPlasticItems = auditData?.totalPlasticItems || auditData?.resultsData?.totalPlasticItems || 0;
                        const prevPlasticItems = prevAuditData?.totalPlasticItems || prevAuditData?.resultsData?.totalPlasticItems || 0;
                        
                        let reductionPercentage = 0;
                        let hasComparison = false;
                        if (index > 0 && prevPlasticItems > 0 && currentPlasticItems > 0) {
                          reductionPercentage = ((prevPlasticItems - currentPlasticItems) / prevPlasticItems) * 100;
                          hasComparison = true;
                        }

                        const evidenceCount = Array.isArray(certificate?.metadata?.achievements) 
                          ? certificate.metadata.achievements.length 
                          : 0;

                        return (
                          <div key={round} className="relative">
                            {/* Timeline connector */}
                            {index < completedRounds.length - 1 && (
                              <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-teal-300" />
                            )}
                            
                            <div className="flex gap-4">
                              {/* Round badge */}
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center relative z-10">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                              </div>

                              {/* Round content */}
                              <div className="flex-1 pb-6">
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-navy flex items-center gap-2">
                                      <Badge className="bg-teal-500 text-white">
                                        ✓ Round {round}
                                      </Badge>
                                    </h4>
                                    {certificate && (
                                      <span className="text-xs text-gray-600">
                                        Completed: {new Date(certificate.completedDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    {/* Certificate download */}
                                    {certificate && (
                                      <div className="flex items-center gap-2">
                                        <Download className="h-4 w-4 text-pcs_blue" />
                                        <a
                                          href={`/api/certificates/${certificate.id}/download`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-pcs_blue hover:underline"
                                          data-testid={`link-download-certificate-round-${round}`}
                                        >
                                          Download Certificate
                                        </a>
                                      </div>
                                    )}

                                    {/* Evidence count */}
                                    {evidenceCount > 0 && (
                                      <div className="flex items-center gap-2 text-gray-600">
                                        <CheckCircle className="h-4 w-4 text-teal-500" />
                                        <span>{evidenceCount} evidence submitted</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Audit metrics */}
                                  {auditQuery?.isLoading ? (
                                    <div className="text-xs text-gray-500 italic">Loading audit data...</div>
                                  ) : auditData ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between bg-white rounded p-2">
                                        <span className="text-xs font-medium text-gray-700">Plastic Usage:</span>
                                        <span className="text-sm font-semibold text-pcs_blue">
                                          {currentPlasticItems.toLocaleString()} items/week
                                        </span>
                                      </div>

                                      {/* Comparison with previous round */}
                                      {hasComparison && (
                                        <div className={`flex items-center justify-between rounded p-2 ${
                                          reductionPercentage > 0 ? 'bg-green-50' : 'bg-red-50'
                                        }`}>
                                          <span className="text-xs font-medium text-gray-700">vs Round {round - 1}:</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-600">
                                              {prevPlasticItems.toLocaleString()} → {currentPlasticItems.toLocaleString()}
                                            </span>
                                            {reductionPercentage > 0 ? (
                                              <Badge className="bg-green-600 text-white flex items-center gap-1">
                                                <ArrowDown className="h-3 w-3" />
                                                {Math.abs(reductionPercentage).toFixed(1)}% reduction
                                              </Badge>
                                            ) : reductionPercentage < 0 ? (
                                              <Badge className="bg-red-600 text-white flex items-center gap-1">
                                                <ArrowUp className="h-3 w-3" />
                                                {Math.abs(reductionPercentage).toFixed(1)}% increase
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-gray-500 text-white">
                                                No change
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 italic bg-gray-100 rounded p-2">
                                      No audit data available
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Photo Consent Status Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5 text-pcs_blue" />
                  {t('schools.school_details.photoConsent.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!photoConsentStatus || !photoConsentStatus.status ? (
                  <div className="text-center py-8 text-gray-500" data-testid="photo-consent-not-uploaded">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>{t('schools.school_details.photoConsent.noDocument')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status and Upload Info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-600">{t('schools.school_details.photoConsent.status')}:</label>
                          <Badge
                            className={
                              photoConsentStatus.status === 'approved' ? 'bg-green-500 text-white' :
                              photoConsentStatus.status === 'rejected' ? 'bg-red-500 text-white' :
                              photoConsentStatus.status === 'pending' ? 'bg-yellow-500 text-white' :
                              'bg-gray-500 text-white'
                            }
                            data-testid="badge-photo-consent-status"
                          >
                            {photoConsentStatus.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {photoConsentStatus.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                            {photoConsentStatus.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {photoConsentStatus.status?.charAt(0).toUpperCase() + photoConsentStatus.status?.slice(1)}
                          </Badge>
                        </div>
                        
                        {photoConsentStatus.uploadedAt && (
                          <p className="text-sm text-gray-600" data-testid="text-photo-consent-upload-date">
                            <strong>{t('schools.school_details.photoConsent.uploadedAt')}</strong> {new Date(photoConsentStatus.uploadedAt).toLocaleDateString()}
                          </p>
                        )}

                        {photoConsentStatus.documentUrl && (
                          <a
                            href={photoConsentStatus.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-pcs_blue hover:underline"
                            data-testid="link-view-photo-consent-document"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('schools.school_details.photoConsent.viewDocument')}
                          </a>
                        )}
                      </div>

                      {/* Action Buttons for Pending Status */}
                      {photoConsentStatus.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (viewingSchool?.id) {
                                approvePhotoConsentMutation.mutate({ schoolId: viewingSchool.id, notes: '' });
                              }
                            }}
                            disabled={approvePhotoConsentMutation.isPending}
                            className="bg-green-500 hover:bg-green-600 text-white"
                            data-testid="button-approve-photo-consent"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {approvePhotoConsentMutation.isPending ? t('schools.school_details.photoConsent.approving') : t('schools.school_details.photoConsent.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setPhotoConsentRejectDialogOpen(true)}
                            disabled={rejectPhotoConsentMutation.isPending}
                            data-testid="button-reject-photo-consent"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            {t('schools.school_details.photoConsent.reject')}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Approval Information */}
                    {photoConsentStatus.status === 'approved' && photoConsentStatus.approvedAt && (
                      <div className="border-t pt-3 text-sm text-gray-600" data-testid="info-photo-consent-approval">
                        <p>
                          <strong>{t('schools.school_details.photoConsent.approvedAt')}</strong> {new Date(photoConsentStatus.approvedAt).toLocaleDateString()}
                        </p>
                        {photoConsentStatus.approvedBy && (
                          <p>
                            <strong>{t('schools.school_details.photoConsent.approvedBy')}</strong> {photoConsentStatus.approvedBy}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection Information */}
                    {photoConsentStatus.status === 'rejected' && (
                      <div className="border-t pt-3" data-testid="info-photo-consent-rejection">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-red-900 mb-1">{t('schools.school_details.photoConsent.rejectionNotes')}:</p>
                          <p className="text-sm text-red-800" data-testid="text-photo-consent-reject-notes">
                            {photoConsentStatus.reviewNotes || t('schools.school_details.photoConsent.noNotes')}
                          </p>
                          {photoConsentStatus.reviewedBy && (
                            <p className="text-xs text-red-700 mt-2">
                              {t('schools.school_details.photoConsent.reviewedBy')}: {photoConsentStatus.reviewedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button
                onClick={() => {
                  const schoolId = viewingSchool.id;
                  setViewingSchool(null);
                  setTimeout(() => {
                    setEvidenceFormSchoolId(schoolId);
                    setShowAdminEvidenceForm(true);
                  }, 100);
                }}
                className="bg-teal hover:bg-teal/90"
                data-testid="button-submit-evidence-for-school"
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('schools.school_details.submitEvidence')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setViewingSchool(null)}
                data-testid="button-close-school-detail"
              >
                {t('schools.buttons.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Evidence Submission Form */}
      {showAdminEvidenceForm && evidenceFormSchoolId && (
        <EvidenceSubmissionForm
          onClose={() => {
            setShowAdminEvidenceForm(false);
            setEvidenceFormSchoolId(null);
          }}
          schoolId={evidenceFormSchoolId}
          isAdminOrPartner={true}
        />
      )}

      {/* Photo Consent Rejection Dialog */}
      <AlertDialog open={photoConsentRejectDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setPhotoConsentRejectDialogOpen(false);
          setPhotoConsentRejectNotes('');
        }
      }}>
        <AlertDialogContent data-testid="dialog-reject-photo-consent">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('schools.school_details.photoConsent.rejectDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('schools.school_details.photoConsent.rejectDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('schools.school_details.photoConsent.rejectDialog.label')} <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={photoConsentRejectNotes}
              onChange={(e) => setPhotoConsentRejectNotes(e.target.value)}
              placeholder={t('schools.school_details.photoConsent.rejectDialog.placeholder')}
              rows={4}
              data-testid="textarea-photo-consent-reject-notes"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject-photo-consent">
              {t('schools.buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!photoConsentRejectNotes.trim()) {
                  toast({
                    title: t('schools.toasts.notesRequired.title'),
                    description: t('schools.toasts.notesRequired.description'),
                    variant: "destructive",
                  });
                  return;
                }
                if (viewingSchool?.id) {
                  rejectPhotoConsentMutation.mutate({ schoolId: viewingSchool.id, notes: photoConsentRejectNotes });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={!photoConsentRejectNotes.trim() || rejectPhotoConsentMutation.isPending}
              data-testid="button-confirm-reject-photo-consent"
            >
              {rejectPhotoConsentMutation.isPending ? t('schools.school_details.photoConsent.rejecting') : t('schools.school_details.photoConsent.rejectDocument')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
