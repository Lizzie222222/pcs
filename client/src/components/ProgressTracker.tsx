import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, Clock, X, ExternalLink, Info } from "lucide-react";
import inspireIcon from "@assets/PSC - Inspire_1760461719847.png";
import investigateIcon from "@assets/PSC - Investigate_1760461719848.png";
import actIcon from "@assets/PSC - Act_1760461719847.png";
import { useTranslation } from "react-i18next";
import EvidenceSubmissionForm from "@/components/EvidenceSubmissionForm";
import { PlasticWasteAudit } from "@/components/PlasticWasteAudit";
import { ActionPlan } from "@/components/ActionPlan";
import { EvidenceDetailModal } from "@/components/EvidenceDetailModal";
import type { AuditResponse, Evidence } from "@shared/schema";

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
  resourceIds?: string[];
  customLinks?: Array<{ title: string; url: string }>;
  translations?: Record<string, { title: string; description: string }>;
  languageSpecificResources?: Record<string, string[]>;
  languageSpecificLinks?: Record<string, Array<{ title: string; url: string }>>;
}


interface AdminOverride {
  id: string;
  evidenceRequirementId: string;
  stage: string;
  roundNumber: number;
}

interface ProgressTrackerProps {
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  awardCompleted: boolean;
  currentStage: string;
  evidenceCounts: EvidenceCounts;
  schoolId: string;
  currentRound: number;
}

