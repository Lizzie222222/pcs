import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Merge, 
  RefreshCw, 
  Eye,
  Mail,
  MapPin,
  Users,
  FileText,
  Award,
  ChevronDown,
  ChevronUp,
  School,
  ArrowRight,
  UserCheck,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface School {
  id: string;
  name: string;
  adminEmail: string | null;
  country: string;
  address: string | null;
  postcode: string | null;
  zipCode: string | null;
  studentCount: number | null;
  currentStage: string | null;
  progressPercentage: number | null;
  awardCompleted: boolean | null;
  createdAt: string;
  evidenceCount: number;
  teamMemberCount: number;
  certificateCount?: number;
  primaryContactEmail: string | null;
  primaryContactName?: string | null;
}

interface DuplicateGroup {
  id: string;
  matchType: 'email_domain' | 'similar_name' | 'same_postcode';
  matchValue: string;
  schoolIds: string[];
  status: 'new' | 'reviewed' | 'dismissed' | 'merged';
  notes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  schoolDetails: School[];
}

interface DuplicateCounts {
  new: number;
  reviewed: number;
  dismissed: number;
  merged: number;
  total: number;
}

interface MergePreviewUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  lastActiveAt: Date | null;
}

interface DuplicateUserPair {
  targetUser: MergePreviewUser;
  sourceUser: MergePreviewUser;
  matchReason: string;
  recommendedSurvivor: 'target' | 'source';
}

interface MergePreview {
  targetSchool: School | undefined;
  sourceSchool: School | undefined;
  targetUsers: MergePreviewUser[];
  sourceUsers: MergePreviewUser[];
  duplicateUsers: DuplicateUserPair[];
  nonDuplicateSourceUsers: MergePreviewUser[];
}

interface DuplicateUserMergeSelection {
  pairIndex: number;
  shouldMerge: boolean;
  survivorId: string;
}

