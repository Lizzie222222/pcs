import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { SchoolData } from "@/components/admin/shared/types";
import { useTranslation } from 'react-i18next';

interface BulkSchoolActionsProps {
  selectedSchools: string[];
  setSelectedSchools: (schools: string[]) => void;
  bulkSchoolDialogOpen: boolean;
  setBulkSchoolDialogOpen: (open: boolean) => void;
  bulkAction: {
    type: 'update' | 'delete';
    updates?: Record<string, any>;
  } | null;
  setBulkAction: (action: { type: 'update' | 'delete'; updates?: Record<string, any> } | null) => void;
  deletingSchool: SchoolData | null;
  setDeletingSchool: (school: SchoolData | null) => void;
}

export default function BulkSchoolActions({
  selectedSchools,
  setSelectedSchools,
  bulkSchoolDialogOpen,
  setBulkSchoolDialogOpen,
  bulkAction,
  setBulkAction,
  deletingSchool,
  setDeletingSchool,
}: BulkSchoolActionsProps) {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteSchoolUsers, setDeleteSchoolUsers] = useState(false);

  // Fetch school users preview when deletion dialog opens
  const { data: schoolUsersPreview, isLoading: isLoadingSchoolUsers } = useQuery<{
    count: number;
    users: Array<{ id: string; name: string; email: string; role: string }>;
  }>({
    queryKey: ['/api/admin/schools', deletingSchool?.id, 'users-preview'],
    enabled: !!deletingSchool,
    retry: false,
  });

  // Bulk school update mutation
  const bulkSchoolUpdateMutation = useMutation({
    mutationFn: async ({ schoolIds, updates }: {
      schoolIds: string[];
      updates: Record<string, any>;
    }) => {
      await apiRequest('POST', '/api/admin/schools/bulk-update', {
        schoolIds,
        updates,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: t('admin.schools.toasts.bulkUpdateComplete.title'),
        description: t('admin.schools.toasts.bulkUpdateComplete.description', { count: variables.schoolIds.length }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setSelectedSchools([]);
      setBulkSchoolDialogOpen(false);
      setBulkAction(null);
    },
    onError: () => {
      toast({
        title: t('admin.schools.toasts.bulkUpdateFailed.title'),
        description: t('admin.schools.toasts.bulkUpdateFailed.description'),
        variant: "destructive",
      });
    },
  });

  // Bulk school delete mutation
  const bulkSchoolDeleteMutation = useMutation({
    mutationFn: async (schoolIds: string[]) => {
      await apiRequest('DELETE', '/api/admin/schools/bulk-delete', {
        schoolIds,
      });
    },
    onSuccess: (_, schoolIds) => {
      toast({
        title: t('admin.schools.toasts.bulkDeleteComplete.title'),
        description: t('admin.schools.toasts.bulkDeleteComplete.description', { count: schoolIds.length }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setSelectedSchools([]);
      setBulkSchoolDialogOpen(false);
      setBulkAction(null);
    },
    onError: () => {
      toast({
        title: t('admin.schools.toasts.bulkDeleteFailed.title'),
        description: t('admin.schools.toasts.bulkDeleteFailed.description'),
        variant: "destructive",
      });
    },
  });

  // Individual school delete mutation
  const deleteSchoolMutation = useMutation({
    mutationFn: async ({ schoolId, deleteUsers }: { schoolId: string; deleteUsers: boolean }) => {
      await apiRequest('DELETE', `/api/admin/schools/${schoolId}?deleteUsers=${deleteUsers}`);
    },
    onSuccess: (_, variables) => {
      toast({
        title: t('admin.schools.toasts.schoolDeleted.title'),
        description: variables.deleteUsers 
          ? t('admin.schools.toasts.schoolDeleted.descriptionWithUsers')
          : t('admin.schools.toasts.schoolDeleted.descriptionWithoutUsers'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/school-progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setDeletingSchool(null);
      setDeleteSchoolUsers(false);
    },
    onError: (error: any) => {
      toast({
        title: t('admin.schools.toasts.schoolDeleteFailed.title'),
        description: error.message || t('admin.schools.toasts.schoolDeleteFailed.description'),
        variant: "destructive",
      });
      setDeletingSchool(null);
      setDeleteSchoolUsers(false);
    },
  });

  return (
    <>
      {/* Bulk School Operations Dialog */}
      {bulkSchoolDialogOpen && bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {bulkAction.type === 'update' ? t('admin.schools.bulkActions.dialogs.update.title') : t('admin.schools.bulkActions.dialogs.delete.title')}
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{
                  __html: bulkAction.type === 'update' 
                    ? t('admin.schools.bulkActions.dialogs.update.description', { count: selectedSchools.length })
                    : t('admin.schools.bulkActions.dialogs.delete.description', { count: selectedSchools.length })
                }}></p>
              </div>
              
              {bulkAction.type === 'update' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.schools.bulkActions.dialogs.update.updateStageLabel')}
                  </label>
                  <select
                    value={bulkAction.updates?.currentStage || 'inspire'}
                    onChange={(e) => {
                      if (bulkAction) {
                        setBulkAction({ 
                          ...bulkAction, 
                          updates: { ...bulkAction.updates, currentStage: e.target.value } 
                        });
                      }
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    data-testid="select-bulk-stage"
                  >
                    <option value="inspire">{t('admin.schools.school_details.stages.inspire')}</option>
                    <option value="investigate">{t('admin.schools.school_details.stages.investigate')}</option>
                    <option value="act">{t('admin.schools.school_details.stages.act')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.schools.bulkActions.dialogs.update.updateStageHelpText')}
                  </p>
                </div>
              )}

              {bulkAction.type === 'delete' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>{t('admin.schools.bulkActions.dialogs.delete.warningTitle')}</strong> {t('admin.schools.bulkActions.dialogs.delete.warningDescription')}
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkSchoolDialogOpen(false);
                    setBulkAction(null);
                  }}
                  className="flex-1"
                  data-testid="button-cancel-bulk-school-operation"
                >
                  {t('admin.schools.buttons.cancel')}
                </Button>
                <Button
                  className={`flex-1 ${
                    bulkAction.type === 'update' ? 'bg-pcs_blue hover:bg-blue-600' : 'bg-red-600 hover:bg-red-700'
                  }`}
                  onClick={() => {
                    if (bulkAction.type === 'delete') {
                      bulkSchoolDeleteMutation.mutate(selectedSchools);
                    } else {
                      bulkSchoolUpdateMutation.mutate({
                        schoolIds: selectedSchools,
                        updates: bulkAction.updates || {},
                      });
                    }
                  }}
                  disabled={bulkSchoolUpdateMutation.isPending || bulkSchoolDeleteMutation.isPending}
                  data-testid="button-confirm-bulk-school-operation"
                >
                  {(bulkSchoolUpdateMutation.isPending || bulkSchoolDeleteMutation.isPending) ? t('admin.schools.buttons.processing') : t('admin.schools.buttons.confirm')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete School Confirmation Dialog */}
      <AlertDialog open={!!deletingSchool} onOpenChange={(open) => {
        if (!open) {
          setDeletingSchool(null);
          setDeleteSchoolUsers(false);
        }
      }}>
        <AlertDialogContent data-testid="dialog-delete-school-confirmation" className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.schools.bulkActions.dialogs.deleteSchool.title')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div dangerouslySetInnerHTML={{
                __html: t('admin.schools.bulkActions.dialogs.deleteSchool.description', { name: deletingSchool?.name || '' })
              }}></div>
              
              {isLoadingSchoolUsers ? (
                <div className="text-sm text-gray-500">{t('admin.schools.bulkActions.dialogs.deleteSchool.loadingUsers')}</div>
              ) : schoolUsersPreview && schoolUsersPreview.count > 0 ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        {t('admin.schools.bulkActions.dialogs.deleteSchool.warningUsers', { 
                          count: schoolUsersPreview.count,
                          plural: schoolUsersPreview.count > 1 ? 's' : ''
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="text-sm font-medium mb-2">{t('admin.schools.bulkActions.dialogs.deleteSchool.associatedUsers')}</div>
                    <ul className="space-y-1 text-sm">
                      {schoolUsersPreview.users.map((user) => (
                        <li key={user.id} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          <span>{user.name} ({user.email}) - {user.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      id="delete-school-users"
                      checked={deleteSchoolUsers}
                      onChange={(e) => setDeleteSchoolUsers(e.target.checked)}
                      className="mt-1"
                      data-testid="checkbox-delete-school-users"
                    />
                    <label htmlFor="delete-school-users" className="text-sm cursor-pointer">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {t('admin.schools.bulkActions.dialogs.deleteSchool.deleteUsersLabel')}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        {t('admin.schools.bulkActions.dialogs.deleteSchool.deleteUsersDescription')}
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {t('admin.schools.bulkActions.dialogs.deleteSchool.noUsers')}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-school">
              {t('admin.schools.buttons.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSchool && deleteSchoolMutation.mutate({ 
                schoolId: deletingSchool.id, 
                deleteUsers: deleteSchoolUsers 
              })}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteSchoolMutation.isPending}
              data-testid="button-confirm-delete-school"
            >
              {deleteSchoolMutation.isPending ? t('admin.schools.buttons.deleting') : t('admin.schools.bulkActions.dialogs.deleteSchool.title')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
