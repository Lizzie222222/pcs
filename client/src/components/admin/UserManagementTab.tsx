import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<{ id: string; name: string; isAdmin: boolean; role: string } | null>(null);

  const isPartner = user?.role === 'partner';

  const { data: usersWithSchools = [], isLoading } = useQuery<UserWithSchools[]>({
    queryKey: ['/api/admin/users'],
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
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete user. Please try again.",
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

          <div className="text-sm text-gray-600">
            Showing <strong>{filteredUsers.length}</strong> of <strong>{usersWithSchools.length}</strong> users
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
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">School Status</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const user = item.user;
                    const schoolCount = item.schools.length;
                    return (
                      <tr 
                        key={user.id} 
                        className="border-b border-gray-200 hover:bg-gray-50"
                        data-testid={`user-row-${user.id}`}
                      >
                        <td className="p-3 text-sm" data-testid={`text-user-name-${user.id}`}>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.isAdmin && user.role === 'admin' && (
                            <Badge className="mt-1 bg-purple-500 text-white text-xs">Admin</Badge>
                          )}
                          {user.role === 'partner' && (
                            <Badge className="mt-1 bg-blue-500 text-white text-xs">Partner</Badge>
                          )}
                          {user.role === 'school' && (
                            <Badge className="mt-1 bg-green-500 text-white text-xs">School</Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600" data-testid={`text-user-email-${user.id}`}>
                          {user.email}
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline" data-testid={`text-user-role-${user.id}`}>
                            {user.role === 'admin' && user.isAdmin ? 'Admin' : 
                             user.role === 'partner' ? 'Partner' : 
                             user.role === 'school' ? 'School' :
                             user.role === 'teacher' ? 'Teacher' : user.role}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm" data-testid={`text-user-school-status-${user.id}`}>
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
                                  data-testid={`button-user-actions-${user.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAssignToSchool(user.email || '')}
                                  data-testid={`menu-assign-school-${user.id}`}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  {schoolCount === 0 ? 'Assign to School' : 'Assign to Another School'}
                                </DropdownMenuItem>
                                {schoolCount > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        data-testid={`menu-view-schools-${user.id}`}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Schools
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                    <DialogContent data-testid={`dialog-user-schools-${user.id}`}>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Schools for {user.firstName} {user.lastName}
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
                                        id: user.id,
                                        name: `${user.firstName} ${user.lastName}`,
                                        isAdmin: user.isAdmin,
                                        role: user.role,
                                      });
                                      setRoleDialogOpen(true);
                                    }}
                                    data-testid={`menu-change-role-${user.id}`}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Change Role
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUserToDelete({
                                      id: user.id,
                                      name: `${user.firstName} ${user.lastName}`,
                                    });
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 focus:text-red-600"
                                  data-testid={`menu-delete-user-${user.id}`}
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-user">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selectedUserToDelete?.name}</strong>? 
                This action cannot be undone and will remove all user data including school associations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedUserToDelete) {
                    deleteUserMutation.mutate(selectedUserToDelete.id);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
      </CardContent>
    </Card>
  );
}
