import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { SchoolData } from "@/components/admin/shared/types";

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
        title: "Bulk Update Complete",
        description: `${variables.schoolIds.length} schools have been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setSelectedSchools([]);
      setBulkSchoolDialogOpen(false);
      setBulkAction(null);
    },
    onError: () => {
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update schools. Please try again.",
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
        title: "Bulk Delete Complete",
        description: `${schoolIds.length} schools have been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard-data'] });
      setSelectedSchools([]);
      setBulkSchoolDialogOpen(false);
      setBulkAction(null);
    },
    onError: () => {
      toast({
        title: "Bulk Delete Failed",
        description: "Failed to delete schools. Please try again.",
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
        title: "School Deleted",
        description: variables.deleteUsers 
          ? "The school and all associated users have been successfully deleted."
          : "The school has been successfully deleted.",
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
        title: "Delete Failed",
        description: error.message || "Failed to delete school. Please try again.",
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
              {bulkAction.type === 'update' ? 'Bulk Update Schools' : 'Bulk Delete Schools'}
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  This action will affect <strong>{selectedSchools.length}</strong> schools.
                </p>
              </div>
              
              {bulkAction.type === 'update' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Current Stage
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
                    <option value="inspire">Inspire</option>
                    <option value="investigate">Investigate</option>
                    <option value="act">Act</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    All selected schools will be moved to this program stage.
                  </p>
                </div>
              )}

              {bulkAction.type === 'delete' && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> This action cannot be undone. All selected schools and their associated data will be permanently deleted.
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
                  Cancel
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
                  {(bulkSchoolUpdateMutation.isPending || bulkSchoolDeleteMutation.isPending) ? 'Processing...' : 'Confirm'}
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
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                Are you sure you want to delete <strong>{deletingSchool?.name}</strong>? This action cannot be undone and will permanently remove the school and all associated data.
              </div>
              
              {isLoadingSchoolUsers ? (
                <div className="text-sm text-gray-500">Loading school users...</div>
              ) : schoolUsersPreview && schoolUsersPreview.count > 0 ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Warning:</strong> This school has {schoolUsersPreview.count} associated user{schoolUsersPreview.count > 1 ? 's' : ''}.
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <div className="text-sm font-medium mb-2">Associated Users:</div>
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
                        Also delete all associated user accounts
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        If unchecked, the user accounts will remain in the system and can be reassigned to other schools. If checked, the users will be permanently deleted and won't be able to register again with the same email addresses.
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  This school has no associated users.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-school">
              Cancel
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
              {deleteSchoolMutation.isPending ? "Deleting..." : "Delete School"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
