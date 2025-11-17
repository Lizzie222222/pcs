import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner, EmptyState } from "@/components/ui/states";
import { AlertTriangle, Link2, Award, ChevronLeft, ChevronRight } from "lucide-react";

interface HomelessEvidence {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  status: string;
  submittedAt: string;
  schoolId: string;
  school: {
    id: string;
    name: string;
    country: string;
  };
}

interface EvidenceRequirement {
  id: string;
  title: string;
  description: string;
  stage: 'inspire' | 'investigate' | 'act';
  orderIndex: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function EvidenceTriageSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  // Filters state
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'inspire' | 'investigate' | 'act'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<HomelessEvidence | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>('');

  // Fetch homeless evidence
  const { data: homelessData, isLoading: evidenceLoading } = useQuery({
    queryKey: ['/api/admin/evidence/homeless', schoolFilter, stageFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (schoolFilter && schoolFilter !== 'all') {
        params.append('schoolId', schoolFilter);
      }
      if (stageFilter && stageFilter !== 'all') {
        params.append('stage', stageFilter);
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      const url = `/api/admin/evidence/homeless?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json() as Promise<{ evidence: HomelessEvidence[]; pagination: PaginationMeta }>;
    },
    retry: false,
  });

  const homelessEvidence = homelessData?.evidence || [];
  const pagination = homelessData?.pagination;

  // Fetch all schools for filter dropdown
  const { data: schoolsData } = useQuery<{ schools: Array<{ id: string; name: string; country: string }> }>({
    queryKey: ['/api/admin/schools'],
    queryFn: async () => {
      const res = await fetch('/api/admin/schools', { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    retry: false,
  });

  const schools = schoolsData?.schools || [];

  // Fetch evidence requirements filtered by stage
  const { data: requirements = [] } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements', selectedEvidence?.stage],
    queryFn: async () => {
      if (!selectedEvidence) return [];
      const url = `/api/evidence-requirements?stage=${selectedEvidence.stage}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!selectedEvidence,
    retry: false,
  });

  // Assign requirement mutation
  const assignRequirementMutation = useMutation({
    mutationFn: async ({ evidenceId, requirementId }: { evidenceId: string; requirementId: string }) => {
      return await apiRequest('PATCH', `/api/admin/evidence/${evidenceId}/assign-requirement`, {
        evidenceRequirementId: requirementId,
      });
    },
    onSuccess: async (_, variables) => {
      try {
        // Invalidate homeless evidence queries (all filter/page variants)
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/evidence/homeless'], 
          exact: false 
        });
        
        // Invalidate schools queries for progress updates
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/schools'],
          exact: false
        });
        
        console.log('[Evidence Triage] Successfully assigned, caches invalidated');
        
        toast({
          title: "Success",
          description: "Evidence has been successfully assigned to a requirement.",
        });
        
        setAssignDialogOpen(false);
        setSelectedEvidence(null);
        setSelectedRequirementId('');
      } catch (error) {
        console.error('[Evidence Triage] Cache invalidation failed:', error);
        toast({
          variant: "destructive",
          title: "Refresh failed",
          description: "Changes saved, but the dashboard did not refresh automatically. Please reload the page.",
        });
      }
    },
    onError: (error: any) => {
      console.error('[Evidence Triage] Assignment failed:', error);
      toast({
        variant: "destructive",
        title: "Operation failed",
        description: error?.message || "Failed to assign requirement to evidence. Please try again.",
      });
    },
  });

  // Mark as bonus mutation
  const markBonusMutation = useMutation({
    mutationFn: async (evidenceId: string) => {
      return await apiRequest('PATCH', `/api/admin/evidence/${evidenceId}/mark-bonus`, {
        isBonus: true,
      });
    },
    onSuccess: async () => {
      try {
        // Invalidate homeless evidence queries (all filter/page variants)
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/evidence/homeless'], 
          exact: false 
        });
        
        // Invalidate schools queries for progress updates
        await queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/schools'],
          exact: false
        });
        
        console.log('[Evidence Triage] Successfully marked bonus, caches invalidated');
        
        toast({
          title: "Success",
          description: "Evidence has been successfully marked as bonus.",
        });
        
        setBonusDialogOpen(false);
        setSelectedEvidence(null);
      } catch (error) {
        console.error('[Evidence Triage] Cache invalidation failed:', error);
        toast({
          variant: "destructive",
          title: "Refresh failed",
          description: "Changes saved, but the dashboard did not refresh automatically. Please reload the page.",
        });
      }
    },
    onError: (error: any) => {
      console.error('[Evidence Triage] Mark bonus failed:', error);
      toast({
        variant: "destructive",
        title: "Operation failed",
        description: error?.message || "Failed to mark evidence as bonus. Please try again.",
      });
    },
  });

  const handleAssignClick = (evidence: HomelessEvidence) => {
    setSelectedEvidence(evidence);
    setSelectedRequirementId('');
    setAssignDialogOpen(true);
  };

  const handleBonusClick = (evidence: HomelessEvidence) => {
    setSelectedEvidence(evidence);
    setBonusDialogOpen(true);
  };

  const handleAssignSubmit = () => {
    if (!selectedEvidence || !selectedRequirementId) return;
    assignRequirementMutation.mutate({
      evidenceId: selectedEvidence.id,
      requirementId: selectedRequirementId,
    });
  };

  const handleBonusConfirm = () => {
    if (!selectedEvidence) return;
    markBonusMutation.mutate(selectedEvidence.id);
  };

  const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (stage) {
      case 'inspire':
        return 'default';
      case 'investigate':
        return 'secondary';
      case 'act':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Evidence Triage - Homeless Evidence
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Evidence without assigned requirements (evidenceRequirementId = null and isBonus = false). 
            Assign these to requirements or mark as bonus evidence.
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">School</label>
              <Select
                value={schoolFilter}
                onValueChange={(value) => {
                  setSchoolFilter(value);
                  setPage(1);
                }}
                data-testid="select-school-filter"
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name} ({school.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Stage</label>
              <Select
                value={stageFilter}
                onValueChange={(value: any) => {
                  setStageFilter(value);
                  setPage(1);
                }}
                data-testid="select-stage-filter"
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="inspire">Inspire</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Evidence Table */}
          {evidenceLoading ? (
            <LoadingSpinner />
          ) : homelessEvidence.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No Homeless Evidence"
              description="All evidence has been assigned or marked as bonus. Great work!"
            />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {homelessEvidence.map((evidence) => (
                      <TableRow key={evidence.id} data-testid={`row-evidence-${evidence.id}`}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm">{evidence.school.name}</div>
                            <div className="text-xs text-muted-foreground">{evidence.school.country}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStageBadgeVariant(evidence.stage)} data-testid={`badge-stage-${evidence.id}`}>
                            {evidence.stage.charAt(0).toUpperCase() + evidence.stage.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={evidence.title}>
                            {evidence.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md truncate text-sm text-muted-foreground" title={evidence.description || ''}>
                            {evidence.description || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(evidence.submittedAt), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignClick(evidence)}
                              data-testid={`button-assign-${evidence.id}`}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBonusClick(evidence)}
                              data-testid={`button-bonus-${evidence.id}`}
                            >
                              <Award className="h-4 w-4 mr-1" />
                              Mark Bonus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!pagination.hasMore}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Assign to Requirement Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent data-testid="dialog-assign-requirement">
          <DialogHeader>
            <DialogTitle>Assign to Requirement</DialogTitle>
            <DialogDescription>
              Select a requirement to assign this evidence to. The requirement must match the evidence stage ({selectedEvidence?.stage}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedEvidence && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Evidence:</div>
                <div className="text-sm text-muted-foreground">{selectedEvidence.title}</div>
                <div className="text-xs text-muted-foreground">{selectedEvidence.school.name}</div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Requirement</label>
              <Select
                value={selectedRequirementId}
                onValueChange={setSelectedRequirementId}
                data-testid="select-requirement"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a requirement" />
                </SelectTrigger>
                <SelectContent>
                  {requirements.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.orderIndex}. {req.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {requirements.length === 0 && selectedEvidence && (
                <p className="text-sm text-amber-600">
                  No requirements found for {selectedEvidence.stage} stage. Please create requirements first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedEvidence(null);
                setSelectedRequirementId('');
              }}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleAssignSubmit}
              disabled={!selectedRequirementId || assignRequirementMutation.isPending}
              data-testid="button-confirm-assign"
            >
              {assignRequirementMutation.isPending ? 'Assigning...' : 'Assign Requirement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Bonus Confirmation Dialog */}
      <AlertDialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <AlertDialogContent data-testid="dialog-mark-bonus">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Bonus Evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the evidence as bonus (isBonus = true). Bonus evidence does not count towards stage progression requirements.
              {selectedEvidence && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium text-foreground">{selectedEvidence.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{selectedEvidence.school.name}</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bonus">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBonusConfirm}
              disabled={markBonusMutation.isPending}
              data-testid="button-confirm-bonus"
            >
              {markBonusMutation.isPending ? 'Marking...' : 'Mark as Bonus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
