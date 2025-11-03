import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RoundProgressBadgesProps {
  currentRound: number;
  roundsCompleted: number;
  progressPercentage: number;
  className?: string;
  showProgressBar?: boolean;
}

export function RoundProgressBadges({
  currentRound,
  roundsCompleted,
  progressPercentage,
  className,
  showProgressBar = true,
}: RoundProgressBadgesProps) {
  const currentRoundProgress = progressPercentage % 100 || (roundsCompleted > 0 ? 100 : 0);
  
  const completedRounds = roundsCompleted > 0 ? roundsCompleted : 0;

  return (
    <div className={cn("space-y-3", className)} data-testid="round-progress-badges">
      <div className="flex flex-wrap items-center gap-2">
        {completedRounds > 0 && Array.from({ length: completedRounds }, (_, i) => (
          <Badge
            key={`completed-${i + 1}`}
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1.5 px-3 py-1"
            data-testid={`badge-completed-round-${i + 1}`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="font-medium">Round {i + 1}</span>
          </Badge>
        ))}
        
        <Badge
          variant="outline"
          className="bg-pcs_blue/10 text-pcs_blue border-pcs_blue/30 px-3 py-1 font-medium"
          data-testid={`badge-current-round-${currentRound}`}
        >
          Round {currentRound} - {currentRoundProgress}%
        </Badge>
      </div>

      {showProgressBar && (
        <div className="space-y-1.5" data-testid="progress-bar-container">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Current Round Progress</span>
            <span className="font-medium text-pcs_blue">{currentRoundProgress}%</span>
          </div>
          <Progress 
            value={currentRoundProgress} 
            className="h-2"
            data-testid="progress-bar-current-round"
          />
        </div>
      )}
    </div>
  );
}
