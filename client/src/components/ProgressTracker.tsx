import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Lock, Lightbulb, Search, Hand } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EvidenceCounts {
  inspire?: { total: number; approved: number };
  investigate?: { total: number; approved: number; hasQuiz: boolean };
  act?: { total: number; approved: number };
}

interface ProgressTrackerProps {
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  awardCompleted: boolean;
  currentStage: string;
  evidenceCounts: EvidenceCounts;
}

export default function ProgressTracker({
  inspireCompleted,
  investigateCompleted,
  actCompleted,
  awardCompleted,
  currentStage,
  evidenceCounts,
}: ProgressTrackerProps) {
  const { t } = useTranslation('dashboard');
  const stages = [
    {
      id: 'inspire',
      title: t('progress.inspire.title'),
      description: t('progress.inspire.description'),
      icon: Lightbulb,
      completed: inspireCompleted,
      color: 'pcs_blue',
    },
    {
      id: 'investigate',
      title: t('progress.investigate.title'), 
      description: t('progress.investigate.description'),
      icon: Search,
      completed: investigateCompleted,
      color: 'teal',
    },
    {
      id: 'act',
      title: t('progress.act.title'),
      description: t('progress.act.description'),
      icon: Hand,
      completed: actCompleted,
      color: 'coral',
    },
  ];

  const getStageStatus = (stage: any) => {
    if (stage.completed) return 'completed';
    if (currentStage === stage.id) return 'current';
    return 'locked';
  };

  const getRequiredCount = (stageId: string): number => {
    switch (stageId) {
      case 'inspire': return 3;
      case 'investigate': return 2;
      case 'act': return 3;
      default: return 3;
    }
  };

  const getProgressPercentage = (stage: any) => {
    if (stage.completed) return 100;
    if (currentStage === stage.id) {
      const stageId = stage.id as keyof EvidenceCounts;
      const counts = evidenceCounts?.[stageId];
      if (!counts || typeof counts.approved !== 'number') return 0;
      const required = getRequiredCount(stageId);
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
      case 'coral':
        return 'bg-gradient-to-r from-orange-500 to-orange-600';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-navy mb-3">{t('progress.title')}</h2>
        <p className="text-gray-600">{t('progress.journey_description')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const percentage = getProgressPercentage(stage);
          const Icon = stage.icon;

          return (
            <Card 
              key={stage.id} 
              className={`group transition-all duration-300 hover:shadow-lg border overflow-hidden bg-white ${
                status === 'completed' ? 'ring-2 ring-green-400/30 bg-green-50/30' :
                status === 'current' ? 'ring-2 ring-blue-400/30 bg-blue-50/30' :
                'hover:shadow-md bg-gray-50/30'
              }`}
              data-testid={`progress-stage-${stage.id}`}
            >
            <CardContent className="p-6 h-full flex flex-col">
              {/* Header */}
              <div className="text-center mb-4 flex-shrink-0">
                <div className="relative inline-flex items-center justify-center mb-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow transition-all duration-300 ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? getStageGradientClasses(stage.color) :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {status === 'completed' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-navy mb-1">{stage.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{stage.description}</p>
                
                {/* Status Badge */}
                {status === 'completed' && (
                  <Badge className="bg-green-500 text-white text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('progress.stage_completed')}
                  </Badge>
                )}
                {status === 'current' && (
                  <Badge className={`${getStageBadgeClasses(stage.color)} text-white text-xs`}>
                    {t('progress.stage_current')}
                  </Badge>
                )}
                {status === 'locked' && (
                  <Badge variant="secondary" className="text-gray-600 bg-gray-100 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    {t('progress.stage_locked')}
                  </Badge>
                )}
              </div>

              {/* Progress Circle */}
              <div className="flex justify-center mb-4 flex-shrink-0">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      strokeWidth="4"
                      stroke="#e5e7eb"
                      fill="transparent"
                      r="36"
                      cx="40"
                      cy="40"
                    />
                    <circle
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - percentage / 100)}`}
                      strokeLinecap="round"
                      stroke={status === 'completed' ? '#10b981' : status === 'current' ? '#3b82f6' : '#6b7280'}
                      fill="transparent"
                      r="36"
                      cx="40"
                      cy="40"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-bold ${status === 'completed' ? 'text-green-500' : 'text-navy'}`}>
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence-Based Progress Items */}
              <div className="space-y-2 flex-grow">
                {(() => {
                  const stageId = stage.id as keyof EvidenceCounts;
                  const counts = evidenceCounts?.[stageId];
                  const requiredCount = getRequiredCount(stageId);
                  const total = counts?.total ?? 0;
                  const approved = counts?.approved ?? 0;
                  
                  return (
                    <>
                      <div 
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          total > 0 ? 'bg-blue-50 text-blue-700' :
                          status === 'locked' ? 'bg-gray-50 text-gray-500' :
                          'bg-gray-50 text-gray-500'
                        }`}
                        data-testid={`evidence-submitted-${stage.id}`}
                      >
                        <div className="flex-shrink-0">
                          {total > 0 ? (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          ) : status === 'locked' ? (
                            <Lock className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium">
                          {total > 0 
                            ? t('progress.evidence_items_submitted', { count: total }) || `${total} evidence submitted`
                            : t('progress.no_evidence_submitted') || 'No evidence submitted yet'
                          }
                        </span>
                      </div>
                      
                      <div 
                        className={`flex items-center gap-2 p-2 rounded text-sm ${
                          approved >= requiredCount ? 'bg-green-50 text-green-700' :
                          approved > 0 ? 'bg-yellow-50 text-yellow-700' :
                          status === 'locked' ? 'bg-gray-50 text-gray-500' :
                          'bg-gray-50 text-gray-500'
                        }`}
                        data-testid={`evidence-approved-${stage.id}`}
                      >
                        <div className="flex-shrink-0">
                          {approved >= requiredCount ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : approved > 0 ? (
                            <CheckCircle className="h-4 w-4 text-yellow-500" />
                          ) : status === 'locked' ? (
                            <Lock className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium">
                          {t('progress.evidence_items_approved', { approved, required: requiredCount }) || `${approved} / ${requiredCount} evidence approved`}
                        </span>
                      </div>
                      
                      {stageId === 'investigate' && counts && 'hasQuiz' in counts && (
                        <div 
                          className={`flex items-center gap-2 p-2 rounded text-sm ${
                            counts.hasQuiz ? 'bg-green-50 text-green-700' :
                            status === 'locked' ? 'bg-gray-50 text-gray-500' :
                            'bg-gray-50 text-gray-500'
                          }`}
                          data-testid={`audit-quiz-${stage.id}`}
                        >
                          <div className="flex-shrink-0">
                            {counts.hasQuiz ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : status === 'locked' ? (
                              <Lock className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <span className="font-medium">
                            {counts.hasQuiz 
                              ? t('progress.audit_quiz_completed') || 'Audit quiz completed'
                              : t('progress.audit_quiz_pending') || 'Audit quiz required'
                            }
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
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
  );
}
