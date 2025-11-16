import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Eye,
  Globe,
  FileText,
  Building,
  Check,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  MapPin,
  Award,
  TrendingUp,
  Filter
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { EvidenceFilesGallery } from "@/components/EvidenceFilesGallery";
import { EvidenceVideoLinks } from "@/components/EvidenceVideoLinks";
import { PDFThumbnail } from "@/components/PDFThumbnail";
import SchoolQuickViewDialog from "./SchoolQuickViewDialog";
import type { EvidenceWithSchool } from "@shared/schema";

export default function EvidenceGalleryTab() {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState({
    status: '',
    stage: '',
    country: '',
    visibility: '',
  });
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithSchool | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [schoolHistoryDialogOpen, setSchoolHistoryDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<EvidenceWithSchool['school'] | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState<string | null>(null);
  
  // Fetch all evidence with filters
  const { data: evidenceList = [], isLoading } = useQuery<EvidenceWithSchool[]>({
    queryKey: ['/api/admin/evidence', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.country) params.append('country', filters.country);
      if (filters.visibility) params.append('visibility', filters.visibility);
      
      const response = await fetch(`/api/admin/evidence?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
  });

  // Fetch countries for filter
  const { data: countries = [] } = useQuery<string[]>({
    queryKey: ['/api/countries'],
  });

  // Update evidence status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const response = await apiRequest('PATCH', `/api/admin/evidence/${id}/status`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ title: t('evidenceGallery.toasts.statusUpdated.title'), description: t('evidenceGallery.toasts.statusUpdated.description') });
    },
    onError: () => {
      toast({ title: t('evidenceGallery.toasts.updateFailed.title'), description: t('evidenceGallery.toasts.updateFailed.description'), variant: "destructive" });
    },
  });

  // Delete evidence mutation
  const deleteMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      return await apiRequest('DELETE', `/api/admin/evidence/${evidenceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/evidence'] });
      toast({ 
        title: t('evidenceGallery.toasts.evidenceDeleted.title'), 
        description: t('evidenceGallery.toasts.evidenceDeleted.description') 
      });
      setDeleteDialogOpen(false);
      setEvidenceToDelete(null);
    },
    onError: () => {
      toast({ 
        title: t('evidenceGallery.toasts.evidenceDeleteFailed.title'), 
        description: t('evidenceGallery.toasts.evidenceDeleteFailed.description'), 
        variant: "destructive" 
      });
    },
  });

  // Helper function to get permission badge
  const getPermissionBadge = (photoConsentStatus: string | null | undefined) => {
    if (!photoConsentStatus || photoConsentStatus === 'pending') {
      return {
        icon: ShieldAlert,
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        text: photoConsentStatus === 'pending' ? t('evidenceGallery.badges.permissionPending') : t('evidenceGallery.badges.noPermission'),
      };
    }
    if (photoConsentStatus === 'approved') {
      return {
        icon: ShieldCheck,
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        text: t('evidenceGallery.badges.permissionApproved'),
      };
    }
    if (photoConsentStatus === 'rejected') {
      return {
        icon: Shield,
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        text: t('evidenceGallery.badges.permissionRejected'),
      };
    }
    return {
      icon: ShieldAlert,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      text: t('evidenceGallery.badges.noPermission'),
    };
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get stage badge color
  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'inspire': return 'bg-purple-100 text-purple-800';
      case 'investigate': return 'bg-blue-100 text-blue-800';
      case 'act': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get file for thumbnail (image or PDF)
  const getFileForThumbnail = (evidence: EvidenceWithSchool) => {
    const files = evidence.files as any[] || [];
    
    // First try to find an image
    const imageFile = files.find((f: any) => 
      f.mimeType?.startsWith('image/') || f.type?.startsWith('image/')
    );
    if (imageFile) return { type: 'image', url: imageFile.url };
    
    // Then try PDF
    const pdfFile = files.find((f: any) => 
      f.mimeType?.includes('pdf') || f.type?.includes('pdf')
    );
    if (pdfFile) return { type: 'pdf', url: pdfFile.url };
    
    return null;
  };

  return (
    <div className="space-y-6" data-refactor-source="EvidenceGalleryTab">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-navy">{t('evidenceGallery.title')}</h2>
          <p className="text-gray-600 text-sm mt-1">{t('evidenceGallery.subtitle')}</p>
        </div>
        <div className="text-sm text-gray-600">
          {evidenceList.length === 1 ? t('evidenceGallery.submissionCount.single', { count: evidenceList.length }) : t('evidenceGallery.submissionCount.plural', { count: evidenceList.length })}
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('evidenceGallery.filters.labels.stage')}</label>
              <Select 
                value={filters.stage || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, stage: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-stage-filter">
                  <SelectValue placeholder={t('evidenceGallery.filters.options.allStages')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('evidenceGallery.filters.options.allStages')}</SelectItem>
                  <SelectItem value="inspire">{t('evidenceGallery.filters.stages.inspire')}</SelectItem>
                  <SelectItem value="investigate">{t('evidenceGallery.filters.stages.investigate')}</SelectItem>
                  <SelectItem value="act">{t('evidenceGallery.filters.stages.act')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('evidenceGallery.filters.labels.country')}</label>
              <Select 
                value={filters.country || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, country: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-country-filter">
                  <SelectValue placeholder={t('evidenceGallery.filters.options.allCountries')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('evidenceGallery.filters.options.allCountries')}</SelectItem>
                  {countries.map((country: string) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('evidenceGallery.filters.labels.status')}</label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder={t('evidenceGallery.filters.options.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('evidenceGallery.filters.options.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('evidenceGallery.filters.statuses.pending')}</SelectItem>
                  <SelectItem value="approved">{t('evidenceGallery.filters.statuses.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('evidenceGallery.filters.statuses.rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('evidenceGallery.filters.labels.visibility')}</label>
              <Select 
                value={filters.visibility || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, visibility: value === 'all' ? '' : value }))}
              >
                <SelectTrigger data-testid="select-visibility-filter">
                  <SelectValue placeholder={t('evidenceGallery.filters.options.allVisibility')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('evidenceGallery.filters.options.allVisibility')}</SelectItem>
                  <SelectItem value="public">{t('evidenceGallery.filters.options.public')}</SelectItem>
                  <SelectItem value="private">{t('evidenceGallery.filters.options.private')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ status: '', stage: '', country: '', visibility: '' })}
                data-testid="button-clear-filters"
              >
                {t('evidenceGallery.buttons.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Evidence Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200" />
              <CardContent className="pt-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : evidenceList.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title={t('evidenceGallery.emptyStates.noEvidence.title')}
          description={t('evidenceGallery.emptyStates.noEvidence.description')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {evidenceList.map((evidence: any) => (
            <Card key={evidence.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-evidence-${evidence.id}`}>
              {/* Thumbnail */}
              <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                {(() => {
                  const file = getFileForThumbnail(evidence);
                  if (file?.type === 'image') {
                    return (
                      <img 
                        src={file.url} 
                        alt={evidence.title}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else if (file?.type === 'pdf') {
                    return (
                      <PDFThumbnail 
                        url={file.url}
                        className="w-full h-full"
                      />
                    );
                  } else {
                    return <FileText className="h-24 w-24 text-gray-400" />;
                  }
                })()}
              </div>
              
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-2" title={evidence.title}>
                    {evidence.title}
                  </h3>
                  
                  {/* School Info */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Building className="h-3 w-3" />
                    <button
                      onClick={() => {
                        setSelectedSchool(evidence.school);
                        setSchoolHistoryDialogOpen(true);
                      }}
                      className="hover:underline truncate"
                      data-testid={`button-school-history-${evidence.id}`}
                    >
                      {evidence.school?.name || t('evidenceGallery.form.values.unknownSchool')}
                    </button>
                  </div>
                  
                  {/* Country */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Globe className="h-3 w-3" />
                    <span>{evidence.school?.country || t('evidenceGallery.form.values.unknown')}</span>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge className={getStageBadgeColor(evidence.stage)}>
                      {evidence.stage}
                    </Badge>
                    <Badge className={getStatusBadgeColor(evidence.status)}>
                      {evidence.status}
                    </Badge>
                    {evidence.visibility === 'public' && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {t('evidenceGallery.badges.public')}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Permission Status Badge */}
                  {(() => {
                    const permissionBadge = getPermissionBadge(evidence.school?.photoConsent?.status);
                    const PermissionIcon = permissionBadge.icon;
                    return (
                      <div className="mt-2">
                        <Badge className={permissionBadge.color} variant="outline">
                          <PermissionIcon className="h-3 w-3 mr-1" />
                          {permissionBadge.text}
                        </Badge>
                      </div>
                    );
                  })()}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedEvidence(evidence);
                        setDetailsDialogOpen(true);
                      }}
                      data-testid={`button-view-evidence-${evidence.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {t('evidenceGallery.buttons.view')}
                    </Button>
                    {evidence.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => updateStatusMutation.mutate({ id: evidence.id, status: 'approved' })}
                          data-testid={`button-approve-evidence-${evidence.id}`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: evidence.id, status: 'rejected' })}
                          data-testid={`button-reject-evidence-${evidence.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        setEvidenceToDelete(evidence.id);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-evidence-${evidence.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Evidence Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-evidence-details">
          <DialogHeader>
            <DialogTitle>{t('evidenceGallery.dialogs.evidenceDetails.title')}</DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('evidenceGallery.form.labels.title')}</label>
                <p className="text-sm mt-1">{selectedEvidence.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('evidenceGallery.form.labels.description')}</label>
                <p className="text-sm mt-1">{selectedEvidence.description || t('evidenceGallery.form.values.noDescription')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('evidenceGallery.form.labels.school')}</label>
                  <p className="text-sm mt-1">{selectedEvidence.school?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('evidenceGallery.form.labels.country')}</label>
                  <p className="text-sm mt-1">{selectedEvidence.school?.country}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('evidenceGallery.form.labels.stage')}</label>
                  <Badge className={getStageBadgeColor(selectedEvidence.stage)}>
                    {selectedEvidence.stage}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('evidenceGallery.form.labels.status')}</label>
                  <Badge className={getStatusBadgeColor(selectedEvidence.status || 'pending')}>
                    {selectedEvidence.status || 'pending'}
                  </Badge>
                </div>
              </div>
              
              {/* Visibility and Permission Status */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">{t('evidenceGallery.form.labels.visibilitySetting')}</label>
                  <Badge variant="outline" className={selectedEvidence.visibility === 'public' ? 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}>
                    <Eye className="h-3 w-3 mr-1" />
                    {selectedEvidence.visibility === 'public' ? t('evidenceGallery.badges.public') : t('evidenceGallery.badges.registeredOnly')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">{t('evidenceGallery.form.labels.photoPermission')}</label>
                  {(() => {
                    const permissionBadge = getPermissionBadge(selectedEvidence.school?.photoConsent?.status);
                    const PermissionIcon = permissionBadge.icon;
                    return (
                      <Badge className={permissionBadge.color} variant="outline">
                        <PermissionIcon className="h-3 w-3 mr-1" />
                        {permissionBadge.text}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              
              {/* Permission Warning */}
              {selectedEvidence.school?.photoConsent?.status !== 'approved' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <ShieldAlert className="h-4 w-4 inline mr-1" />
                    <strong>{t('evidenceGallery.warnings.permissionRequired')}</strong> {selectedEvidence.school?.photoConsent?.status === 'pending' ? t('evidenceGallery.warnings.photoConsentPending') : t('evidenceGallery.warnings.photoConsentMissing')}
                  </p>
                </div>
              )}
              {selectedEvidence.files && Array.isArray(selectedEvidence.files) && selectedEvidence.files.length > 0 ? (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('evidenceGallery.form.labels.files', { count: selectedEvidence.files.length })}</label>
                  <EvidenceFilesGallery files={selectedEvidence.files} />
                </div>
              ) : null}
              {selectedEvidence.videoLinks && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">{t('evidenceGallery.form.labels.videoLinks')}</label>
                  <EvidenceVideoLinks videoLinks={selectedEvidence.videoLinks as string} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* School Quick View Dialog */}
      <SchoolQuickViewDialog
        school={selectedSchool}
        open={schoolHistoryDialogOpen}
        onOpenChange={setSchoolHistoryDialogOpen}
      />

      {/* Delete Evidence Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-evidence">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('evidenceGallery.dialogs.deleteConfirmation.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('evidenceGallery.dialogs.deleteConfirmation.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t('evidenceGallery.buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (evidenceToDelete) {
                  deleteMutation.mutate(evidenceToDelete);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? t('evidenceGallery.buttons.deleting') : t('evidenceGallery.buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
