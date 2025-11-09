import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui/states";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Trash2,
  Clock,
  Send
} from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  userId: string;
  role: 'head_teacher' | 'teacher';
  createdAt: string;
  isVerified: boolean;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface VerificationRequest {
  id: string;
  userId: string;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

interface DashboardData {
  school: {
    id: string;
    name: string;
  };
  schoolUser?: {
    role: string;
  };
}

export default function TeamManagement() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [activeTab, setActiveTab] = useState("members");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  // Get schoolId from dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
    retry: false,
  });

  const schoolId = dashboardData?.school?.id;

  // Handle tab query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const tab = urlParams.get('tab');
    if (tab === 'requests') {
      setActiveTab('requests');
    }
  }, [searchParams]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access team management.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation, toast]);

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/schools', schoolId, 'team'],
    enabled: !!schoolId,
    retry: false,
  });

  // Fetch verification requests
  const { data: verificationRequests = [], isLoading: requestsLoading } = useQuery<VerificationRequest[]>({
    queryKey: ['/api/schools', schoolId, 'verification-requests'],
    enabled: !!schoolId,
    retry: false,
  });

  // Fetch invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ['/api/schools', schoolId, 'invitations'],
    enabled: !!schoolId,
    retry: false,
  });

  // Filter pending requests
  const pendingRequests = verificationRequests.filter(r => r.status === 'pending');
  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  // Remove teacher mutation
  const removeTeacherMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/schools/${schoolId}/teachers/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Teacher Removed",
        description: "The teacher has been removed from your school.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId, 'team'] });
      setRemoveDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove teacher.",
        variant: "destructive",
      });
    },
  });

  // Approve request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await apiRequest('PUT', `/api/verification-requests/${id}/approve`, { reviewNotes: notes });
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "The teacher has been added to your school.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId, 'verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId, 'team'] });
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request.",
        variant: "destructive",
      });
    },
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await apiRequest('PUT', `/api/verification-requests/${id}/reject`, { reviewNotes: notes });
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The verification request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId, 'verification-requests'] });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request.",
        variant: "destructive",
      });
    },
  });

  // Invite teacher mutation
  const inviteTeacherMutation = useMutation({
    mutationFn: async ({ email, message }: { email: string; message?: string }) => {
      return await apiRequest('POST', `/api/schools/${schoolId}/invite-teacher`, { email, message });
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent!",
        description: "The teacher invitation has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/schools', schoolId, 'invitations'] });
      setInviteEmail("");
      setInviteMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveTeacher = (member: TeamMember) => {
    setSelectedMember(member);
    setRemoveDialogOpen(true);
  };

  const handleApproveRequest = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleRejectRequest = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }
    inviteTeacherMutation.mutate({ 
      email: inviteEmail, 
      message: inviteMessage 
    });
  };

  if (authLoading || dashboardLoading) {
    return <LoadingSpinner message="Loading team management..." />;
  }

  if (!schoolId) {
    return <ErrorState error="No school found. Please register your school first." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2" data-testid="text-page-title">
            Team management
          </h1>
          <p className="text-gray-600" data-testid="text-page-description">
            Manage your school's team members, review access requests, and invite new teachers
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="tabs-team-management">
            <TabsTrigger value="members" data-testid="tab-members">
              <Users className="h-4 w-4 mr-2" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">
              <Clock className="h-4 w-4 mr-2" />
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2" data-testid="badge-requests-count">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invite" data-testid="tab-invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Teacher
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Team Members */}
          <TabsContent value="members" data-testid="content-members">
            <Card>
              <CardHeader>
                <CardTitle className="text-navy flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <LoadingSpinner message="Loading team members..." />
                ) : teamMembers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No Team Members"
                    description="Your school doesn't have any team members yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-team-members">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-3 font-medium text-gray-900">Name</th>
                          <th className="text-left p-3 font-medium text-gray-900">Email</th>
                          <th className="text-left p-3 font-medium text-gray-900">Role</th>
                          <th className="text-left p-3 font-medium text-gray-900">Join Date</th>
                          <th className="text-left p-3 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="border-b hover:bg-gray-50" data-testid={`row-member-${member.userId}`}>
                            <td className="p-3" data-testid={`text-member-name-${member.userId}`}>
                              <div className="font-medium text-navy">
                                {member.user?.firstName && member.user?.lastName
                                  ? `${member.user.firstName} ${member.user.lastName}`
                                  : member.user?.email || 'Unknown User'}
                              </div>
                            </td>
                            <td className="p-3 text-gray-600" data-testid={`text-member-email-${member.userId}`}>
                              {member.user?.email || 'N/A'}
                            </td>
                            <td className="p-3">
                              <Badge 
                                className={member.role === 'head_teacher' ? 'bg-pcs_blue text-white' : 'bg-teal text-white'}
                                data-testid={`badge-member-role-${member.userId}`}
                              >
                                {member.role === 'head_teacher' ? 'Head Teacher' : 'Teacher'}
                              </Badge>
                            </td>
                            <td className="p-3 text-gray-600" data-testid={`text-member-date-${member.userId}`}>
                              {member.createdAt ? format(new Date(member.createdAt), 'MMM dd, yyyy') : 'N/A'}
                            </td>
                            <td className="p-3">
                              {member.userId !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="bg-coral hover:bg-coral/90"
                                  onClick={() => handleRemoveTeacher(member)}
                                  data-testid={`button-remove-${member.userId}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Remove
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Pending Requests */}
          <TabsContent value="requests" data-testid="content-requests">
            <Card>
              <CardHeader>
                <CardTitle className="text-navy flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Verification Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <LoadingSpinner message="Loading requests..." />
                ) : pendingRequests.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle}
                    title="No Pending Requests"
                    description="There are no verification requests waiting for your review."
                  />
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div 
                        key={request.id} 
                        className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                        data-testid={`card-request-${request.id}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-navy" data-testid={`text-request-name-${request.id}`}>
                                {request.user.firstName && request.user.lastName
                                  ? `${request.user.firstName} ${request.user.lastName}`
                                  : 'Unknown User'}
                              </h3>
                              <Badge variant="outline" className="bg-yellow/10 text-yellow border-yellow">
                                Pending
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2" data-testid={`text-request-email-${request.id}`}>
                              <Mail className="h-3 w-3 inline mr-1" />
                              {request.user.email}
                            </div>
                            <div className="text-sm text-gray-500 mb-3" data-testid={`text-request-date-${request.id}`}>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {request.createdAt ? format(new Date(request.createdAt), 'MMM dd, yyyy') : 'N/A'}
                            </div>
                            <div className="bg-gray-50 p-3 rounded-md" data-testid={`text-request-evidence-${request.id}`}>
                              <p className="text-sm text-gray-700 font-medium mb-1">Evidence/Reason:</p>
                              <p className="text-sm text-gray-600">{request.evidence}</p>
                            </div>
                          </div>
                          <div className="flex md:flex-col gap-2">
                            <Button
                              className="bg-pcs_blue hover:bg-pcs_blue/90 flex-1 md:flex-none"
                              onClick={() => handleApproveRequest(request)}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              className="bg-coral hover:bg-coral/90 flex-1 md:flex-none"
                              onClick={() => handleRejectRequest(request)}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Invitations Section */}
                {pendingInvitations.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-navy mb-4">Pending Invitations</h3>
                    <div className="space-y-2">
                      {pendingInvitations.map((invitation) => (
                        <div 
                          key={invitation.id} 
                          className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200"
                          data-testid={`card-invitation-${invitation.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-pcs_blue" />
                            <div>
                              <p className="text-sm font-medium text-navy" data-testid={`text-invitation-email-${invitation.id}`}>
                                {invitation.email}
                              </p>
                              <p className="text-xs text-gray-500" data-testid={`text-invitation-date-${invitation.id}`}>
                                Sent {invitation.createdAt ? format(new Date(invitation.createdAt), 'MMM dd, yyyy') : 'N/A'} • 
                                Expires {invitation.expiresAt ? format(new Date(invitation.expiresAt), 'MMM dd, yyyy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-pcs_blue border-pcs_blue">
                            Pending
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Invite Teacher */}
          <TabsContent value="invite" data-testid="content-invite">
            <Card>
              <CardHeader>
                <CardTitle className="text-navy flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite Teacher
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteSubmit} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teacher@example.com"
                      required
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message (Optional)
                    </label>
                    <Textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Add a personal message to your invitation..."
                      rows={4}
                      data-testid="textarea-invite-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-pcs_blue hover:bg-pcs_blue/90 w-full md:w-auto"
                    disabled={inviteTeacherMutation.isPending}
                    data-testid="button-send-invitation"
                  >
                    {inviteTeacherMutation.isPending ? (
                      <>
                        <ButtonSpinner size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Remove Teacher Dialog */}
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent data-testid="dialog-remove-teacher">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Teacher</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{' '}
                <strong>
                  {selectedMember?.user?.firstName && selectedMember?.user?.lastName
                    ? `${selectedMember.user.firstName} ${selectedMember.user.lastName}`
                    : selectedMember?.user?.email || 'this user'}
                </strong>{' '}
                from your school? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedMember && removeTeacherMutation.mutate(selectedMember.userId)}
                className="bg-coral hover:bg-coral/90"
                data-testid="button-confirm-remove"
              >
                Remove Teacher
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Approve Request Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent data-testid="dialog-approve-request">
            <DialogHeader>
              <DialogTitle>Approve Access Request</DialogTitle>
              <DialogDescription>
                You are about to approve the access request from{' '}
                <strong>
                  {selectedRequest?.user.firstName && selectedRequest?.user.lastName
                    ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}`
                    : selectedRequest?.user.email}
                </strong>
                . They will be added to your school as a teacher.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes for the requester..."
                  rows={3}
                  data-testid="textarea-approve-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setApproveDialogOpen(false);
                  setReviewNotes("");
                }}
                data-testid="button-cancel-approve"
              >
                Cancel
              </Button>
              <Button
                className="bg-pcs_blue hover:bg-pcs_blue/90"
                onClick={() => selectedRequest && approveRequestMutation.mutate({ 
                  id: selectedRequest.id, 
                  notes: reviewNotes || undefined 
                })}
                disabled={approveRequestMutation.isPending}
                data-testid="button-confirm-approve"
              >
                {approveRequestMutation.isPending ? 'Approving...' : 'Approve Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Request Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent data-testid="dialog-reject-request">
            <DialogHeader>
              <DialogTitle>Reject Access Request</DialogTitle>
              <DialogDescription>
                You are about to reject the access request from{' '}
                <strong>
                  {selectedRequest?.user.firstName && selectedRequest?.user.lastName
                    ? `${selectedRequest.user.firstName} ${selectedRequest.user.lastName}`
                    : selectedRequest?.user.email}
                </strong>
                . Please provide feedback for the requester.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback *
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Please explain why this request is being rejected..."
                  rows={4}
                  required
                  data-testid="textarea-reject-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setReviewNotes("");
                }}
                data-testid="button-cancel-reject"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="bg-coral hover:bg-coral/90"
                onClick={() => selectedRequest && rejectRequestMutation.mutate({ 
                  id: selectedRequest.id, 
                  notes: reviewNotes 
                })}
                disabled={rejectRequestMutation.isPending || !reviewNotes.trim()}
                data-testid="button-confirm-reject"
              >
                {rejectRequestMutation.isPending ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
