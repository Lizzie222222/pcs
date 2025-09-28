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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const percentage = getProgressPercentage(stage);
          const Icon = stage.icon;

          return (
            <Card 
              key={stage.id} 
              className={`group transition-all duration-500 hover:-translate-y-2 border-0 overflow-hidden scroll-reveal bg-white/90 backdrop-blur-sm ${
                status === 'completed' ? 'shadow-2xl ring-2 ring-green-400/50 bg-gradient-to-br from-green-50 to-white' :
                status === 'current' ? 'shadow-2xl ring-2 ring-blue-400/50 bg-gradient-to-br from-blue-50 to-white' :
                'shadow-lg hover:shadow-xl opacity-80 hover:opacity-100 bg-gradient-to-br from-gray-50 to-white'
              }`}
              style={{ animationDelay: `${index * 0.2}s` }}
              data-testid={`progress-stage-${stage.id}`}
            >
            <CardContent className="p-8">
              {/* Enhanced Header */}
              <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 ${
                    status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-400 text-white' :
                    status === 'current' ? `bg-gradient-to-br from-${stage.color} to-${stage.color}/80 text-white` :
                    'bg-gradient-to-br from-gray-300 to-gray-200 text-gray-600'
                  }`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  {status === 'completed' && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-navy group-hover:text-ocean-blue transition-colors">{stage.title}</h3>
                  <p className="text-gray-600 text-sm">{stage.description}</p>
                  
                  {/* Status Badge */}
                  <div className="flex justify-center">
                    {status === 'completed' && (
                      <Badge className="bg-gradient-to-r from-green-500 to-green-400 text-white border-0 shadow-md">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    )}
                    {status === 'current' && (
                      <Badge className={`bg-gradient-to-r from-${stage.color} to-${stage.color}/80 text-white border-0 shadow-md`}>
                        In Progress
                      </Badge>
                    )}
                    {status === 'locked' && (
                      <Badge variant="secondary" className="text-gray-600 bg-gray-100 border-0">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <CircularProgress 
                percentage={percentage} 
                color={stage.color}
                completed={stage.completed}
              />

              {/* Enhanced Activities List */}
              <div className="space-y-3 mb-6">
                {stage.activities.map((activity, activityIndex) => (
                  <div 
                    key={activityIndex}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                      activity.completed ? 'bg-green-50 border border-green-200' :
                      status === 'current' ? 'bg-blue-50 border border-blue-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                    data-testid={`activity-${stage.id}-${activityIndex}`}
                  >
                    <div className="flex-shrink-0">
                      {activity.completed ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      ) : status === 'locked' ? (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                          <Lock className="h-3 w-3 text-gray-500" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                          <Circle className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${
                      activity.completed ? 'text-green-700' :
                      status === 'locked' ? 'text-gray-400' :
                      'text-gray-700'
                    }`}>
                      {activity.name}
                    </span>
                  </div>
                ))}
              </div>

              {status === 'locked' && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <Lock className="h-4 w-4 text-gray-500" />
                    <span className="text-xs text-gray-600 font-medium">Complete previous stage to unlock</span>
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
