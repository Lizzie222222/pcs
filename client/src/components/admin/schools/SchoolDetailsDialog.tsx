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
} from "lucide-react";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
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

  // Reduction promises query for selected school
  const schoolPromisesQuery = useQuery<ReductionPromise[]>({
    queryKey: ['/api/reduction-promises/school', viewingSchool?.id],
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

  // Update school language mutation
  const updateSchoolLanguageMutation = useMutation({
    mutationFn: async ({ schoolId, primaryLanguage }: { schoolId: string; primaryLanguage: string }) => {
      return await apiRequest('PUT', `/api/admin/schools/${schoolId}`, { primaryLanguage });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Language Updated",
        description: "School preferred language has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      if (viewingSchool) {
        setViewingSchool({
          ...viewingSchool,
          primaryLanguage: variables.primaryLanguage
        });
      }
      setEditingSchoolLanguage(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update school language. Please try again.",
        variant: "destructive",
      });
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
    onSuccess: (data, variables) => {
      toast({
        title: "Progression Updated",
        description: "School progression has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/school-progress'] });
      const responseData = data as any;
      if (viewingSchool && responseData.school) {
        setViewingSchool({
          ...viewingSchool,
          ...responseData.school
        });
      }
      setEditingProgression(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update school progression. Please try again.",
        variant: "destructive",
      });
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
                <label className="text-sm font-medium text-gray-600">Country</label>
                <p className="text-base" data-testid={`text-country-${viewingSchool.id}`}>
                  {viewingSchool.country}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">School Type</label>
                <p className="text-base capitalize" data-testid={`text-type-${viewingSchool.id}`}>
                  {viewingSchool.type}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  Preferred Language
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
                      {updateSchoolLanguageMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSchoolLanguage(false)}
                      data-testid={`button-cancel-language-${viewingSchool.id}`}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="text-base" data-testid={`text-language-${viewingSchool.id}`}>
                    {viewingSchool.primaryLanguage || 'en'}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Number of Students</label>
                <p className="text-base" data-testid={`text-student-count-${viewingSchool.id}`}>
                  {viewingSchool.studentCount}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Current Stage</label>
                <p className="text-base capitalize" data-testid={`text-stage-${viewingSchool.id}`}>
                  {viewingSchool.currentStage}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Progress</label>
                <p className="text-base" data-testid={`text-progress-${viewingSchool.id}`}>
                  {viewingSchool.progressPercentage}%
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Primary Contact Email</label>
                <p className="text-base" data-testid={`text-email-${viewingSchool.id}`}>
                  {viewingSchool.primaryContactEmail || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Joined</label>
                <p className="text-base" data-testid={`text-joined-${viewingSchool.id}`}>
                  {new Date(viewingSchool.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {viewingSchool.address && (
              <div>
                <label className="text-sm font-medium text-gray-600">Address</label>
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
                    Manage Progression
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
                      Edit Progression
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingProgression ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Current Stage</label>
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
                            <SelectItem value="inspire">Inspire</SelectItem>
                            <SelectItem value="investigate">Investigate</SelectItem>
                            <SelectItem value="act">Act</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Current Round</label>
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
                      <label className="text-sm font-medium text-gray-700">Stage Completion</label>
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
                          <span className="text-sm">Inspire Completed</span>
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
                          <span className="text-sm">Investigate Completed</span>
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
                          <span className="text-sm">Act Completed</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setEditingProgression(false)}
                        data-testid={`button-cancel-progression-${viewingSchool.id}`}
                      >
                        Cancel
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
                        {updateSchoolProgressionMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    <p>Use this section to manually set the school's progression stage, round, and completion status. This allows you to override the automatic progression based on evidence submission.</p>
                    <div className="mt-3 space-y-1">
                      <p><strong>Current Stage:</strong> {viewingSchool.currentStage}</p>
                      <p><strong>Current Round:</strong> {viewingSchool.currentRound || 1}</p>
                      <p><strong>Stage Completion:</strong></p>
                      <ul className="ml-4 list-disc">
                        <li>Inspire: {viewingSchool.inspireCompleted ? '✓ Completed' : '○ Not completed'}</li>
                        <li>Investigate: {viewingSchool.investigateCompleted ? '✓ Completed' : '○ Not completed'}</li>
                        <li>Act: {viewingSchool.actCompleted ? '✓ Completed' : '○ Not completed'}</li>
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
                  Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schoolPromisesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue mr-3"></div>
                    <span className="text-gray-600">Loading promises data...</span>
                  </div>
                ) : schoolPromisesQuery.error ? (
                  <div className="text-center py-8 text-red-600">
                    Failed to load promises data. Please try again.
                  </div>
                ) : totalPromises === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    This school hasn't made any reduction promises yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Total Promises</label>
                        <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-promises-total">
                          {totalPromises}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Items Reduced (annual)</label>
                        <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-items-reduced">
                          {totalAnnualReduction.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Weight Reduced (kg/year)</label>
                        <p className="text-2xl font-bold text-pcs_blue" data-testid="metric-weight-reduced">
                          {totalAnnualWeightKg.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Ocean Impact Section */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-navy mb-3 flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-teal" />
                        Ocean Impact
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Ocean Bottles Prevented</label>
                          <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-ocean-bottles">
                            <TrendingDown className="h-4 w-4" />
                            {promiseMetrics?.funMetrics.oceanPlasticBottles.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Fish Saved</label>
                          <p className="text-lg font-semibold text-teal flex items-center gap-1" data-testid="metric-fish-saved">
                            <Fish className="h-4 w-4" />
                            {promiseMetrics?.funMetrics.fishSaved.toFixed(0)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Sea Turtles Saved</label>
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
                        Environmental Impact
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">CO₂ Prevented (kg)</label>
                          <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-co2-prevented">
                            <Factory className="h-4 w-4" />
                            {promiseMetrics?.seriousMetrics.co2Prevented.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Oil Saved (liters)</label>
                          <p className="text-lg font-semibold text-green-600 flex items-center gap-1" data-testid="metric-oil-saved">
                            <Droplets className="h-4 w-4" />
                            {promiseMetrics?.seriousMetrics.oilSaved.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Waste Prevented (tons)</label>
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

            {/* Photo Consent Status Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5 text-pcs_blue" />
                  Photo Consent Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!photoConsentStatus || !photoConsentStatus.status ? (
                  <div className="text-center py-8 text-gray-500" data-testid="photo-consent-not-uploaded">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No photo consent document uploaded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status and Upload Info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-600">Status:</label>
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
                            <strong>Uploaded:</strong> {new Date(photoConsentStatus.uploadedAt).toLocaleDateString()}
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
                            View Document
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
                            {approvePhotoConsentMutation.isPending ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setPhotoConsentRejectDialogOpen(true)}
                            disabled={rejectPhotoConsentMutation.isPending}
                            data-testid="button-reject-photo-consent"
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Approval Information */}
                    {photoConsentStatus.status === 'approved' && photoConsentStatus.approvedAt && (
                      <div className="border-t pt-3 text-sm text-gray-600" data-testid="info-photo-consent-approval">
                        <p>
                          <strong>Approved:</strong> {new Date(photoConsentStatus.approvedAt).toLocaleDateString()}
                        </p>
                        {photoConsentStatus.approvedBy && (
                          <p>
                            <strong>Approved by:</strong> {photoConsentStatus.approvedBy}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection Information */}
                    {photoConsentStatus.status === 'rejected' && (
                      <div className="border-t pt-3" data-testid="info-photo-consent-rejection">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-red-900 mb-1">Rejection Notes:</p>
                          <p className="text-sm text-red-800" data-testid="text-photo-consent-reject-notes">
                            {photoConsentStatus.reviewNotes || 'No notes provided'}
                          </p>
                          {photoConsentStatus.reviewedBy && (
                            <p className="text-xs text-red-700 mt-2">
                              Reviewed by: {photoConsentStatus.reviewedBy}
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
                Submit Evidence for This School
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setViewingSchool(null)}
                data-testid="button-close-school-detail"
              >
                Close
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
            <AlertDialogTitle>Reject Photo Consent</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide feedback explaining why the photo consent document is being rejected. This will help the school understand what needs to be corrected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Notes <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={photoConsentRejectNotes}
              onChange={(e) => setPhotoConsentRejectNotes(e.target.value)}
              placeholder="Explain why the document is being rejected and what needs to be corrected..."
              rows={4}
              data-testid="textarea-photo-consent-reject-notes"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject-photo-consent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!photoConsentRejectNotes.trim()) {
                  toast({
                    title: "Notes Required",
                    description: "Please provide rejection notes explaining why the document was rejected.",
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
              {rejectPhotoConsentMutation.isPending ? "Rejecting..." : "Reject Document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
