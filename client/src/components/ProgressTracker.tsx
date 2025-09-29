import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Lock, Lightbulb, Search, Hand } from "lucide-react";

interface ProgressTrackerProps {
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  awardCompleted: boolean;
  currentStage: string;
}

export default function ProgressTracker({
  inspireCompleted,
  investigateCompleted,
  actCompleted,
  awardCompleted,
  currentStage,
}: ProgressTrackerProps) {
  const stages = [
    {
      id: 'inspire',
      title: 'Inspire',
      description: 'Build awareness and motivation',
      icon: Lightbulb,
      completed: inspireCompleted,
      color: 'pcs_blue',
      activities: [
        { name: 'Assembly presentation', completed: inspireCompleted },
        { name: 'Student engagement', completed: inspireCompleted },
        { name: 'Evidence submission', completed: inspireCompleted },
      ],
    },
    {
      id: 'investigate',
      title: 'Investigate', 
      description: 'Research and analyze',
      icon: Search,
      completed: investigateCompleted,
      color: 'teal',
      activities: [
        { name: 'Plastic audit conducted', completed: investigateCompleted },
        { name: 'Data collection', completed: investigateCompleted },
        { name: 'Evidence review', completed: investigateCompleted },
      ],
    },
    {
      id: 'act',
      title: 'Act',
      description: 'Create lasting change',
      icon: Hand,
      completed: actCompleted,
      color: 'coral',
      activities: [
        { name: 'Action plan development', completed: actCompleted },
        { name: 'Implementation activities', completed: actCompleted },
        { name: 'Impact measurement', completed: actCompleted },
      ],
    },
  ];

  const getStageStatus = (stage: any) => {
    if (stage.completed) return 'completed';
    if (currentStage === stage.id) return 'current';
    return 'locked';
  };

  const getProgressPercentage = (stage: any) => {
    if (stage.completed) return 100;
    if (currentStage === stage.id) {
      // Calculate based on completed activities
      const completedActivities = stage.activities.filter((a: any) => a.completed).length;
      return Math.round((completedActivities / stage.activities.length) * 100);
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

  const CircularProgress = ({ percentage, color, completed }: { percentage: number, color: string, completed: boolean }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    // Define proper color maps for gradients
    const colorMap: Record<string, { primary: string; secondary: string }> = {
      'pcs_blue': { primary: '#4f94d4', secondary: '#3b82f6' },
      'teal': { primary: '#14b8a6', secondary: '#0d9488' },
      'coral': { primary: '#f97316', secondary: '#ea580c' },
    };
    
    const colors = colorMap[color] || { primary: '#4f94d4', secondary: '#3b82f6' };
    const gradientBgId = `gradient-bg-${color}-${Math.random().toString(36).substr(2, 9)}`;
    const gradientProgressId = `gradient-progress-${color}-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 108 108">
          <defs>
            <linearGradient id={gradientBgId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#e5e7eb" />
            </linearGradient>
            <linearGradient id={gradientProgressId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={completed ? '#10b981' : colors.primary} />
              <stop offset="100%" stopColor={completed ? '#059669' : colors.secondary} />
            </linearGradient>
          </defs>
          <circle
            strokeWidth="6"
            stroke={`url(#${gradientBgId})`}
            fill="transparent"
            r={radius}
            cx="54"
            cy="54"
          />
          <circle
            strokeWidth="6"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke={`url(#${gradientProgressId})`}
            fill="transparent"
            r={radius}
            cx="54"
            cy="54"
            style={{ 
              transition: 'stroke-dashoffset 1s ease-out',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className={`text-2xl font-bold ${completed ? 'text-green-500' : 'text-navy'}`}>
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold text-navy mb-3 scroll-reveal">Your Learning Journey</h2>
        <p className="text-gray-600 scroll-reveal">Progress through the three stages of environmental action</p>
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
                    Complete
                  </Badge>
                )}
                {status === 'current' && (
                  <Badge className={`${getStageBadgeClasses(stage.color)} text-white text-xs`}>
                    In Progress
                  </Badge>
                )}
                {status === 'locked' && (
                  <Badge variant="secondary" className="text-gray-600 bg-gray-100 text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
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

              {/* Activities List */}
              <div className="space-y-2 flex-grow">
                {stage.activities.map((activity, activityIndex) => (
                  <div 
                    key={activityIndex}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      activity.completed ? 'bg-green-50 text-green-700' :
                      status === 'current' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-50 text-gray-500'
                    }`}
                    data-testid={`activity-${stage.id}-${activityIndex}`}
                  >
                    <div className="flex-shrink-0">
                      {activity.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : status === 'locked' ? (
                        <Lock className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium">{activity.name}</span>
                  </div>
                ))}
              </div>

              {status === 'locked' && (
                <div className="text-center mt-4 pt-4 border-t flex-shrink-0">
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600">Complete previous stage</span>
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