export default function ProgressTracker({
  inspireCompleted,
  investigateCompleted,
  actCompleted,
  awardCompleted,
  currentStage,
  evidenceCounts,
  schoolId,
  currentRound,
}: ProgressTrackerProps) {
  const { t, i18n } = useTranslation('dashboard');
  const [selectedRound, setSelectedRound] = useState(currentRound);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | undefined>();
  const [selectedStage, setSelectedStage] = useState<string>('inspire');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showActionPlanModal, setShowActionPlanModal] = useState(false);
  const [actionPlanRequirementId, setActionPlanRequirementId] = useState<string>('');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showEvidenceDetailModal, setShowEvidenceDetailModal] = useState(false);

  // Helper function to get translated content for evidence requirements
  const getTranslatedRequirement = (requirement: EvidenceRequirement) => {
    const currentLang = i18n.language;
    
    // If translations exist and the current language has a translation, use it
    if (requirement.translations && requirement.translations[currentLang]) {
      return {
        title: requirement.translations[currentLang].title,
        description: requirement.translations[currentLang].description,
      };
    }
    
    // Fall back to default (English) title and description
    return {
      title: requirement.title,
      description: requirement.description,
    };
  };

  // Helper function to get resources for the current language
  const getResourcesForLanguage = (requirement: EvidenceRequirement) => {
    const currentLang = i18n.language;
    const baseResources = requirement.resourceIds || [];
    
    // If language-specific resources exist for current language, add them
    if (requirement.languageSpecificResources && requirement.languageSpecificResources[currentLang]) {
      return [...baseResources, ...requirement.languageSpecificResources[currentLang]];
    }
    
    return baseResources;
  };

  // Helper function to get custom links for the current language
  const getCustomLinksForLanguage = (requirement: EvidenceRequirement) => {
    const currentLang = i18n.language;
    
    // If language-specific links exist for current language, use them
    if (requirement.languageSpecificLinks && requirement.languageSpecificLinks[currentLang]) {
      return requirement.languageSpecificLinks[currentLang];
    }
    
    // Fall back to default customLinks (English)
    return requirement.customLinks || [];
  };

  // Fetch evidence requirements
  const { data: requirements = [], isLoading: requirementsLoading } = useQuery<EvidenceRequirement[]>({
    queryKey: ['/api/evidence-requirements'],
  });

  // Fetch all school evidence to match with requirements (filtered by selected round)
  const { data: allEvidence = [] } = useQuery<Evidence[]>({
    queryKey: ['/api/evidence', schoolId, selectedRound],
    queryFn: async () => {
      const res = await fetch(`/api/evidence?schoolId=${schoolId}&roundNumber=${selectedRound}`);
      if (!res.ok) throw new Error('Failed to fetch evidence');
      return res.json();
    },
    enabled: !!schoolId,
  });

  // Fetch all resources to lookup attached resources by ID
  const { data: allResources = [] } = useQuery<any[]>({
    queryKey: ['/api/resources'],
  });

  // Fetch audit status
  const { data: auditResponse } = useQuery<AuditResponse>({
    queryKey: [`/api/audits/school/${schoolId}`],
    enabled: !!schoolId,
  });

  // Fetch school data for school type
  const { data: schoolData } = useQuery<{ id: string; type: string }>({
    queryKey: [`/api/schools/${schoolId}`],
    enabled: !!schoolId,
  });

  // Fetch admin overrides for this school (already filtered by current round on backend)
  const { data: adminOverrides = [] } = useQuery<AdminOverride[]>({
    queryKey: ['/api/schools/me/evidence-overrides'],
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
      color: 'pcs_blue',
    },
  ];

  const getStageStatus = (stage: any) => {
    if (stage.completed) return 'completed';
    return 'accessible';
  };

  // Get requirements for a specific stage
  const getStageRequirements = (stageId: string) => {
    return requirements
      .filter(req => req.stage === stageId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const getProgressPercentage = (stage: any) => {
    if (stage.completed) return 100;
    
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
        return '!bg-blue-500 border-0';
      case 'teal':
        return '!bg-teal-500 border-0';
      case 'yellow':
        return '!bg-yellow-400 border-0';
      case 'coral':
        return '!bg-orange-500 border-0';
      default:
        return '!bg-blue-500 border-0';
    }
  };

  // Find evidence for a specific requirement
  const getRequirementEvidence = (requirementId: string) => {
    if (!allEvidence) return null;
    return allEvidence.find(
      ev => ev.evidenceRequirementId === requirementId && ev.roundNumber === selectedRound
    );
  };

  // Check if requirement is satisfied (approved evidence OR admin override)
  const isRequirementSatisfied = (requirementId: string) => {
    // Check if has approved evidence
    const hasApprovedEvidence = allEvidence.some(
      ev => ev.evidenceRequirementId === requirementId && 
            ev.roundNumber === selectedRound && 
            ev.status === 'approved'
    );
    
    // Check if has admin override
    const hasOverride = adminOverrides.some(
      ov => ov.evidenceRequirementId === requirementId
    );
    
    return hasApprovedEvidence || hasOverride;
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

  // Check if requirement is Action Plan Development
  const isActionPlanDevelopment = (requirement: EvidenceRequirement) => {
    return requirement.title.includes("Action Plan Development");
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

  // Handle opening action plan modal
  const handleOpenActionPlan = (requirementId: string) => {
    setActionPlanRequirementId(requirementId);
    setShowActionPlanModal(true);
  };

  // Handle opening evidence detail modal
  const handleViewEvidence = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    setShowEvidenceDetailModal(true);
  };

  return (
    <>
      <div className="space-y-10">
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4 tracking-tight">{t('progress.title')}</h2>
          <p className="text-gray-600 text-lg font-medium">{t('progress.journey_description')}</p>
        </div>

        {/* Round Selector */}
        {currentRound > 1 && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3">
              <label htmlFor="round-selector" className="text-sm font-medium text-gray-700">
                View Round:
              </label>
              <Select
                value={selectedRound.toString()}
                onValueChange={(value) => setSelectedRound(parseInt(value))}
              >
                <SelectTrigger 
                  id="round-selector"
                  className="w-32"
                  data-testid="round-selector"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: currentRound }, (_, i) => i + 1).map((round) => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Previous Round Indicator Banner */}
        {selectedRound < currentRound && (
          <Alert className="bg-blue-50 border-blue-200" data-testid="previous-round-banner">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 font-medium">
              You are viewing evidence from Round {selectedRound}. This is a previous round.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage);
            const percentage = getProgressPercentage(stage);
            const Icon = stage.icon;
            const stageRequirements = getStageRequirements(stage.id);

            return (
              <Card 
                key={stage.id} 
                className="group transition-all duration-300 hover:shadow-2xl border-0 overflow-hidden shadow-lg hover:-translate-y-2 bg-transparent"
                data-testid={`progress-stage-${stage.id}`}
              >
              <CardContent className="p-8 h-full flex flex-col">
                {/* Header */}
                <div className="text-center mb-6 flex-shrink-0">
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 p-4 overflow-visible">
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
                        stroke={status === 'completed' ? 'url(#greenGradient)' : 'url(#blueGradient)'}
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
                      const isActionPlan = isActionPlanDevelopment(requirement);
                      const auditStatus = isAudit ? getAuditStatus() : null;
                      const translatedRequirement = getTranslatedRequirement(requirement);
                      const resourcesForLang = getResourcesForLanguage(requirement);
                      const customLinksForLang = getCustomLinksForLanguage(requirement);
                      
                      return (
                        <div 
                          key={requirement.id}
                          className="border-0 rounded-xl p-4 bg-white shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                          data-testid={`requirement-${requirement.id}`}
                        >
                          {/* Requirement Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-navy leading-tight mb-1">
                                {translatedRequirement.title}
                              </h4>
                              <p className="text-xs text-gray-600 font-medium">
                                {translatedRequirement.description}
                              </p>
                            </div>
                          </div>

                          {/* Status & Action - Plastic Waste Audit */}
                          {isAudit && (
                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex items-center gap-1.5">
                                {!isRequirementSatisfied(requirement.id) && auditStatus === 'not_started' && (
                                  <>
                                    <Circle className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-500">{t('progress.status.not_started')}</span>
                                  </>
                                )}
                                {!isRequirementSatisfied(requirement.id) && auditStatus === 'submitted' && (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                      data-testid="status-pending-review"
                                    >
                                      {t('progress.status.pending_review')}
                                    </Badge>
                                  </>
                                )}
                                {(isRequirementSatisfied(requirement.id) || auditStatus === 'approved') && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-green-50 text-green-700 border-green-200"
                                      data-testid="status-approved"
                                    >
                                      {t('progress.status.approved')}
                                    </Badge>
                                  </>
                                )}
                                {!isRequirementSatisfied(requirement.id) && auditStatus === 'rejected' && (
                                  <>
                                    <X className="h-4 w-4 text-red-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-red-50 text-red-700 border-red-200"
                                      data-testid="status-rejected"
                                    >
                                      {t('progress.status.rejected')}
                                    </Badge>
                                  </>
                                )}
                              </div>

                              {/* Audit Action Buttons */}
                              {!isRequirementSatisfied(requirement.id) && auditStatus === 'not_started' && (
                                <Button
                                  size="sm"
                                  className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300 bg-pcs_blue hover:bg-pcs_blue/90"
                                  onClick={handleOpenAudit}
                                  data-testid="button-do-audit"
                                >
                                  {t('progress.buttons.do_audit')}
                                </Button>
                              )}
                              {!isRequirementSatisfied(requirement.id) && auditStatus === 'submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300"
                                  onClick={handleOpenAudit}
                                  data-testid="button-review-answers"
                                >
                                  {t('progress.buttons.review_answers')}
                                </Button>
                              )}
                              {!isRequirementSatisfied(requirement.id) && auditStatus === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300"
                                  onClick={handleOpenAudit}
                                  data-testid="button-redo-audit"
                                >
                                  {t('progress.buttons.redo_audit')}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Status & Action - Action Plan Development */}
                          {isActionPlan && (
                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex items-center gap-1.5">
                                {!isRequirementSatisfied(requirement.id) && !evidenceStatus && (
                                  <>
                                    <Circle className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-500">{t('progress.status.not_started')}</span>
                                  </>
                                )}
                                {!isRequirementSatisfied(requirement.id) && evidenceStatus === 'pending' && (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                                      data-testid="status-action-plan-pending"
                                    >
                                      {t('progress.status.pending_review')}
                                    </Badge>
                                  </>
                                )}
                                {isRequirementSatisfied(requirement.id) && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-green-50 text-green-700 border-green-200"
                                      data-testid="status-action-plan-approved"
                                    >
                                      {t('progress.status.approved')}
                                    </Badge>
                                  </>
                                )}
                                {!isRequirementSatisfied(requirement.id) && evidenceStatus === 'rejected' && (
                                  <>
                                    <X className="h-4 w-4 text-red-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-red-50 text-red-700 border-red-200"
                                      data-testid="status-action-plan-rejected"
                                    >
                                      {t('progress.status.rejected')}
                                    </Badge>
                                  </>
                                )}
                              </div>

                              {/* Action Plan Action Buttons */}
                              {!isRequirementSatisfied(requirement.id) && !evidenceStatus && (
                                <Button
                                  size="sm"
                                  className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300 bg-teal hover:bg-teal/90"
                                  onClick={() => handleOpenActionPlan(requirement.id)}
                                  data-testid="button-create-action-plan"
                                >
                                  {t('progress.buttons.create_plan')}
                                </Button>
                              )}
                              {!isRequirementSatisfied(requirement.id) && evidenceStatus === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300"
                                  onClick={() => handleOpenActionPlan(requirement.id)}
                                  data-testid="button-view-action-plan"
                                >
                                  {t('progress.buttons.view_plan')}
                                </Button>
                              )}
                              {!isRequirementSatisfied(requirement.id) && evidenceStatus === 'rejected' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300"
                                  onClick={() => handleOpenActionPlan(requirement.id)}
                                  data-testid="button-redo-action-plan"
                                >
                                  {t('progress.buttons.revise_plan')}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Status & Action - Regular Evidence */}
                          {!isAudit && !isActionPlan && (
                            <div className="flex items-center justify-between gap-2 mt-3">
                              <div className="flex items-center gap-1.5">
                                {!isRequirementSatisfied(requirement.id) && !evidenceStatus && (
                                  <>
                                    <Circle className="h-4 w-4 text-gray-400" />
                                    <span className="text-xs text-gray-500">{t('progress.status.not_started')}</span>
                                  </>
                                )}
                                {!isRequirementSatisfied(requirement.id) && evidenceStatus === 'pending' && evidence && (
                                  <>
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
                                      data-testid={`status-pending-${requirement.id}`}
                                      onClick={() => handleViewEvidence(evidence)}
                                    >
                                      {t('progress.status.pending')}
                                    </Badge>
                                  </>
                                )}
                                {isRequirementSatisfied(requirement.id) && evidence && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-green-50 text-green-700 border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                                      data-testid={`status-approved-${requirement.id}`}
                                      onClick={() => handleViewEvidence(evidence)}
                                    >
                                      {t('progress.status.approved')}
                                    </Badge>
                                  </>
                                )}
                                {isRequirementSatisfied(requirement.id) && !evidence && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-green-50 text-green-700 border-green-200"
                                      data-testid={`status-approved-${requirement.id}`}
                                    >
                                      {t('progress.status.approved')}
                                    </Badge>
                                  </>
                                )}
                                {!isRequirementSatisfied(requirement.id) && evidenceStatus === 'rejected' && evidence && (
                                  <>
                                    <X className="h-4 w-4 text-red-500" />
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs bg-red-50 text-red-700 border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                                      data-testid={`status-rejected-${requirement.id}`}
                                      onClick={() => handleViewEvidence(evidence)}
                                    >
                                      {t('progress.status.rejected')}
                                    </Badge>
                                  </>
                                )}
                              </div>

                              {/* Action Button */}
                              {!isRequirementSatisfied(requirement.id) && evidenceStatus !== 'pending' && (
                                <Button
                                  size="sm"
                                  variant={evidenceStatus === 'rejected' ? 'destructive' : 'default'}
                                  className={`text-xs h-8 px-3 font-semibold shadow-md transition-all duration-300 ${
                                    evidenceStatus === 'rejected' 
                                      ? '' 
                                      : 'bg-pcs_blue hover:bg-pcs_blue/90'
                                  }`}
                                  onClick={() => handleSubmitEvidence(requirement.id, stage.id)}
                                  data-testid={`button-submit-${requirement.id}`}
                                >
                                  {evidenceStatus === 'rejected' ? t('progress.buttons.resubmit') : t('progress.buttons.submit')}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Help Resources - Show all library resources and custom links */}
                          {((resourcesForLang && resourcesForLang.length > 0) || 
                            (customLinksForLang && customLinksForLang.length > 0)) && (
                            <div className="mt-2 pt-2 border-t space-y-1">
                              {/* Library resources (includes language-specific resources) */}
                              {resourcesForLang?.map(resourceId => {
                                const resource = allResources.find(r => r.id === resourceId);
                                if (!resource) return null;
                                return (
                                  <a
                                    key={resourceId}
                                    href={resource.fileUrl || ''}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                    data-testid={`link-resource-${resourceId}`}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {resource.title}
                                  </a>
                                );
                              })}
                              {/* Custom links (language-specific) */}
                              {customLinksForLang?.map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                                  data-testid={`link-custom-${idx}`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {link.title}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
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

      {/* Action Plan Modal */}
      <Dialog open={showActionPlanModal} onOpenChange={setShowActionPlanModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <ActionPlan 
            schoolId={schoolId}
            evidenceRequirementId={actionPlanRequirementId}
            onClose={() => setShowActionPlanModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Evidence Detail Modal */}
      <EvidenceDetailModal
        evidence={selectedEvidence}
        isOpen={showEvidenceDetailModal}
        onClose={() => {
          setShowEvidenceDetailModal(false);
          setSelectedEvidence(null);
        }}
      />
    </>
  );
}
