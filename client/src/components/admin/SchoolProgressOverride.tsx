import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Settings } from "lucide-react";
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

  // Fetch evidence requirements
  const { data: requirements = [] } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
  });

  // Fetch admin overrides for current round
  const { data: overrides = [] } = useQuery<AdminOverride[]>({
    queryKey: ['/api/admin/schools', schoolId, 'evidence-overrides'],
    enabled: !!schoolId,
  });

  // Fetch school evidence
  const { data: evidence = [] } = useQuery<Evidence[]>({
    queryKey: ['/api/admin/schools', schoolId, 'evidence'],
    enabled: !!schoolId,
  });

  // Toggle override mutation
  const toggleOverrideMutation = useMutation({
    mutationFn: async ({ requirementId, stage }: { requirementId: string; stage: string }) => {
      return await apiRequest('POST', `/api/admin/schools/${schoolId}/evidence-overrides/toggle`, {
        evidenceRequirementId: requirementId,
        stage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/schools', schoolId, 'evidence-overrides'] });
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
          {/* Round and Stage Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Round</label>
              <Select
                value={school.currentRound?.toString() || "1"}
                onValueChange={(value) => {
                  updateProgressionMutation.mutate({ currentRound: parseInt(value) });
                }}
                data-testid="select-current-round"
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
              <label className="text-sm font-medium">Current Stage</label>
              <Select
                value={school.currentStage || "inspire"}
                onValueChange={(value: any) => {
                  updateProgressionMutation.mutate({ currentStage: value });
                }}
                data-testid="select-current-stage"
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
                        checked={isOverridden}
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
              <li>• <strong>Checkbox:</strong> Toggle admin override (works independently of submissions)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