export default function DuplicateSchoolsManager() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("new");
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [mergeOptions, setMergeOptions] = useState({
    targetSchoolId: "",
    sourceSchoolId: "",
    useTargetName: true,
    useTargetAddress: true,
    useTargetStudentCount: true,
  });
  const [duplicateUserSelections, setDuplicateUserSelections] = useState<DuplicateUserMergeSelection[]>([]);
  const [isMergingUsers, setIsMergingUsers] = useState(false);

  const { data: counts } = useQuery<DuplicateCounts>({
    queryKey: ['/api/admin/duplicates/counts'],
  });

  const { data: groups, isLoading } = useQuery<DuplicateGroup[]>({
    queryKey: ['/api/admin/duplicates', statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/duplicates?status=${statusFilter}`, { 
        credentials: 'include' 
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  const { data: mergePreview, isLoading: isMergePreviewLoading, refetch: refetchMergePreview } = useQuery<MergePreview>({
    queryKey: ['/api/admin/duplicates/merge-preview', mergeOptions.targetSchoolId, mergeOptions.sourceSchoolId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/duplicates/merge-preview?targetSchoolId=${mergeOptions.targetSchoolId}&sourceSchoolId=${mergeOptions.sourceSchoolId}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: mergeDialogOpen && !!mergeOptions.targetSchoolId && !!mergeOptions.sourceSchoolId,
  });

  useEffect(() => {
    if (mergePreview?.duplicateUsers) {
      const initialSelections = mergePreview.duplicateUsers.map((pair, index) => ({
        pairIndex: index,
        shouldMerge: true,
        survivorId: pair.recommendedSurvivor === 'target' ? pair.targetUser.id : pair.sourceUser.id,
      }));
      setDuplicateUserSelections(initialSelections);
    }
  }, [mergePreview?.duplicateUsers]);

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/duplicates/scan');
      return res.json();
    },
    onSuccess: (data: { emailDomainGroups: number; postcodeGroups: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates/counts'] });
      toast({
        title: "Scan Complete",
        description: `Found ${data.emailDomainGroups} email domain groups and ${data.postcodeGroups} postcode groups.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async ({ groupId, notes }: { groupId: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/admin/duplicates/${groupId}/dismiss`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates/counts'] });
      setDismissDialogOpen(false);
      setSelectedGroup(null);
      setNotes("");
      toast({ title: "Dismissed", description: "Duplicate group has been dismissed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const mergeUsersMutation = useMutation({
    mutationFn: async ({ survivorUserId, duplicateUserId }: { survivorUserId: string; duplicateUserId: string }) => {
      const res = await apiRequest('POST', '/api/admin/users/merge', { survivorUserId, duplicateUserId });
      return res.json();
    },
    onError: (error: Error) => {
      toast({ title: "Error merging users", description: error.message, variant: "destructive" });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ groupId, targetSchoolId, sourceSchoolId, options }: { 
      groupId: string; 
      targetSchoolId: string; 
      sourceSchoolId: string; 
      options: typeof mergeOptions;
    }) => {
      const res = await apiRequest('POST', `/api/admin/duplicates/${groupId}/merge`, {
        targetSchoolId,
        sourceSchoolId,
        mergeOptions: {
          useTargetName: options.useTargetName,
          useTargetAddress: options.useTargetAddress,
          useTargetStudentCount: options.useTargetStudentCount,
          notes,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates/counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      setMergeDialogOpen(false);
      setSelectedGroup(null);
      setNotes("");
      setDuplicateUserSelections([]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const mergeAllMutation = useMutation({
    mutationFn: async ({ groupId, targetSchoolId, sourceSchoolIds, options }: { 
      groupId: string; 
      targetSchoolId: string; 
      sourceSchoolIds: string[]; 
      options: typeof mergeOptions;
    }) => {
      const res = await apiRequest('POST', `/api/admin/duplicates/${groupId}/merge-all`, {
        targetSchoolId,
        sourceSchoolIds,
        mergeOptions: {
          useTargetName: options.useTargetName,
          useTargetAddress: options.useTargetAddress,
          useTargetStudentCount: options.useTargetStudentCount,
          notes,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates/counts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      setMergeDialogOpen(false);
      setSelectedGroup(null);
      setNotes("");
      setDuplicateUserSelections([]);
      toast({ 
        title: "Bulk Merge Complete", 
        description: `Successfully merged ${data.mergedCount} school(s) into the target.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ groupId, notes }: { groupId: string; notes?: string }) => {
      const res = await apiRequest('POST', `/api/admin/duplicates/${groupId}/reviewed`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates/counts'] });
      toast({ title: "Marked as Reviewed", description: "Duplicate group has been marked as reviewed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleMergeSchools = async () => {
    if (!selectedGroup) return;

    setIsMergingUsers(true);
    let usersMerged = 0;
    let userMergeErrors = 0;

    try {
      const selectedPairsToMerge = duplicateUserSelections.filter(s => s.shouldMerge);
      
      for (const selection of selectedPairsToMerge) {
        const pair = mergePreview?.duplicateUsers[selection.pairIndex];
        if (!pair) continue;

        const survivorUserId = selection.survivorId;
        const duplicateUserId = survivorUserId === pair.targetUser.id ? pair.sourceUser.id : pair.targetUser.id;

        try {
          await mergeUsersMutation.mutateAsync({ survivorUserId, duplicateUserId });
          usersMerged++;
        } catch {
          userMergeErrors++;
        }
      }

      await mergeMutation.mutateAsync({
        groupId: selectedGroup.id,
        targetSchoolId: mergeOptions.targetSchoolId,
        sourceSchoolId: mergeOptions.sourceSchoolId,
        options: mergeOptions,
      });

      let successMessage = "Schools have been merged successfully.";
      if (usersMerged > 0) {
        successMessage = `Schools merged successfully. ${usersMerged} duplicate user(s) were also merged.`;
      }
      if (userMergeErrors > 0) {
        successMessage += ` (${userMergeErrors} user merge(s) failed)`;
      }

      toast({ 
        title: "Merge Complete", 
        description: successMessage,
      });
    } catch {
    } finally {
      setIsMergingUsers(false);
    }
  };

  const handleMergeAllSchools = async () => {
    if (!selectedGroup) return;

    const sourceSchoolIds = selectedGroup.schoolDetails
      .filter(s => s.id !== mergeOptions.targetSchoolId)
      .map(s => s.id);

    if (sourceSchoolIds.length === 0) {
      toast({ title: "Error", description: "No source schools to merge.", variant: "destructive" });
      return;
    }

    try {
      await mergeAllMutation.mutateAsync({
        groupId: selectedGroup.id,
        targetSchoolId: mergeOptions.targetSchoolId,
        sourceSchoolIds,
        options: mergeOptions,
      });
    } catch {
      // Error is handled by mutation onError
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'email_domain':
        return 'Same Email Domain';
      case 'similar_name':
        return 'Similar Name';
      case 'same_postcode':
        return 'Same Postcode';
      default:
        return matchType;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="destructive" data-testid="badge-status-new">New</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" data-testid="badge-status-reviewed">Reviewed</Badge>;
      case 'dismissed':
        return <Badge variant="outline" data-testid="badge-status-dismissed">Dismissed</Badge>;
      case 'merged':
        return <Badge className="bg-green-500" data-testid="badge-status-merged">Merged</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openMergeDialog = (group: DuplicateGroup) => {
    if (group.schoolDetails.length < 2) {
      toast({
        title: "Cannot Merge",
        description: "Need at least 2 schools to merge.",
        variant: "destructive",
      });
      return;
    }
    setSelectedGroup(group);
    setMergeOptions({
      targetSchoolId: group.schoolDetails[0].id,
      sourceSchoolId: group.schoolDetails[1].id,
      useTargetName: true,
      useTargetAddress: true,
      useTargetStudentCount: true,
    });
    setDuplicateUserSelections([]);
    setMergeDialogOpen(true);
  };

  const openDismissDialog = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setDismissDialogOpen(true);
  };

  const getUserDisplayName = (user: MergePreviewUser) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || 'Unknown User';
  };

  const formatLastActive = (lastActiveAt: Date | null) => {
    if (!lastActiveAt) return 'Never';
    const date = new Date(lastActiveAt);
    return date.toLocaleDateString();
  };

  const toggleDuplicateMerge = (pairIndex: number, shouldMerge: boolean) => {
    setDuplicateUserSelections(prev => 
      prev.map(s => s.pairIndex === pairIndex ? { ...s, shouldMerge } : s)
    );
  };

  const updateSurvivorSelection = (pairIndex: number, survivorId: string) => {
    setDuplicateUserSelections(prev =>
      prev.map(s => s.pairIndex === pairIndex ? { ...s, survivorId } : s)
    );
  };

  const selectedMergeCount = duplicateUserSelections.filter(s => s.shouldMerge).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              <CardTitle className="text-lg" data-testid="text-duplicates-title">
                Potential Duplicate Schools
              </CardTitle>
            </div>
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-scan-duplicates"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
              {scanMutation.isPending ? 'Scanning...' : 'Scan for Duplicates'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="new" data-testid="tab-new">
                New {counts?.new ? `(${counts.new})` : ''}
              </TabsTrigger>
              <TabsTrigger value="reviewed" data-testid="tab-reviewed">
                Reviewed {counts?.reviewed ? `(${counts.reviewed})` : ''}
              </TabsTrigger>
              <TabsTrigger value="dismissed" data-testid="tab-dismissed">
                Dismissed {counts?.dismissed ? `(${counts.dismissed})` : ''}
              </TabsTrigger>
              <TabsTrigger value="merged" data-testid="tab-merged">
                Merged {counts?.merged ? `(${counts.merged})` : ''}
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All {counts?.total ? `(${counts.total})` : ''}
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500" data-testid="text-loading">
                  Loading duplicate groups...
                </div>
              ) : !groups || groups.length === 0 ? (
                <div className="text-center py-8 text-gray-500" data-testid="text-no-duplicates">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No duplicate groups found with this status.</p>
                  {statusFilter === 'new' && (
                    <p className="text-sm mt-2">Click "Scan for Duplicates" to check for potential duplicates.</p>
                  )}
                </div>
              ) : (
                groups.map((group) => (
                  <Card key={group.id} className="border" data-testid={`card-duplicate-group-${group.id}`}>
                    <CardHeader 
                      className="p-4 cursor-pointer hover:bg-gray-50" 
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium" data-testid={`text-match-type-${group.id}`}>
                                {getMatchTypeLabel(group.matchType)}
                              </span>
                              {getStatusBadge(group.status)}
                            </div>
                            <span className="text-sm text-gray-500" data-testid={`text-match-value-${group.id}`}>
                              Match: {group.matchValue} ({group.schoolDetails.length} schools)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {group.status === 'new' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  reviewMutation.mutate({ groupId: group.id });
                                }}
                                disabled={reviewMutation.isPending}
                                data-testid={`button-review-${group.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Mark Reviewed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDismissDialog(group);
                                }}
                                data-testid={`button-dismiss-${group.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Dismiss
                              </Button>
                              <Button
                                size="sm"
                                className="bg-pcs_blue hover:bg-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openMergeDialog(group);
                                }}
                                data-testid={`button-merge-${group.id}`}
                              >
                                <Merge className="h-4 w-4 mr-1" />
                                Merge
                              </Button>
                            </>
                          )}
                          {expandedGroups.has(group.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedGroups.has(group.id) && (
                      <CardContent className="p-4 pt-0 border-t">
                        <div className="grid gap-4 mt-4">
                          {group.schoolDetails.map((school, index) => (
                            <div 
                              key={school.id} 
                              className="p-4 bg-gray-50 rounded-lg"
                              data-testid={`card-school-${school.id}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <School className="h-5 w-5 text-pcs_blue" />
                                  <span className="font-medium" data-testid={`text-school-name-${school.id}`}>
                                    {school.name}
                                  </span>
                                  {index === 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      Oldest
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500" data-testid={`text-school-created-${school.id}`}>
                                  Joined: {new Date(school.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-600" data-testid={`text-school-email-${school.id}`}>
                                    {school.adminEmail || school.primaryContactEmail || 'No email'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-600" data-testid={`text-school-location-${school.id}`}>
                                    {school.country}
                                    {school.postcode || school.zipCode ? ` (${school.postcode || school.zipCode})` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-600" data-testid={`text-school-team-${school.id}`}>
                                    {school.teamMemberCount} team member(s)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-600" data-testid={`text-school-evidence-${school.id}`}>
                                    {school.evidenceCount} evidence item(s)
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-2 flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Award className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    Stage: {school.currentStage || 'Not started'}
                                  </span>
                                  {school.awardCompleted && (
                                    <Badge className="bg-green-500">Plastic Clever</Badge>
                                  )}
                                </div>
                                {school.studentCount && (
                                  <span className="text-sm text-gray-600">
                                    {school.studentCount.toLocaleString()} students
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {group.notes && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800">
                              <strong>Notes:</strong> {group.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss Duplicate Group</DialogTitle>
            <DialogDescription>
              Confirm that these schools are not duplicates. They will be moved to the dismissed list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dismiss-notes">Notes (optional)</Label>
              <Textarea
                id="dismiss-notes"
                placeholder="Add any notes about why these are not duplicates..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="textarea-dismiss-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDismissDialogOpen(false)}
              data-testid="button-cancel-dismiss"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedGroup) {
                  dismissMutation.mutate({ groupId: selectedGroup.id, notes });
                }
              }}
              disabled={dismissMutation.isPending}
              data-testid="button-confirm-dismiss"
            >
              {dismissMutation.isPending ? 'Dismissing...' : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeDialogOpen} onOpenChange={(open) => {
        setMergeDialogOpen(open);
        if (!open) {
          setDuplicateUserSelections([]);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Merge Schools</DialogTitle>
            <DialogDescription>
              Select which school to keep as the primary record. All data from the other school will be transferred to it.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 py-4 pr-4">
              {selectedGroup && (
                <>
                  <div className="space-y-3">
                    <Label>Select Target School (to keep)</Label>
                    <RadioGroup
                      value={mergeOptions.targetSchoolId}
                      onValueChange={(value) => {
                        const remainingSchools = selectedGroup.schoolDetails.filter(s => s.id !== value);
                        const newSourceId = remainingSchools.length === 1 
                          ? remainingSchools[0].id 
                          : (remainingSchools.find(s => s.id === mergeOptions.sourceSchoolId)?.id || remainingSchools[0]?.id || '');
                        setMergeOptions(prev => ({
                          ...prev,
                          targetSchoolId: value,
                          sourceSchoolId: newSourceId,
                        }));
                      }}
                    >
                      {selectedGroup.schoolDetails.map((school) => (
                        <div key={school.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                          <RadioGroupItem value={school.id} id={`target-${school.id}`} data-testid={`radio-target-${school.id}`} />
                          <Label htmlFor={`target-${school.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{school.name}</div>
                            <div className="text-sm text-gray-500">
                              {school.evidenceCount} evidence, {school.teamMemberCount} team members
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {selectedGroup.schoolDetails.length > 2 && (
                    <div className="space-y-3">
                      <Label>Select Source School (to merge into target)</Label>
                      <p className="text-sm text-muted-foreground">
                        This group has {selectedGroup.schoolDetails.length} schools. Select which one to merge first. 
                        After this merge, you can merge the remaining school(s).
                      </p>
                      <RadioGroup
                        value={mergeOptions.sourceSchoolId}
                        onValueChange={(value) => {
                          setMergeOptions(prev => ({
                            ...prev,
                            sourceSchoolId: value,
                          }));
                        }}
                      >
                        {selectedGroup.schoolDetails
                          .filter(s => s.id !== mergeOptions.targetSchoolId)
                          .map((school) => (
                            <div key={school.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                              <RadioGroupItem value={school.id} id={`source-${school.id}`} data-testid={`radio-source-${school.id}`} />
                              <Label htmlFor={`source-${school.id}`} className="flex-1 cursor-pointer">
                                <div className="font-medium">{school.name}</div>
                                <div className="text-sm text-gray-500">
                                  {school.evidenceCount} evidence, {school.teamMemberCount} team members
                                </div>
                              </Label>
                            </div>
                          ))}
                      </RadioGroup>
                    </div>
                  )}

                  {isMergePreviewLoading && (
                    <div className="flex items-center justify-center py-8" data-testid="loading-merge-preview">
                      <Loader2 className="h-6 w-6 animate-spin text-pcs_blue mr-2" />
                      <span className="text-gray-500">Loading user preview...</span>
                    </div>
                  )}

                  {mergePreview && !isMergePreviewLoading && (
                    <>
                      <Separator />
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-pcs_blue" />
                          <h4 className="font-medium">User Summary</h4>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="p-3 bg-blue-50 border-blue-200" data-testid="card-target-users">
                            <div className="text-sm font-medium text-blue-900">Target School</div>
                            <div className="text-2xl font-bold text-blue-700" data-testid="text-target-user-count">
                              {mergePreview.targetUsers.length}
                            </div>
                            <div className="text-xs text-blue-600">team members</div>
                          </Card>
                          <Card className="p-3 bg-orange-50 border-orange-200" data-testid="card-source-users">
                            <div className="text-sm font-medium text-orange-900">Source School</div>
                            <div className="text-2xl font-bold text-orange-700" data-testid="text-source-user-count">
                              {mergePreview.sourceUsers.length}
                            </div>
                            <div className="text-xs text-orange-600">team members</div>
                          </Card>
                        </div>

                        {mergePreview.duplicateUsers.length > 0 && (
                          <Alert variant="destructive" className="bg-amber-50 border-amber-300" data-testid="alert-duplicate-users">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Potential Duplicate Users Detected</AlertTitle>
                            <AlertDescription className="text-amber-700">
                              {mergePreview.duplicateUsers.length} user(s) appear to exist in both schools. 
                              Select which duplicates to merge and which account to keep.
                            </AlertDescription>
                          </Alert>
                        )}

                        {mergePreview.duplicateUsers.length > 0 && (
                          <div className="space-y-3" data-testid="section-duplicate-users">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                Duplicate Users to Merge ({selectedMergeCount} selected)
                              </Label>
                            </div>
                            
                            <div className="space-y-3">
                              {mergePreview.duplicateUsers.map((pair, index) => {
                                const selection = duplicateUserSelections.find(s => s.pairIndex === index);
                                const shouldMerge = selection?.shouldMerge ?? true;
                                const survivorId = selection?.survivorId ?? 
                                  (pair.recommendedSurvivor === 'target' ? pair.targetUser.id : pair.sourceUser.id);
                                
                                return (
                                  <Card 
                                    key={index} 
                                    className={`p-4 ${shouldMerge ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                                    data-testid={`card-duplicate-pair-${index}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={shouldMerge}
                                        onCheckedChange={(checked) => toggleDuplicateMerge(index, !!checked)}
                                        data-testid={`checkbox-merge-pair-${index}`}
                                      />
                                      <div className="flex-1 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <Badge variant="outline" className="text-xs" data-testid={`badge-match-reason-${index}`}>
                                            {pair.matchReason}
                                          </Badge>
                                          {pair.recommendedSurvivor && (
                                            <Badge className="bg-green-100 text-green-700 text-xs">
                                              Recommended: Keep {pair.recommendedSurvivor}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                                          <div 
                                            className={`p-2 rounded border ${survivorId === pair.targetUser.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                            data-testid={`user-target-${index}`}
                                          >
                                            <div className="text-xs text-gray-500 mb-1">Target School</div>
                                            <div className="font-medium text-sm">{getUserDisplayName(pair.targetUser)}</div>
                                            <div className="text-xs text-gray-500">{pair.targetUser.email || 'No email'}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                              Role: {pair.targetUser.role || 'N/A'} | Last active: {formatLastActive(pair.targetUser.lastActiveAt)}
                                            </div>
                                            {shouldMerge && (
                                              <Button
                                                size="sm"
                                                variant={survivorId === pair.targetUser.id ? "default" : "outline"}
                                                className="mt-2 w-full text-xs"
                                                onClick={() => updateSurvivorSelection(index, pair.targetUser.id)}
                                                data-testid={`button-select-target-${index}`}
                                              >
                                                {survivorId === pair.targetUser.id ? 'Keep This User' : 'Select to Keep'}
                                              </Button>
                                            )}
                                          </div>
                                          
                                          <ArrowRight className="h-4 w-4 text-gray-400" />
                                          
                                          <div 
                                            className={`p-2 rounded border ${survivorId === pair.sourceUser.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                                            data-testid={`user-source-${index}`}
                                          >
                                            <div className="text-xs text-gray-500 mb-1">Source School</div>
                                            <div className="font-medium text-sm">{getUserDisplayName(pair.sourceUser)}</div>
                                            <div className="text-xs text-gray-500">{pair.sourceUser.email || 'No email'}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                              Role: {pair.sourceUser.role || 'N/A'} | Last active: {formatLastActive(pair.sourceUser.lastActiveAt)}
                                            </div>
                                            {shouldMerge && (
                                              <Button
                                                size="sm"
                                                variant={survivorId === pair.sourceUser.id ? "default" : "outline"}
                                                className="mt-2 w-full text-xs"
                                                onClick={() => updateSurvivorSelection(index, pair.sourceUser.id)}
                                                data-testid={`button-select-source-${index}`}
                                              >
                                                {survivorId === pair.sourceUser.id ? 'Keep This User' : 'Select to Keep'}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {mergePreview.nonDuplicateSourceUsers.length > 0 && (
                          <div className="space-y-3" data-testid="section-users-to-transfer">
                            <Label className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              Users to Transfer ({mergePreview.nonDuplicateSourceUsers.length})
                            </Label>
                            <Card className="p-3 bg-gray-50">
                              <p className="text-sm text-gray-600 mb-2">
                                These users from the source school will be transferred to the target school:
                              </p>
                              <div className="space-y-2">
                                {mergePreview.nonDuplicateSourceUsers.map((user) => (
                                  <div 
                                    key={user.id} 
                                    className="flex items-center justify-between text-sm p-2 bg-white rounded border"
                                    data-testid={`transfer-user-${user.id}`}
                                  >
                                    <div>
                                      <span className="font-medium">{getUserDisplayName(user)}</span>
                                      <span className="text-gray-500 ml-2">({user.email || 'No email'})</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">{user.role || 'N/A'}</Badge>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </div>
                        )}
                      </div>

                      <Separator />
                    </>
                  )}

                  <div className="space-y-3">
                    <Label>Merge Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useTargetName"
                          checked={mergeOptions.useTargetName}
                          onCheckedChange={(checked) => 
                            setMergeOptions(prev => ({ ...prev, useTargetName: !!checked }))
                          }
                          data-testid="checkbox-use-target-name"
                        />
                        <Label htmlFor="useTargetName" className="text-sm">
                          Keep target school's name
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useTargetAddress"
                          checked={mergeOptions.useTargetAddress}
                          onCheckedChange={(checked) => 
                            setMergeOptions(prev => ({ ...prev, useTargetAddress: !!checked }))
                          }
                          data-testid="checkbox-use-target-address"
                        />
                        <Label htmlFor="useTargetAddress" className="text-sm">
                          Keep target school's address
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useTargetStudentCount"
                          checked={mergeOptions.useTargetStudentCount}
                          onCheckedChange={(checked) => 
                            setMergeOptions(prev => ({ ...prev, useTargetStudentCount: !!checked }))
                          }
                          data-testid="checkbox-use-target-student-count"
                        />
                        <Label htmlFor="useTargetStudentCount" className="text-sm">
                          Keep target school's student count
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="merge-notes">Notes (optional)</Label>
                    <Textarea
                      id="merge-notes"
                      placeholder="Add any notes about this merge..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      data-testid="textarea-merge-notes"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Warning:</strong> This action cannot be undone. All evidence, team members, and other data from the source school will be transferred to the target school.
                      {selectedMergeCount > 0 && (
                        <span className="block mt-1">
                          {selectedMergeCount} duplicate user account(s) will also be merged.
                        </span>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setMergeDialogOpen(false)}
              data-testid="button-cancel-merge"
            >
              Cancel
            </Button>
            {selectedGroup && selectedGroup.schoolDetails.length > 2 && (
              <Button
                onClick={handleMergeAllSchools}
                disabled={mergeAllMutation.isPending || !mergeOptions.targetSchoolId}
                variant="secondary"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                data-testid="button-merge-all"
              >
                {mergeAllMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Merging All...
                  </>
                ) : (
                  `Merge All ${selectedGroup.schoolDetails.length - 1} Schools into Target`
                )}
              </Button>
            )}
            <Button
              onClick={handleMergeSchools}
              disabled={mergeMutation.isPending || isMergingUsers || !mergeOptions.targetSchoolId || !mergeOptions.sourceSchoolId}
              className="bg-pcs_blue hover:bg-blue-600"
              data-testid="button-confirm-merge"
            >
              {mergeMutation.isPending || isMergingUsers ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : selectedGroup && selectedGroup.schoolDetails.length > 2 ? (
                'Merge Selected Only'
              ) : (
                'Merge Schools'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
