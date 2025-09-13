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
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
          <circle
            className="text-gray-200"
            strokeWidth="4"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
          />
          <circle
            className={completed ? 'text-green-500' : `text-${color}`}
            strokeWidth="4"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${completed ? 'text-green-500' : 'text-navy'}`}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {stages.map((stage, index) => {
        const status = getStageStatus(stage);
        const percentage = getProgressPercentage(stage);
        const Icon = stage.icon;

        return (
          <Card 
            key={stage.id} 
            className={`transition-all duration-300 ${
              status === 'completed' ? 'ring-2 ring-green-500 shadow-lg' :
              status === 'current' ? 'ring-2 ring-blue-500 shadow-lg' :
              'opacity-75'
            }`}
            data-testid={`progress-stage-${stage.id}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? `bg-${stage.color} text-white` :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-navy">{stage.title}</h3>
                    <p className="text-sm text-gray-600">{stage.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  {status === 'completed' && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  )}
                  {status === 'current' && (
                    <Badge className={`bg-${stage.color} text-white`}>
                      In Progress
                    </Badge>
                  )}
                  {status === 'locked' && (
                    <Badge variant="secondary" className="text-gray-600">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
              </div>

              <CircularProgress 
                percentage={percentage} 
                color={stage.color}
                completed={stage.completed}
              />

              <div className="space-y-2">
                {stage.activities.map((activity, activityIndex) => (
                  <div 
                    key={activityIndex}
                    className="flex items-center gap-2 text-sm"
                    data-testid={`activity-${stage.id}-${activityIndex}`}
                  >
                    {activity.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : status === 'locked' ? (
                      <Lock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={
                      activity.completed ? 'text-gray-900' :
                      status === 'locked' ? 'text-gray-400' :
                      'text-gray-600'
                    }>
                      {activity.name}
                    </span>
                  </div>
                ))}
              </div>

              {status === 'locked' && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Complete previous stage to unlock
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
