import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Settings, Eye, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EvidenceRequirement {
  id: string;
  stage: string;
  title: string;
  description: string;
  orderIndex: number;
}

interface AdminOverride {
  id: string;
  evidenceRequirementId: string;
  stage: string;
  roundNumber: number;
}

interface Evidence {
  id: string;
  evidenceRequirementId?: string;
  status: 'pending' | 'approved' | 'rejected';
  stage: string;
}

interface School {
  id: string;
  name: string;
  currentStage: 'inspire' | 'investigate' | 'act';
  currentRound: number;
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  progressPercentage: number;
}

interface SchoolProgressOverrideProps {
  schoolId: string;
  onUpdate?: () => void;
}

export default function SchoolProgressOverride({ schoolId, onUpdate }: SchoolProgressOverrideProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch school details
  const { data: school } = useQuery<School>({
    queryKey: ['/api/admin/schools', schoolId],
  });
  
  // Viewing state - separate from actual current round/stage
  // Initialize with school data or safe defaults
  const [viewingRound, setViewingRound] = useState<number>(() => school?.currentRound || 1);
  const [viewingStage, setViewingStage] = useState<'inspire' | 'investigate' | 'act'>(() => school?.currentStage || 'inspire');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Sync viewing state when school data loads or changes
  useEffect(() => {
    if (school) {
      setViewingRound(school.currentRound);
      setViewingStage(school.currentStage);
    }
  }, [school?.currentRound, school?.currentStage]);

  // Fetch evidence requirements
  const { data: requirements = [] } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
  });

  /**
   * ROUND FILTERING - WHY IT'S CRITICAL FOR ADMIN OVERRIDES:
   * ========================================================
   * Admin overrides and evidence queries MUST filter by school.currentRound.
   * This is non-negotiable because:
   * 
   * WHY showing all rounds would confuse admins:
   * - Each requirement appears once per round (e.g., "Community Event" in Round 1, 2, 3)
   * - Without filtering, the list would show "Community Event" 3+ times
   * - Admins wouldn't know which checkbox applies to which round
   * - Toggling overrides would affect the wrong round's progress
   * 
   * WHY filtering by currentRound specifically:
   * - Admin overrides affect the school's active round progression
   * - Historical rounds are completed and shouldn't be modified
   * - The round selector in this component changes school.currentRound directly
   * - Evidence counts and progression logic all use currentRound
   * 
   * CONSISTENCY requirement:
   * - Overrides query: Filters by school.currentRound (implicit via API)
   * - Evidence query: MUST filter by school.currentRound (line 70)
   * - toggleOverride mutation: Automatically uses currentRound (backend adds it)
   * 
   * If evidence and overrides queries use different rounds, the UI will show
   * incorrect completion badges and admins will make mistakes.
   */

  // Fetch admin overrides for viewing round
  // Must be scoped to viewingRound so checkboxes match the evidence being viewed
  const { data: overrides = [] } = useQuery<AdminOverride[]>({
    queryKey: ['/api/admin/schools', schoolId, 'evidence-overrides', viewingRound],
    queryFn: async () => {
      const url = `/api/admin/schools/${schoolId}/evidence-overrides?roundNumber=${viewingRound}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch overrides');
      return response.json();
    },
    enabled: !!schoolId && viewingRound !== null,
  });

  // Fetch school evidence for viewing round
  // Now uses viewingRound to allow browsing different rounds without changing current round
  const { data: evidence = [] } = useQuery<Evidence[]>({
    queryKey: ['/api/admin/schools', schoolId, 'evidence', viewingRound],
    queryFn: async () => {
      const url = `/api/admin/schools/${schoolId}/evidence?roundNumber=${viewingRound}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    enabled: !!schoolId && viewingRound !== null,
  });

  // Toggle override mutation
  // Must include viewingRound to ensure override is applied to the correct round
  const toggleOverrideMutation = useMutation({
    mutationFn: async ({ requirementId, stage }: { requirementId: string; stage: string }) => {
      return await apiRequest('POST', `/api/admin/schools/${schoolId}/evidence-overrides/toggle`, {
        evidenceRequirementId: requirementId,
        stage,
        roundNumber: viewingRound,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools', schoolId, 'evidence-overrides', viewingRound] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      toast({
        title: "Override Updated",
        description: "Evidence requirement override has been toggled successfully.",
      });
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Error toggling override:", error);
      toast({
        title: "Error",
        description: "Failed to toggle override. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update progression mutation
  const updateProgressionMutation = useMutation({
    mutationFn: async (updates: Partial<School>) => {
      return await apiRequest('PATCH', `/api/admin/schools/${schoolId}/progression`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools'] });
      toast({
        title: "Progression Updated",
        description: "School progression has been updated successfully.",
      });
      onUpdate?.();
    },
    onError: (error) => {
      console.error("Error updating progression:", error);
      toast({
        title: "Error",
        description: "Failed to update progression. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle setting current round/stage from viewing state
  const handleSetAsCurrent = () => {
    if (viewingRound !== null && viewingStage !== null) {
      updateProgressionMutation.mutate({ 
        currentRound: viewingRound,
        currentStage: viewingStage
      });
      setConfirmDialogOpen(false);
    }
  };

  // Check if a requirement has admin override
  const hasOverride = (requirementId: string) => {
    return overrides.some(o => o.evidenceRequirementId === requirementId);
  };

  // Check if a requirement has actual submitted/approved evidence
  const hasSubmittedEvidence = (requirementId: string) => {
    return evidence.some(e => e.evidenceRequirementId === requirementId);
  };

  const hasApprovedEvidence = (requirementId: string) => {
    return evidence.some(e => e.evidenceRequirementId === requirementId && e.status === 'approved');
  };

  // Group requirements by stage
  const requirementsByStage = {
    inspire: requirements.filter(r => r.stage === 'inspire').sort((a, b) => a.orderIndex - b.orderIndex),
    investigate: requirements.filter(r => r.stage === 'investigate').sort((a, b) => a.orderIndex - b.orderIndex),
    act: requirements.filter(r => r.stage === 'act').sort((a, b) => a.orderIndex - b.orderIndex),
  };

  if (!school) {
    return null;
  }

  // Check if viewing differs from current
  const hasChanges = viewingRound !== school.currentRound || viewingStage !== school.currentStage;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6" />
            Progress Override Controls
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Viewing vs Current Indicator */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Viewing: Round {viewingRound} - {viewingStage && viewingStage.charAt(0).toUpperCase() + viewingStage.slice(1)}
              </span>
              <span className="text-blue-600">|</span>
              <span className="text-blue-700">
                Current: Round {school.currentRound} - {school.currentStage.charAt(0).toUpperCase() + school.currentStage.slice(1)}
              </span>
            </div>
            {hasChanges && (
              <Button
                size="sm"
                onClick={() => setConfirmDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-set-as-current"
              >
                <Save className="h-4 w-4 mr-2" />
                Set as Current Round/Stage
              </Button>
            )}
          </div>

          {/* Round and Stage Controls - Now for viewing only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Browse Round</label>
              <Select
                value={viewingRound?.toString() || "1"}
                onValueChange={(value) => {
                  setViewingRound(parseInt(value));
                }}
                data-testid="select-viewing-round"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(round => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Browse Stage</label>
              <Select
                value={viewingStage || "inspire"}
                onValueChange={(value: any) => {
                  setViewingStage(value);
                }}
                data-testid="select-viewing-stage"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspire">Inspire</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                  <SelectItem value="act">Act</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Evidence Requirements by Stage */}
          {(['inspire', 'investigate', 'act'] as const).map(stage => (
            <div key={stage} className="space-y-3">
              <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                {stage}
                <Badge variant={school.currentStage === stage ? "default" : "outline"}>
                  {requirementsByStage[stage].length} requirements
                </Badge>
              </h3>
              
              <div className="space-y-2">
                {requirementsByStage[stage].map(requirement => {
                  const isOverridden = hasOverride(requirement.id);
                  const hasSubmission = hasSubmittedEvidence(requirement.id);
                  const isApproved = hasApprovedEvidence(requirement.id);

                  return (
                    <div
                      key={requirement.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                      data-testid={`requirement-${requirement.id}`}
                    >
                      <Checkbox
                        checked={isOverridden || isApproved}
                        onCheckedChange={() => {
                          toggleOverrideMutation.mutate({
                            requirementId: requirement.id,
                            stage: stage,
                          });
                        }}
                        disabled={toggleOverrideMutation.isPending}
                        data-testid={`checkbox-override-${requirement.id}`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{requirement.title}</p>
                          
                          {isApproved && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          
                          {hasSubmission && !isApproved && (
                            <Badge variant="secondary">
                              <Circle className="h-3 w-3 mr-1" />
                              Submitted
                            </Badge>
                          )}
                          
                          {isOverridden && (
                            <Badge variant="outline" className="border-blue-600 text-blue-600">
                              Admin Override
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{requirement.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t text-sm text-gray-600">
            <p className="font-medium mb-2">Legend:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Approved badge:</strong> School has submitted and admin approved this evidence</li>
              <li>• <strong>Submitted badge:</strong> School has submitted evidence (pending review)</li>
              <li>• <strong>Admin Override badge:</strong> You've manually marked this as complete</li>
              <li>• <strong>Checkbox (Ticked):</strong> Either approved by admin OR manually overridden</li>
              <li>• <strong>Checkbox (Unticked):</strong> Not yet completed - click to add admin override</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Current Round and Stage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the school's current round to <strong>Round {viewingRound}</strong> and 
              current stage to <strong>{viewingStage && viewingStage.charAt(0).toUpperCase() + viewingStage.slice(1)}</strong>.
              <br /><br />
              This action will affect the school's progression and what evidence they can submit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSetAsCurrent}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
