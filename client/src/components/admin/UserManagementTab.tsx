import { useState } from "react";
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

interface UserWithSchools {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isAdmin: boolean;
    createdAt: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-schools' | 'without-schools'>('all');
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

  const { data: usersWithSchools = [], isLoading } = useQuery<UserWithSchools[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: deletionPreview, isLoading: isLoadingPreview } = useQuery<DeletionPreview>({
    queryKey: ['/api/admin/users', selectedUserToDelete?.id, 'deletion-preview'],
    enabled: !!selectedUserToDelete?.id && deleteDialogOpen,
  });

  const inviteAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/admin/invite-admin', { email });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Admin invitation has been sent successfully.",
      });
      setInviteAdminDialogOpen(false);
      setInviteAdminEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send admin invitation. Please try again.",
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
        title: "Invitation Sent",
        description: "Partner invitation has been sent successfully.",
      });
      setInvitePartnerDialogOpen(false);
      setInvitePartnerEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send partner invitation. Please try again.",
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
        soft: 'soft deleted',
        transfer: 'deleted (content transferred)',
        hard: 'permanently deleted'
      };
      toast({
        title: "User Deleted",
        description: `The user has been successfully ${modeLabels[variables.mode]}.`,
      });
      setDeleteDialogOpen(false);
      setSelectedUserToDelete(null);
      setDeletionMode('soft');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to delete user. Please try again.";
      toast({
        title: "Delete Failed",
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
        description = `Successfully deleted ${successCount} user${successCount > 1 ? 's' : ''}`;
        
        if (totalEvidenceDeleted > 0) {
          description += ` (${totalEvidenceDeleted} evidence item${totalEvidenceDeleted > 1 ? 's' : ''} deleted)`;
        }
        
        if (affectedCaseStudies && affectedCaseStudies.length > 0) {
          description += `. Warning: ${affectedCaseStudies.length} case ${affectedCaseStudies.length > 1 ? 'studies were' : 'study was'} affected`;
          
          if (affectedCaseStudies.length <= 3) {
            const titles = affectedCaseStudies.map((cs: any) => cs.title).join(', ');
            description += ` (${titles})`;
          }
          
          description += ' and their creators have been removed.';
        } else {
          description += '.';
        }
        
        toast({
          title: "Bulk Delete Successful",
          description,
        });
      } else if (successCount === 0) {
        // All failed
        const failureDetails = failures.map((f: any) => `${f.email}: ${f.reason}`).join('\n');
        toast({
          title: "Bulk Delete Failed",
          description: `Failed to delete all selected users:\n${failureDetails}`,
          variant: "destructive",
        });
      } else {
        // Partial success
        description = `Successfully deleted ${successCount} user${successCount > 1 ? 's' : ''}`;
        
        if (totalEvidenceDeleted > 0) {
          description += ` (${totalEvidenceDeleted} evidence item${totalEvidenceDeleted > 1 ? 's' : ''} deleted)`;
        }
        
        if (affectedCaseStudies && affectedCaseStudies.length > 0) {
          description += `. Warning: ${affectedCaseStudies.length} case ${affectedCaseStudies.length > 1 ? 'studies were' : 'study was'} affected`;
          
          if (affectedCaseStudies.length <= 3) {
            const titles = affectedCaseStudies.map((cs: any) => cs.title).join(', ');
            description += ` (${titles})`;
          }
        }
        
        description += `. Failed to delete ${failedCount}`;
        
        const failureDetails = failures.map((f: any) => `${f.email}: ${f.reason}`).join('\n');
        description += `:\n${failureDetails}`;
        
        toast({
          title: "Bulk Delete Partially Successful",
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
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete users. Please try again.",
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
        title: "User Updated",
        description: "User role has been successfully updated.",
      });
      setRoleDialogOpen(false);
      setSelectedUserForRole(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update user role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = usersWithSchools.filter((item) => {
    const user = item.user;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());

    if (filterStatus === 'with-schools') {
      return matchesSearch && item.schools.length > 0;
    } else if (filterStatus === 'without-schools') {
      return matchesSearch && item.schools.length === 0;
    }
    return matchesSearch;
  });

  const handleAssignToSchool = (userEmail: string) => {
    setSelectedUserEmail(userEmail);
    setAssignDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableUserIds = filteredUsers
        .filter(item => item.user.id !== user?.id)
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
    return <LoadingSpinner message="Loading users..." />;
  }

  const handleInviteAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteAdminEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
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
        title: "Email Required",
        description: "Please enter an email address.",
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
            User Management
          </CardTitle>
          <div className="flex gap-2">
            {!isPartner && (
              <>
                <Dialog open={invitePartnerDialogOpen} onOpenChange={setInvitePartnerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-invite-partner">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Partner
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-invite-partner">
                    <DialogHeader>
                      <DialogTitle>Invite New Partner</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInvitePartner} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={invitePartnerEmail}
                          onChange={(e) => setInvitePartnerEmail(e.target.value)}
                          placeholder="partner@example.com"
                          data-testid="input-partner-email"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Partners have admin-like access but cannot assign roles or download school data.
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
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={invitePartnerMutation.isPending}
                          className="bg-blue-500 hover:bg-blue-600"
                          data-testid="button-send-partner-invite"
                        >
                          {invitePartnerMutation.isPending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={inviteAdminDialogOpen} onOpenChange={setInviteAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="bg-pcs_blue hover:bg-pcs_blue/90" data-testid="button-invite-admin">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Admin
                    </Button>
                  </DialogTrigger>
            <DialogContent data-testid="dialog-invite-admin">
              <DialogHeader>
                <DialogTitle>Invite New Administrator</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInviteAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={inviteAdminEmail}
                    onChange={(e) => setInviteAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteAdminMutation.isPending}
                    className="bg-pcs_blue hover:bg-pcs_blue/90"
                    data-testid="button-send-admin-invite"
                  >
                    {inviteAdminMutation.isPending ? 'Sending...' : 'Send Invitation'}
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
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
                data-testid="input-user-search"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-all"
              >
                All Users
              </Button>
              <Button
                variant={filterStatus === 'with-schools' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('with-schools')}
                className={filterStatus === 'with-schools' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-with-schools"
              >
                With Schools
              </Button>
              <Button
                variant={filterStatus === 'without-schools' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('without-schools')}
                className={filterStatus === 'without-schools' ? 'bg-pcs_blue hover:bg-pcs_blue/90' : ''}
                data-testid="button-filter-without-schools"
              >
                Without Schools
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <strong>{filteredUsers.length}</strong> of <strong>{usersWithSchools.length}</strong> users
            </div>
            {selectedUserIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected Users ({selectedUserIds.size})
              </Button>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Users Found"
              description={
                searchQuery
                  ? "No users match your search criteria."
                  : filterStatus === 'without-schools'
                  ? "All users are assigned to at least one school."
                  : "No users found in the system."
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
                          filteredUsers.filter(item => item.user.id !== user?.id).length > 0 &&
                          filteredUsers.filter(item => item.user.id !== user?.id).every(item => selectedUserIds.has(item.user.id))
                        }
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">School Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const userItem = item.user;
                    const schoolCount = item.schools.length;
                    const isCurrentUser = userItem.id === user?.id;
                    const isChecked = selectedUserIds.has(userItem.id);
                    return (
                      <tr 
                        key={userItem.id} 
                        className="border-b border-gray-200 hover:bg-gray-50"
                        data-testid={`user-row-${userItem.id}`}
                      >
                        <td className="p-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => handleSelectUser(userItem.id, checked as boolean)}
                            disabled={isCurrentUser}
                            data-testid={`checkbox-user-${userItem.id}`}
                          />
                        </td>
                        <td className="p-3 text-sm" data-testid={`text-user-name-${userItem.id}`}>
                          <div className="font-medium text-gray-900">
                            {userItem.firstName} {userItem.lastName}
                          </div>
                          {userItem.isAdmin && userItem.role === 'admin' && (
                            <Badge className="mt-1 bg-purple-500 text-white text-xs">Admin</Badge>
                          )}
                          {userItem.role === 'partner' && (
                            <Badge className="mt-1 bg-blue-500 text-white text-xs">Partner</Badge>
                          )}
                          {userItem.role === 'school' && (
                            <Badge className="mt-1 bg-green-500 text-white text-xs">School</Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600" data-testid={`text-user-email-${userItem.id}`}>
                          {userItem.email}
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline" data-testid={`text-user-role-${userItem.id}`}>
                            {userItem.role === 'admin' && userItem.isAdmin ? 'Admin' : 
                             userItem.role === 'partner' ? 'Partner' : 
                             userItem.role === 'school' ? 'School' :
                             userItem.role === 'teacher' ? 'Teacher' : userItem.role}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm" data-testid={`text-user-school-status-${userItem.id}`}>
                          {schoolCount === 0 ? (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              No School
                            </Badge>
                          ) : schoolCount === 1 ? (
                            <Badge className="bg-green-500 text-white">
                              1 School
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500 text-white">
                              {schoolCount} Schools
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          <div className="flex gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`button-user-actions-${userItem.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAssignToSchool(userItem.email || '')}
                                  data-testid={`menu-assign-school-${userItem.id}`}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  {schoolCount === 0 ? 'Assign to School' : 'Assign to Another School'}
                                </DropdownMenuItem>
                                {schoolCount > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        data-testid={`menu-view-schools-${userItem.id}`}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Schools
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent data-testid={`dialog-user-schools-${userItem.id}`}>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Schools for {userItem.firstName} {userItem.lastName}
                                        </DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-3">
                                        {item.schools.map((school) => (
                                          <div 
                                            key={school.id} 
                                            className="p-3 border rounded-lg flex items-center justify-between"
                                            data-testid={`school-item-${school.id}`}
                                          >
                                            <div>
                                              <div className="font-medium">{school.name}</div>
                                              <div className="text-sm text-gray-600">
                                                Role: {school.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                                              </div>
                                            </div>
                                            <School className="h-5 w-5 text-gray-400" />
                                          </div>
                                        ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                {!isPartner && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUserForRole({
                                        id: userItem.id,
                                        name: `${userItem.firstName} ${userItem.lastName}`,
                                        isAdmin: userItem.isAdmin,
                                        role: userItem.role,
                                      });
                                      setRoleDialogOpen(true);
                                    }}
                                    data-testid={`menu-change-role-${userItem.id}`}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUserToDelete({
                                      id: userItem.id,
                                      name: `${userItem.firstName} ${userItem.lastName}`,
                                    });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                  data-testid={`menu-delete-user-${userItem.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-assign-teacher">
            <DialogHeader>
              <DialogTitle>Assign User to School</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <AssignTeacherForm />
              {selectedUserEmail && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Pre-filled email:</strong> {selectedUserEmail}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Enter this email in the form above to assign this user to a school.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="dialog-delete-user">
            <DialogHeader>
              <DialogTitle>Delete User: {selectedUserToDelete?.name}</DialogTitle>
              <DialogDescription>
                Choose how to handle this user's content and data
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner message="Loading deletion preview..." />
                </div>
              ) : deletionPreview && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-3">Affected Content:</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {deletionPreview.evidence > 0 && (
                      <div>Evidence Submissions: <strong>{deletionPreview.evidence}</strong></div>
                    )}
                    {deletionPreview.caseStudies > 0 && (
                      <div>Case Studies: <strong>{deletionPreview.caseStudies}</strong></div>
                    )}
                    {deletionPreview.mediaAssets > 0 && (
                      <div>Media Assets: <strong>{deletionPreview.mediaAssets}</strong></div>
                    )}
                    {deletionPreview.certificates > 0 && (
                      <div>Certificates: <strong>{deletionPreview.certificates}</strong></div>
                    )}
                    {deletionPreview.importBatches > 0 && (
                      <div>Import Batches: <strong>{deletionPreview.importBatches}</strong></div>
                    )}
                    {deletionPreview.teacherInvitations > 0 && (
                      <div>Teacher Invitations: <strong>{deletionPreview.teacherInvitations}</strong></div>
                    )}
                    {deletionPreview.adminInvitations > 0 && (
                      <div>Admin Invitations: <strong>{deletionPreview.adminInvitations}</strong></div>
                    )}
                    {deletionPreview.reductionPromises > 0 && (
                      <div>Reduction Promises: <strong>{deletionPreview.reductionPromises}</strong></div>
                    )}
                  </div>
                </div>
              )}
              
              <RadioGroup value={deletionMode} onValueChange={(value) => setDeletionMode(value as 'soft' | 'transfer' | 'hard')}>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="soft" id="soft" data-testid="radio-soft-delete" />
                    <Label htmlFor="soft" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">Soft Delete (Recommended)</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        User will be hidden from the system but all data is preserved. Can be restored later.
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="transfer" id="transfer" data-testid="radio-transfer-delete" />
                    <Label htmlFor="transfer" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold">Transfer Ownership</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Transfer all content to "Archived User" system account, then delete the user. Historical data is preserved.
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                    <RadioGroupItem value="hard" id="hard" data-testid="radio-hard-delete" />
                    <Label htmlFor="hard" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Trash className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-600 dark:text-red-400">Hard Delete (Permanent)</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        <strong>WARNING:</strong> Permanently delete user AND all their content. This cannot be undone!
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
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deleteUserMutation.isPending}
                className={deletionMode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : `Confirm ${deletionMode === 'soft' ? 'Soft Delete' : deletionMode === 'transfer' ? 'Transfer' : 'Hard Delete'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent data-testid="dialog-change-role">
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Update the role and permissions for <strong>{selectedUserForRole?.name}</strong>
              </p>
              
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <label className="block text-sm font-medium mb-2">Platform Role</label>
                  <p className="text-xs text-gray-500 mb-3">Select the user's role and permissions</p>
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
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="school">School (Head Teacher)</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    {selectedUserForRole?.isAdmin && selectedUserForRole?.role === 'admin' ? (
                      <p className="text-gray-600"><strong>Admin:</strong> Full platform access including role assignment and data downloads</p>
                    ) : selectedUserForRole?.role === 'partner' ? (
                      <p className="text-gray-600"><strong>Partner:</strong> Admin-like access but cannot assign roles or download school data</p>
                    ) : selectedUserForRole?.role === 'school' ? (
                      <p className="text-gray-600"><strong>School:</strong> Head teacher role with school management permissions</p>
                    ) : (
                      <p className="text-gray-600"><strong>Teacher:</strong> Standard user with school-level permissions</p>
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
              <DialogTitle>Bulk Delete {selectedUserIds.size} User{selectedUserIds.size > 1 ? 's' : ''}</DialogTitle>
              <DialogDescription>
                Choose how to handle the selected users' content and data
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Selected Users:</strong> {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''}
                </p>
              </div>
              
              <RadioGroup value={bulkDeletionMode} onValueChange={(value) => setBulkDeletionMode(value as 'soft' | 'transfer' | 'hard')}>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="soft" id="bulk-soft" data-testid="radio-bulk-soft-delete" />
                    <Label htmlFor="bulk-soft" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">Soft Delete (Recommended)</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Users will be hidden from the system but all data is preserved. Can be restored later.
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <RadioGroupItem value="transfer" id="bulk-transfer" data-testid="radio-bulk-transfer-delete" />
                    <Label htmlFor="bulk-transfer" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        <span className="font-semibold">Transfer Ownership</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Transfer all content to "Archived User" system account, then delete the users. Historical data is preserved.
                      </p>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer">
                    <RadioGroupItem value="hard" id="bulk-hard" data-testid="radio-bulk-hard-delete" />
                    <Label htmlFor="bulk-hard" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Trash className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-600 dark:text-red-400">Hard Delete (Permanent)</span>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        <strong>WARNING:</strong> Permanently delete users AND all their content. This cannot be undone!
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
                Cancel
              </Button>
              <Button
                onClick={confirmBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className={bulkDeletionMode === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                data-testid="button-confirm-bulk-delete"
              >
                {bulkDeleteMutation.isPending ? 'Deleting...' : `Confirm ${bulkDeletionMode === 'soft' ? 'Soft Delete' : bulkDeletionMode === 'transfer' ? 'Transfer' : 'Hard Delete'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
