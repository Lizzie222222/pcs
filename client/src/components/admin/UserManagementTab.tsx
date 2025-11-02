import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  School, 
  Users, 
  Eye,
  Plus,
  UserPlus,
  MoreVertical,
  Shield,
  Trash2,
  AlertTriangle,
  Archive,
  Trash,
} from "lucide-react";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import AssignTeacherForm from "@/components/admin/AssignTeacherForm";
import MigratedUsersSection from "@/components/admin/MigratedUsersSection";

interface UserWithSchools {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isAdmin: boolean;
    createdAt: string;
    lastActiveAt?: string;
    hasInteracted?: boolean;
  };
  schools: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

interface DeletionPreview {
  evidence: number;
  caseStudies: number;
  reductionPromises: number;
  mediaAssets: number;
  certificates: number;
  importBatches: number;
  teacherInvitations: number;
  adminInvitations: number;
}

export default function UserManagementTab() {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-schools' | 'without-schools'>('all');
  const [interactionFilter, setInteractionFilter] = useState<'all' | 'interacted' | 'not-interacted'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [inviteAdminDialogOpen, setInviteAdminDialogOpen] = useState(false);
  const [inviteAdminEmail, setInviteAdminEmail] = useState('');
  const [invitePartnerDialogOpen, setInvitePartnerDialogOpen] = useState(false);
  const [invitePartnerEmail, setInvitePartnerEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletionMode, setDeletionMode] = useState<'soft' | 'transfer' | 'hard'>('soft');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<{ id: string; name: string; isAdmin: boolean; role: string } | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeletionMode, setBulkDeletionMode] = useState<'soft' | 'transfer' | 'hard'>('soft');

  const isPartner = user?.role === 'partner';

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, interactionFilter]);

  const { data, isLoading } = useQuery<{
    users: UserWithSchools[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      page: number;
      totalPages: number;
    };
  }>({
    queryKey: ['/api/admin/users', { 
      page, 
      limit: pageSize, 
      search: debouncedSearch,
      interactionFilter,
      schoolFilter: filterStatus
    }],
  });

  const usersWithSchools = data?.users || [];
  const pagination = data?.pagination;

  const { data: deletionPreview, isLoading: isLoadingPreview } = useQuery<DeletionPreview>({
    queryKey: ['/api/admin/users', selectedUserToDelete?.id, 'deletion-preview'],
    enabled: !!selectedUserToDelete?.id && deleteDialogOpen,
  });

  const { data: adminInvitations = [], isLoading: isLoadingInvitations } = useQuery<Array<{
    id: string;
    email: string;
    status: string;
    createdAt: string;
    expiresAt: string;
  }>>({
    queryKey: ['/api/admin/invitations'],
  });

  const inviteAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/admin/invite-admin', { email });
    },
    onSuccess: () => {
      toast({
        title: t('userManagement.toasts.invitationSent.title'),
        description: t('userManagement.toasts.invitationSent.adminDescription'),
      });
      setInviteAdminDialogOpen(false);
      setInviteAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: t('userManagement.toasts.invitationFailed.title'),
        description: error.message || t('userManagement.toasts.invitationFailed.adminDescription'),
        variant: "destructive",
      });
    },
  });

  const invitePartnerMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/admin/invite-partner', { email });
    },
    onSuccess: () => {
      toast({
        title: t('userManagement.toasts.invitationSent.title'),
        description: t('userManagement.toasts.invitationSent.partnerDescription'),
      });
      setInvitePartnerDialogOpen(false);
      setInvitePartnerEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('userManagement.toasts.invitationFailed.title'),
        description: error.message || t('userManagement.toasts.invitationFailed.partnerDescription'),
        variant: "destructive",
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await apiRequest('DELETE', `/api/admin/invitations/${invitationId}`);
    },
    onSuccess: () => {
      toast({
        title: t('userManagement.toasts.invitationDeleted.title'),
        description: t('userManagement.toasts.invitationDeleted.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: t('userManagement.toasts.deleteFailed.title'),
        description: error.message || t('userManagement.toasts.deleteFailed.description'),
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, mode }: { userId: string; mode: 'soft' | 'transfer' | 'hard' }) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}?mode=${mode}`);
    },
    onSuccess: (_, variables) => {
      const modeLabels = {
        soft: t('userManagement.toasts.userDeleted.softDeleted'),
        transfer: t('userManagement.toasts.userDeleted.transferred'),
        hard: t('userManagement.toasts.userDeleted.hardDeleted')
      };
      toast({
        title: t('userManagement.toasts.userDeleted.title'),
        description: modeLabels[variables.mode],
      });
      setDeleteDialogOpen(false);
      setSelectedUserToDelete(null);
      setDeletionMode('soft');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || t('userManagement.toasts.deleteFailed.userDescription');
      toast({
        title: t('userManagement.toasts.deleteFailed.title'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ userIds, mode }: { userIds: string[]; mode: 'soft' | 'transfer' | 'hard' }) => {
      const response = await apiRequest('POST', '/api/admin/users/bulk-delete', { userIds, mode });
      return response;
    },
    onSuccess: (data: any) => {
      const { successCount = 0, failedCount = 0, failures = [], totalEvidenceDeleted = 0, affectedCaseStudies = [] } = data || {};
      
      // Build description message
      let description = '';
      
      if (failedCount === 0) {
        // All successful
        const plural = successCount > 1 ? 's' : '';
        description = t('userManagement.toasts.bulkDeleteSuccessful.description', { count: successCount, plural });
        
        if (totalEvidenceDeleted > 0) {
          const evidencePlural = totalEvidenceDeleted > 1 ? 's' : '';
          description = t('userManagement.toasts.bulkDeleteSuccessful.withEvidence', { 
            count: successCount, 
            plural,
            evidenceCount: totalEvidenceDeleted, 
            evidencePlural 
          });
        }
        
        if (affectedCaseStudies && affectedCaseStudies.length > 0) {
          const caseStudyPlural = affectedCaseStudies.length > 1 ? 'studies were' : 'study was';
          description += `. ${t('userManagement.toasts.bulkDeleteSuccessful.withCaseStudies', { 
            caseStudyCount: affectedCaseStudies.length, 
            caseStudyPlural 
          })}`;
          
          if (affectedCaseStudies.length <= 3) {
            const titles = affectedCaseStudies.map((cs: any) => cs.title).join(', ');
            description += ` (${titles})`;
          }
          
          description += ` ${t('userManagement.toasts.bulkDeleteSuccessful.creatorsRemoved')}`;
        } else {
          description += '.';
        }
        
        toast({
          title: t('userManagement.toasts.bulkDeleteSuccessful.title'),
          description,
        });
      } else if (successCount === 0) {
        // All failed
        const failureDetails = failures.map((f: any) => `${f.email}: ${f.reason}`).join('\n');
        toast({
          title: t('userManagement.toasts.bulkDeleteFailed.title'),
          description: `${t('userManagement.toasts.bulkDeleteFailed.allFailed')}\n${failureDetails}`,
          variant: "destructive",
        });
      } else {
        // Partial success
        const plural = successCount > 1 ? 's' : '';
        description = t('userManagement.toasts.bulkDeleteSuccessful.description', { count: successCount, plural });
        
        if (totalEvidenceDeleted > 0) {
          const evidencePlural = totalEvidenceDeleted > 1 ? 's' : '';
          description = t('userManagement.toasts.bulkDeleteSuccessful.withEvidence', { 
            count: successCount, 
            plural,
            evidenceCount: totalEvidenceDeleted, 
            evidencePlural 
          });
        }
        
        if (affectedCaseStudies && affectedCaseStudies.length > 0) {
          const caseStudyPlural = affectedCaseStudies.length > 1 ? 'studies were' : 'study was';
          description += `. ${t('userManagement.toasts.bulkDeleteSuccessful.withCaseStudies', { 
            caseStudyCount: affectedCaseStudies.length, 
            caseStudyPlural 
          })}`;
          
          if (affectedCaseStudies.length <= 3) {
            const titles = affectedCaseStudies.map((cs: any) => cs.title).join(', ');
            description += ` (${titles})`;
          }
        }
        
        const failureDetails = failures.map((f: any) => `${f.email}: ${f.reason}`).join('\n');
        description += `. ${t('userManagement.toasts.bulkDeletePartial.description', { successCount, plural, failedCount })}:\n${failureDetails}`;
        
        toast({
          title: t('userManagement.toasts.bulkDeletePartial.title'),
          description,
          variant: "destructive",
        });
      }
      
      setBulkDeleteDialogOpen(false);
      setSelectedUserIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('userManagement.toasts.bulkDeleteFailed.title'),
        description: error.message || t('userManagement.toasts.bulkDeleteFailed.description'),
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: { isAdmin?: boolean; role?: string } }) => {
      await apiRequest('PATCH', `/api/admin/users/${userId}`, updates);
    },
    onSuccess: () => {
      toast({
        title: t('userManagement.toasts.userUpdated.title'),
        description: t('userManagement.toasts.userUpdated.description'),
      });
      setRoleDialogOpen(false);
      setSelectedUserForRole(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: t('userManagement.toasts.updateFailed.title'),
        description: error.message || t('userManagement.toasts.updateFailed.description'),
        variant: "destructive",
      });
    },
  });

  // Server-side filtering is now handled in the query
  // filteredUsers is the same as usersWithSchools since filtering is done on the backend
  const filteredUsers = usersWithSchools;

  const handleAssignToSchool = (userEmail: string) => {
    setSelectedUserEmail(userEmail);
    setAssignDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableUserIds = filteredUsers
        .filter(item => item?.user?.id && item.user.id !== user?.id)
        .map(item => item.user.id);
      setSelectedUserIds(new Set(selectableUserIds));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedUserIds);
    if (checked) {
      newSelectedIds.add(userId);
    } else {
      newSelectedIds.delete(userId);
    }
    setSelectedUserIds(newSelectedIds);
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    bulkDeleteMutation.mutate({ userIds: Array.from(selectedUserIds), mode: bulkDeletionMode });
  };

  const confirmDelete = () => {
    if (selectedUserToDelete) {
      deleteUserMutation.mutate({ userId: selectedUserToDelete.id, mode: deletionMode });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message={t('loading.dashboard')} />;
  }

  const handleInviteAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteAdminEmail.trim()) {
      toast({
        title: t('userManagement.toasts.emailRequired.title'),
        description: t('userManagement.toasts.emailRequired.description'),
        variant: "destructive",
      });
      return;
    }
    inviteAdminMutation.mutate(inviteAdminEmail);
  };

  const handleInvitePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePartnerEmail.trim()) {
      toast({
        title: t('userManagement.toasts.emailRequired.title'),
        description: t('userManagement.toasts.emailRequired.description'),
        variant: "destructive",
      });
      return;
    }
    invitePartnerMutation.mutate(invitePartnerEmail);
  };

  return (
    <Card data-refactor-source="UserManagementTab">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('userManagement.title')}
          </CardTitle>
          <div className="flex gap-2">
            {!isPartner && (
              <>
                <Dialog open={invitePartnerDialogOpen} onOpenChange={setInvitePartnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-invite-partner">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('userManagement.buttons.invitePartner')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-invite-partner">
                    <DialogHeader>
                      <DialogTitle>{t('userManagement.dialogs.invitePartner.title')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInvitePartner} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('userManagement.form.labels.emailAddress')}
                        </label>
                        <Input
                          type="email"
                          value={invitePartnerEmail}
                          onChange={(e) => setInvitePartnerEmail(e.target.value)}
                          placeholder={t('userManagement.form.placeholders.partnerEmail')}
                          data-testid="input-partner-email"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {t('userManagement.dialogs.invitePartner.description')}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setInvitePartnerDialogOpen(false);
                            setInvitePartnerEmail('');
                          }}
                          data-testid="button-cancel-partner-invite"
                        >
                          {t('userManagement.buttons.cancel')}
                        </Button>
                        <Button
                          type="submit"
                          disabled={invitePartnerMutation.isPending}
                          className="bg-blue-500 hover:bg-blue-600"
                          data-testid="button-send-partner-invite"
                        >
                          {invitePartnerMutation.isPending ? t('userManagement.buttons.sending') : t('userManagement.buttons.sendInvitation')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={inviteAdminDialogOpen} onOpenChange={setInviteAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-pcs_blue hover:bg-pcs_blue/90" data-testid="button-invite-admin">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('userManagement.buttons.inviteAdmin')}
                    </Button>
                  </DialogTrigger>
            <DialogContent data-testid="dialog-invite-admin">
              <DialogHeader>
                <DialogTitle>{t('userManagement.dialogs.inviteAdmin.title')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('userManagement.form.labels.emailAddress')}
                  </label>
                  <Input
                    type="email"
                    value={inviteAdminEmail}
                    onChange={(e) => setInviteAdminEmail(e.target.value)}
                    placeholder={t('userManagement.form.placeholders.adminEmail')}
                    data-testid="input-admin-email"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setInviteAdminDialogOpen(false);
                      setInviteAdminEmail('');
                    }}
                    data-testid="button-cancel-invite"
                  >
                    {t('userManagement.buttons.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteAdminMutation.isPending}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-send-admin-invite"
                  >
                    {inviteAdminMutation.isPending ? t('userManagement.buttons.sending') : t('userManagement.buttons.sendInvitation')}
                  </Button>
                </div>
              </form>
            </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <MigratedUsersSection />
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('userManagement.form.placeholders.searchUsers')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                data-testid="input-user-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-all"
              >
                {t('userManagement.buttons.filterAll')}
              </Button>
              <Button
                variant={filterStatus === 'with-schools' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('with-schools')}
                className={filterStatus === 'with-schools' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-with-schools"
              >
                {t('userManagement.buttons.filterWithSchools')}
              </Button>
              <Button
                variant={filterStatus === 'without-schools' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('without-schools')}
                className={filterStatus === 'without-schools' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-without-schools"
              >
                {t('userManagement.buttons.filterWithoutSchools')}
              </Button>
              <div className="w-px bg-gray-300"></div>
              <Button
                variant={interactionFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setInteractionFilter('all')}
                className={interactionFilter === 'all' ? 'bg-pcs_teal hover:bg-pcs_teal/90' : ''}
                data-testid="button-filter-all-interaction"
              >
                All Users
              </Button>
              <Button
                variant={interactionFilter === 'interacted' ? 'default' : 'outline'}
                onClick={() => setInteractionFilter('interacted')}
                className={interactionFilter === 'interacted' ? 'bg-pcs_teal hover:bg-pcs_teal/90' : ''}
                data-testid="button-filter-interacted"
              >
                Interacted
              </Button>
              <Button
                variant={interactionFilter === 'not-interacted' ? 'default' : 'outline'}
                onClick={() => setInteractionFilter('not-interacted')}
                className={interactionFilter === 'not-interacted' ? 'bg-pcs_teal hover:bg-pcs_teal/90' : ''}
                data-testid="button-filter-not-interacted"
              >
                Not Interacted
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {pagination ? (
                <>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                </>
              ) : (
                `Showing ${filteredUsers.length} users`
              )}
            </div>
            {selectedUserIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('userManagement.buttons.bulkDelete', { count: selectedUserIds.size })}
              </Button>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('userManagement.emptyStates.noUsers.title')}
              description={
                searchQuery
                  ? t('userManagement.emptyStates.noUsers.noMatch')
                  : filterStatus === 'without-schools'
                  ? t('userManagement.emptyStates.noUsers.allAssigned')
                  : t('userManagement.emptyStates.noUsers.noneInSystem')
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="w-12 p-3">
                      <Checkbox
                        checked={
                          filteredUsers.length > 0 &&
                          filteredUsers.filter(item => item?.user?.id !== user?.id).length > 0 &&
                          filteredUsers.filter(item => item?.user?.id !== user?.id).every(item => selectedUserIds.has(item.user.id))
                        }
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.table.headers.name')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.table.headers.email')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.table.headers.role')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.table.headers.schools')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Last Active</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.table.headers.status')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.table.headers.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    // Skip rendering if user data is invalid
                    if (!item || !item.user) return null;
                    
                    const currentUser = item.user;
                    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
                    const canDelete = currentUser.id !== user?.id;

                    return (
                      <tr key={currentUser.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedUserIds.has(currentUser.id)}
                            onCheckedChange={(checked) => handleSelectUser(currentUser.id, checked as boolean)}
                            disabled={!canDelete}
                            data-testid={`checkbox-user-${currentUser.id}`}
                          />
                        </td>
                        <td className="p-3 font-medium text-gray-900" data-testid={`text-user-name-${currentUser.id}`}>
                          {fullName || '-'}
                        </td>
                        <td className="p-3 text-gray-600" data-testid={`text-user-email-${currentUser.id}`}>
                          {currentUser.email}
                        </td>
                        <td className="p-3">
                          {currentUser.isAdmin && currentUser.role === 'admin' ? (
                            <Badge className="bg-red-600 text-white">
                              {t('userManagement.badges.admin')}
                            </Badge>
                          ) : currentUser.role === 'partner' ? (
                            <Badge className="bg-purple-600 text-white">
                              {t('userManagement.badges.partner')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {currentUser.role}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {item.schools.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {item.schools.map((school, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-sm">
                                  <School className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-700">{school.name}</span>
                                  <Badge variant="outline" className="text-xs">{school.role}</Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600" data-testid={`text-last-active-${currentUser.id}`}>
                          {currentUser.lastActiveAt 
                            ? new Date(currentUser.lastActiveAt).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {t('userManagement.badges.active')}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {!isPartner && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" data-testid={`button-actions-${currentUser.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('userManagement.table.headers.actions')}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUserForRole({
                                      id: currentUser.id,
                                      name: fullName,
                                      isAdmin: currentUser.isAdmin,
                                      role: currentUser.role
                                    });
                                    setRoleDialogOpen(true);
                                  }}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('userManagement.form.labels.platformRole')}
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => {
                                        setSelectedUserToDelete({
                                          id: currentUser.id,
                                          name: fullName
                                        });
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {t('userManagement.buttons.confirmDelete', { mode: 'Delete' })}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">
                  Items per page:
                </label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-2 px-4">
                  <span className="text-sm text-gray-600">
                    Page {page} of {pagination.totalPages}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page === pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Invitations Table */}
        {!isPartner && !isLoadingInvitations && adminInvitations.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">{t('userManagement.adminInvitations.title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.adminInvitations.table.email')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.adminInvitations.table.status')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.adminInvitations.table.createdAt')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.adminInvitations.table.expiresAt')}</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">{t('userManagement.adminInvitations.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminInvitations.map((invitation) => (
                    <tr key={invitation.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-900">{invitation.email}</td>
                      <td className="p-3">
                        <Badge variant={invitation.status === 'pending' ? 'secondary' : 'default'}>
                          {invitation.status === 'pending' ? t('userManagement.badges.pendingInvite') : invitation.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">{new Date(invitation.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-gray-600">{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                          disabled={deleteInvitationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete User Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-delete-user">
            <DialogHeader>
              <DialogTitle>{t('userManagement.dialogs.deleteUser.title')}</DialogTitle>
              <DialogDescription>
                {t('userManagement.dialogs.deleteUser.description')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pcs_blue"></div>
                </div>
              ) : deletionPreview && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {t('userManagement.dialogs.deletionPreview.title')}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    {t('userManagement.dialogs.deletionPreview.description')}
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>{t('userManagement.dialogs.deletionPreview.evidence', { count: deletionPreview.evidence })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.caseStudies', { count: deletionPreview.caseStudies })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.reductionPromises', { count: deletionPreview.reductionPromises })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.mediaAssets', { count: deletionPreview.mediaAssets })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.certificates', { count: deletionPreview.certificates })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.importBatches', { count: deletionPreview.importBatches })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.teacherInvitations', { count: deletionPreview.teacherInvitations })}</li>
                    <li>{t('userManagement.dialogs.deletionPreview.adminInvitations', { count: deletionPreview.adminInvitations })}</li>
                  </ul>
                </div>
              )}
              
              <RadioGroup value={deletionMode} onValueChange={(value) => setDeletionMode(value as 'soft' | 'transfer' | 'hard')}>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="soft" id="soft" data-testid="radio-soft-delete" />
                    <Label htmlFor="soft" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">{t('userManagement.deletionModes.soft.label')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('userManagement.deletionModes.soft.description')}
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="transfer" id="transfer" data-testid="radio-transfer-delete" />
                    <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold">{t('userManagement.deletionModes.transfer.label')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('userManagement.deletionModes.transfer.description')}
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                    <RadioGroupItem value="hard" id="hard" data-testid="radio-hard-delete" />
                    <Label htmlFor="hard" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Trash className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-600 dark:text-red-400">{t('userManagement.deletionModes.hard.label')}</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        <strong>WARNING:</strong> {t('userManagement.deletionModes.hard.description')}
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeletionMode('soft');
                }}
                data-testid="button-cancel-delete"
              >
                {t('userManagement.buttons.cancel')}
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteUserMutation.isPending}
                className={deletionMode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? t('userManagement.buttons.deleting') : t('userManagement.buttons.confirmDelete', { 
                  mode: deletionMode === 'soft' ? t('userManagement.buttons.confirmSoftDelete').replace('Confirm ', '') : 
                        deletionMode === 'transfer' ? t('userManagement.buttons.confirmTransfer').replace('Confirm ', '') : 
                        t('userManagement.buttons.confirmHardDelete').replace('Confirm ', '')
                })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent data-testid="dialog-change-role">
            <DialogHeader>
              <DialogTitle>{t('userManagement.dialogs.changeRole.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('userManagement.dialogs.changeRole.description', { name: selectedUserForRole?.name })}
              </p>
              
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <label className="block text-sm font-medium mb-2">{t('userManagement.form.labels.platformRole')}</label>
                  <p className="text-xs text-gray-500 mb-3">{t('userManagement.form.labels.roleDescription')}</p>
                  <Select
                    value={
                      selectedUserForRole?.isAdmin && selectedUserForRole?.role === 'admin' 
                        ? 'admin' 
                        : selectedUserForRole?.role === 'partner' 
                          ? 'partner'
                          : selectedUserForRole?.role === 'school'
                            ? 'school'
                            : 'teacher'
                    }
                    onValueChange={(value) => {
                      if (selectedUserForRole) {
                        if (value === 'admin') {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'admin', isAdmin: true }
                          });
                        } else if (value === 'partner') {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'partner', isAdmin: false }
                          });
                        } else if (value === 'school') {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'school', isAdmin: false }
                          });
                        } else {
                          updateUserRoleMutation.mutate({
                            userId: selectedUserForRole.id,
                            updates: { role: 'teacher', isAdmin: false }
                          });
                        }
                      }
                    }}
                    disabled={updateUserRoleMutation.isPending}
                  >
                    <SelectTrigger data-testid="select-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">{t('userManagement.roles.teacher.label')}</SelectItem>
                      <SelectItem value="school">{t('userManagement.roles.school.label')}</SelectItem>
                      <SelectItem value="partner">{t('userManagement.roles.partner.label')}</SelectItem>
                      <SelectItem value="admin">{t('userManagement.roles.admin.label')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    {selectedUserForRole?.isAdmin && selectedUserForRole?.role === 'admin' ? (
                      <p className="text-gray-600"><strong>{t('userManagement.roles.admin.label')}:</strong> {t('userManagement.roles.admin.description')}</p>
                    ) : selectedUserForRole?.role === 'partner' ? (
                      <p className="text-gray-600"><strong>{t('userManagement.roles.partner.label')}:</strong> {t('userManagement.roles.partner.description')}</p>
                    ) : selectedUserForRole?.role === 'school' ? (
                      <p className="text-gray-600"><strong>{t('userManagement.roles.school.label')}:</strong> {t('userManagement.roles.school.description')}</p>
                    ) : (
                      <p className="text-gray-600"><strong>{t('userManagement.roles.teacher.label')}:</strong> {t('userManagement.roles.teacher.description')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-bulk-delete">
            <DialogHeader>
              <DialogTitle>{t('userManagement.dialogs.bulkDelete.title', { count: selectedUserIds.size, plural: selectedUserIds.size > 1 ? 's' : '' })}</DialogTitle>
              <DialogDescription>
                {t('userManagement.dialogs.bulkDelete.description')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('userManagement.dialogs.bulkDelete.selectedUsers', { count: selectedUserIds.size, plural: selectedUserIds.size > 1 ? 's' : '' })}
                </p>
              </div>
              
              <RadioGroup value={bulkDeletionMode} onValueChange={(value) => setBulkDeletionMode(value as 'soft' | 'transfer' | 'hard')}>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="soft" id="bulk-soft" data-testid="radio-bulk-soft-delete" />
                    <Label htmlFor="bulk-soft" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">{t('userManagement.deletionModes.soft.label')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('userManagement.deletionModes.soft.description')}
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="transfer" id="bulk-transfer" data-testid="radio-bulk-transfer-delete" />
                    <Label htmlFor="bulk-transfer" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold">{t('userManagement.deletionModes.transfer.label')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t('userManagement.deletionModes.transfer.bulkDescription')}
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                    <RadioGroupItem value="hard" id="bulk-hard" data-testid="radio-bulk-hard-delete" />
                    <Label htmlFor="bulk-hard" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Trash className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-600 dark:text-red-400">{t('userManagement.deletionModes.hard.label')}</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        <strong>WARNING:</strong> {t('userManagement.deletionModes.hard.bulkDescription')}
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkDeleteDialogOpen(false);
                  setBulkDeletionMode('soft');
                }}
                data-testid="button-cancel-bulk-delete"
              >
                {t('userManagement.buttons.cancel')}
              </Button>
              <Button
                onClick={confirmBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className={bulkDeletionMode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                data-testid="button-confirm-bulk-delete"
              >
                {bulkDeleteMutation.isPending ? t('userManagement.buttons.deleting') : t('userManagement.buttons.confirmDelete', { 
                  mode: bulkDeletionMode === 'soft' ? t('userManagement.buttons.confirmSoftDelete').replace('Confirm ', '') : 
                        bulkDeletionMode === 'transfer' ? t('userManagement.buttons.confirmTransfer').replace('Confirm ', '') : 
                        t('userManagement.buttons.confirmHardDelete').replace('Confirm ', '')
                })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
