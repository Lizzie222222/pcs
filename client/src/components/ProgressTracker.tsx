import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, Circle, Lock, Clock, X, ExternalLink } from "lucide-react";
import inspireIcon from "@assets/PSC - Inspire_1760461719847.png";
import investigateIcon from "@assets/PSC - Investigate_1760461719848.png";
import actIcon from "@assets/PSC - Act_1760461719847.png";
import { useTranslation } from "react-i18next";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { PlasticWasteAudit } from "@/components/PlasticWasteAudit";
import type { AuditResponse } from "@shared/schema";

interface EvidenceCounts {
  inspire?: { total: number; approved: number };
  investigate?: { total: number; approved: number; hasQuiz: boolean };
  act?: { total: number; approved: number };
}

interface EvidenceRequirement {
  id: string;
  stage: string;
  title: string;
  description: string;
  orderIndex: number;
  resourceUrl?: string;
}

interface Evidence {
  id: string;
  evidenceRequirementId?: string;
  status: 'pending' | 'approved' | 'rejected';
  stage: string;
}

interface ProgressTrackerProps {
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  awardCompleted: boolean;
  currentStage: string;
  evidenceCounts: EvidenceCounts;
  schoolId: string;
}

export default function ProgressTracker({
  inspireCompleted,
  investigateCompleted,
  actCompleted,
  awardCompleted,
  currentStage,
  evidenceCounts,
  schoolId,
}: ProgressTrackerProps) {
  const { t } = useTranslation('dashboard');
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | undefined>();
  const [selectedStage, setSelectedStage] = useState<string>('inspire');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Fetch evidence requirements
  const { data: requirements = [], isLoading: requirementsLoading } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
  });

  // Fetch all school evidence to match with requirements
  const { data: allEvidence = [] } = useQuery<Evidence[]>({
    queryKey: ['/api/evidence'],
  });

  // Fetch audit status
  const { data: auditResponse } = useQuery<AuditResponse>({
    queryKey: [`/api/audits/school/${schoolId}`],
    enabled: !!schoolId,
  });

  const stages = [
    {
      id: 'inspire',
      title: t('progress.inspire.title'),
      description: t('progress.inspire.description'),
      icon: inspireIcon,
      completed: inspireCompleted,
      color: 'teal',
    },
    {
      id: 'investigate',
      title: t('progress.investigate.title'), 
      description: t('progress.investigate.description'),
      icon: investigateIcon,
      completed: investigateCompleted,
      color: 'yellow',
    },
    {
      id: 'act',
      title: t('progress.act.title'),
      description: t('progress.act.description'),
      icon: actIcon,
      completed: actCompleted,
      color: 'coral',
    },
  ];

  const getStageStatus = (stage: any) => {
    if (stage.completed) return 'completed';
    if (currentStage === stage.id) return 'current';
    return 'locked';
  };

  // Get requirements for a specific stage
  const getStageRequirements = (stageId: string) => {
    return requirements
      .filter(req => req.stage === stageId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const getProgressPercentage = (stage: any) => {
    if (stage.completed) return 100;
    if (currentStage === stage.id) {
      const stageId = stage.id as keyof EvidenceCounts;
      const counts = evidenceCounts?.[stageId];
      if (!counts || typeof counts.approved !== 'number') return 0;
      
      // Get required count dynamically from fetched requirements
      const required = getStageRequirements(stageId).length;
      
      // Backward compatibility: fallback to old counts if no requirements defined
      if (required === 0) {
        const fallbackRequired = stageId === 'inspire' ? 3 : stageId === 'investigate' ? 2 : 3;
        return Math.round((counts.approved / fallbackRequired) * 100);
      }
      
      // Special handling for investigate stage: count approved audit separately
      if (stageId === 'investigate' && 'hasQuiz' in counts) {
        const approvedItems = counts.approved + (counts.hasQuiz ? 1 : 0);
        return Math.round((approvedItems / required) * 100);
      }
      
      return Math.round((counts.approved / required) * 100);
    }
    return 0;
  };

  const getStageGradientClasses = (color: string) => {
    switch (color) {
      case 'pcs_blue':
        return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white';
      case 'teal':
        return 'bg-gradient-to-br from-teal-500 to-teal-600 text-white';
      case 'yellow':
        return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-800';
      case 'coral':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white';
      default:
        return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white';
    }
  };

  const getStageBadgeClasses = (color: string) => {
    switch (color) {
      case 'pcs_blue':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'teal':
        return 'bg-gradient-to-r from-teal-500 to-teal-600';
      case 'yellow':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
      case 'coral':
        return 'bg-gradient-to-r from-orange-500 to-orange-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
    }
  };

  // Find evidence for a specific requirement
  const getRequirementEvidence = (requirementId: string) => {
    if (!allEvidence) return null;
    return allEvidence.find(
      ev => ev.evidenceRequirementId === requirementId
    );
  };

  // Handle opening evidence form with requirement
  const handleSubmitEvidence = (requirementId: string, stage: string) => {
    setSelectedRequirementId(requirementId);
    setSelectedStage(stage);
    setShowEvidenceForm(true);
  };

  // Check if requirement is the Plastic Waste Audit
  const isPlasticWasteAudit = (requirement: EvidenceRequirement) => {
    return requirement.title.includes("Plastic Waste Audit");
  };

  // Get audit status for display
  const getAuditStatus = () => {
    if (!auditResponse) return 'not_started';
    if (auditResponse.status === 'draft') return 'not_started';
    return auditResponse.status;
  };

  // Handle opening audit modal
  const handleOpenAudit = () => {
    setShowAuditModal(true);
  };

  return (
    <>
      <div className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4 tracking-tight">{t('progress.title')}</h2>
          <p className="text-gray-600 text-lg font-medium">{t('progress.journey_description')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage);
            const percentage = getProgressPercentage(stage);
            const Icon = stage.icon;
            const stageRequirements = getStageRequirements(stage.id);

            return (
              <Card 
                key={stage.id} 
                className={`group transition-all duration-300 hover:shadow-2xl border-0 overflow-hidden shadow-lg hover:-translate-y-2 ${
                  status === 'completed' ? 'ring-2 ring-green-400/50 bg-gradient-to-br from-green-50/50 via-white to-green-50/30' :
                  status === 'current' ? 'ring-2 ring-blue-400/50 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30' :
                  'bg-gradient-to-br from-gray-50/50 via-white to-gray-50/30'
                }`}
                data-testid={`progress-stage-${stage.id}`}
              >
              <CardContent className="p-8 h-full flex flex-col">
                {/* Header */}
                <div className="text-center mb-6 flex-shrink-0">
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 p-4 overflow-visible ${
                      status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                      status === 'current' ? getStageGradientClasses(stage.color) :
                      'bg-gray-300 text-gray-600'
                    }`}>
                      <img src={Icon} alt={stage.title} className="w-full h-full object-contain" />
                    </div>
                    {status === 'completed' && (
                      <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-navy mb-2">{stage.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 font-medium">{stage.description}</p>
                  
                  {/* Status Badge */}
                  {status === 'completed' && (
                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs px-3 py-1 shadow-md">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('progress.stage_completed')}
                    </Badge>
                  )}
                  {status === 'current' && (
                    <Badge className={`${getStageBadgeClasses(stage.color)} text-white text-xs px-3 py-1 shadow-md`}>
                      {t('progress.stage_current')}
                    </Badge>
                  )}
                  {status === 'locked' && (
                    <Badge variant="secondary" className="text-gray-600 bg-gray-100 text-xs px-3 py-1">
                      <Lock className="h-3 w-3 mr-1" />
                      {t('progress.stage_locked')}
                    </Badge>
                  )}
                </div>

                {/* Progress Circle */}
                <div className="flex justify-center mb-6 flex-shrink-0">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
                      <circle
                        strokeWidth="6"
                        stroke="#e5e7eb"
                        fill="transparent"
                        r="34"
                        cx="40"
                        cy="40"
                      />
                      <circle
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - percentage / 100)}`}
                        strokeLinecap="round"
                        stroke={status === 'completed' ? 'url(#greenGradient)' : status === 'current' ? 'url(#blueGradient)' : '#6b7280'}
                        fill="transparent"
                        r="34"
                        cx="40"
                        cy="40"
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xl font-bold ${status === 'completed' ? 'text-green-500' : 'text-navy'}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidence Requirements Checklist */}
                <div className="space-y-4 flex-grow">
                  {requirementsLoading ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Loading requirements...
                    </div>
                  ) : stageRequirements.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No requirements yet
                    </div>
                  ) : (
                    stageRequirements.map((requirement, idx) => {
                      const evidence = getRequirementEvidence(requirement.id);
                      const evidenceStatus = evidence?.status;
                      const isAudit = isPlasticWasteAudit(requirement);
                      const auditStatus = isAudit ? getAuditStatus() : null;
                      
                      return (
                        <div 
                          key={requirement.id}
                          className="border-0 rounded-xl p-4 bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                          data-testid={`requirement-${requirement.id}`}
                        >
                          {/* Requirement Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <Badge 
                              variant="outline" 
                              className="flex-shrink-0 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200 font-semibold px-2.5 py-0.5"
                            >
                              #{idx + 1}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-navy leading-tight mb-1">
                                {requirement.title}
                              </h4>
                              <p className="text-xs text-gray-600 font-medium">
                                {requirement.description}
                              </p>
                            </div>
                          </div>

                          {/* Status & Action - Plastic Waste Audit */}
                          {isAudit && (
                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex items-center gap-1.5">
                                {auditStatus === 'not_started' && status !== 'locked' && (
                                  <>
                                    <Circle className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-500">Not started</span>
                                  </>
                                )}
                                {auditStatus === 'submitted' && (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                      data-testid="status-pending-review"
                                    >
                                      Pending Review
                                    </Badge>
                                  </>
                                )}
                                {auditStatus === 'approved' && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-green-50 text-green-700 border-green-200"
                                      data-testid="status-approved"
                                    >
                                      Approved
                                    </Badge>
                                  </>
                                )}
                                {auditStatus === 'rejected' && (
                                  <>
                                    <X className="h-4 w-4 text-red-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-red-50 text-red-700 border-red-200"
                                      data-testid="status-rejected"
                                    >
                                      Rejected
                                    </Badge>
                                  </>
                                )}
                                {status === 'locked' && (
                                  <>
                                    <Lock className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-400">Locked</span>
                                  </>
                                )}
                              </div>

                              {/* Audit Action Buttons */}
                              {status !== 'locked' && (
                                <>
                                  {auditStatus === 'not_started' && (
                                    <Button
                                      size="sm"
                                      className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-pcs_blue to-teal hover:from-pcs_blue/90 hover:to-teal/90"
                                      onClick={handleOpenAudit}
                                      data-testid="button-do-audit"
                                    >
                                      Do Audit
                                    </Button>
                                  )}
                                  {auditStatus === 'submitted' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300"
                                      onClick={handleOpenAudit}
                                      data-testid="button-review-answers"
                                    >
                                      Review Answers
                                    </Button>
                                  )}
                                  {auditStatus === 'rejected' && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                                      onClick={handleOpenAudit}
                                      data-testid="button-redo-audit"
                                    >
                                      Redo Audit
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Status & Action - Regular Evidence */}
                          {!isAudit && (
                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex items-center gap-1.5">
                                {!evidenceStatus && status !== 'locked' && (
                                  <>
                                    <Circle className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-500">Not started</span>
                                  </>
                                )}
                                {evidenceStatus === 'pending' && (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                      data-testid={`status-pending-${requirement.id}`}
                                    >
                                      Pending
                                    </Badge>
                                  </>
                                )}
                                {evidenceStatus === 'approved' && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-green-50 text-green-700 border-green-200"
                                      data-testid={`status-approved-${requirement.id}`}
                                    >
                                      Approved
                                    </Badge>
                                  </>
                                )}
                                {evidenceStatus === 'rejected' && (
                                  <>
                                    <X className="h-4 w-4 text-red-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-red-50 text-red-700 border-red-200"
                                      data-testid={`status-rejected-${requirement.id}`}
                                    >
                                      Rejected
                                    </Badge>
                                  </>
                                )}
                                {status === 'locked' && (
                                  <>
                                    <Lock className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-400">Locked</span>
                                  </>
                                )}
                              </div>

                              {/* Action Button */}
                              {status !== 'locked' && evidenceStatus !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant={evidenceStatus === 'rejected' ? 'destructive' : 'default'}
                                  className={`text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300 ${
                                    evidenceStatus === 'rejected' 
                                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                                      : 'bg-gradient-to-r from-pcs_blue to-teal hover:from-pcs_blue/90 hover:to-teal/90'
                                  }`}
                                  onClick={() => handleSubmitEvidence(requirement.id, stage.id)}
                                  data-testid={`button-submit-${requirement.id}`}
                                >
                                  {evidenceStatus === 'rejected' ? 'Resubmit' : 'Submit'}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Resource Link */}
                          {requirement.resourceUrl && (
                            <div className="mt-2 pt-2 border-t">
                              <a
                                href={requirement.resourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                data-testid={`link-resource-${requirement.id}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Helpful Resource
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {status === 'locked' && (
                  <div className="text-center mt-4 pt-4 border-t flex-shrink-0">
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full">
                      <Lock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">{t('progress.stage_locked')}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>

      {/* Evidence Submission Form */}
      {showEvidenceForm && (
        <EvidenceSubmissionForm 
          onClose={() => {
            setShowEvidenceForm(false);
            setSelectedRequirementId(undefined);
          }}
          schoolId={schoolId}
          evidenceRequirementId={selectedRequirementId}
          preSelectedStage={selectedStage as 'inspire' | 'investigate' | 'act'}
        />
      )}

      {/* Plastic Waste Audit Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <PlasticWasteAudit 
            schoolId={schoolId}
            onClose={() => setShowAuditModal(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
