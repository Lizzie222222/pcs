import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock } from "lucide-react";

import round1Badge from "@assets/round-1-badge.png";
import round2Badge from "@assets/round-2-badge.png";
import round3Badge from "@assets/round-3-badge.png";
import round4Badge from "@assets/round-4-badge.png";
import round5Badge from "@assets/round-5-badge.png";

const badges = [
  { round: 1, image: round1Badge },
  { round: 2, image: round2Badge },
  { round: 3, image: round3Badge },
  { round: 4, image: round4Badge },
  { round: 5, image: round5Badge },
];

interface RoundBadgesProps {
  roundsCompleted: number;
  showAll?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RoundBadges({ roundsCompleted, showAll = true, size = 'md' }: RoundBadgesProps) {
  const { t } = useTranslation('dashboard');

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-20 h-20 sm:w-28 sm:h-28',
  };

  const badgesToShow = showAll ? badges : badges.filter(b => b.round <= roundsCompleted);

  if (roundsCompleted === 0 && !showAll) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap" data-testid="round-badges-container">
      {badgesToShow.map(({ round, image }) => {
        const isEarned = round <= roundsCompleted;
        
        return (
          <Tooltip key={round}>
            <TooltipTrigger asChild>
              <div 
                className={`relative ${sizeClasses[size]} transition-all duration-300 ${
                  isEarned 
                    ? 'cursor-pointer hover:scale-110' 
                    : 'cursor-default'
                }`}
                data-testid={`badge-round-${round}${isEarned ? '-earned' : '-locked'}`}
              >
                <img
                  src={image}
                  alt={`Round ${round} ${isEarned ? 'Complete' : 'Locked'}`}
                  className={`w-full h-full object-contain transition-all duration-300 ${
                    isEarned 
                      ? 'opacity-100 drop-shadow-lg' 
                      : 'opacity-30 grayscale'
                  }`}
                />
                {!isEarned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-gray-800/60 rounded-full p-1.5">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {isEarned ? (
                <div className="text-center">
                  <p className="font-semibold text-green-600">Round {round} Complete!</p>
                  <p className="text-xs text-gray-500">You've earned this badge</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-semibold text-gray-600">Round {round} Locked</p>
                  <p className="text-xs text-gray-500">Complete Round {round} to unlock</p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function RoundBadgesCompact({ roundsCompleted }: { roundsCompleted: number }) {
  if (roundsCompleted === 0) {
    return null;
  }

  const earnedBadges = badges.filter(b => b.round <= roundsCompleted);

  return (
    <div className="flex items-center gap-1" data-testid="round-badges-compact">
      {earnedBadges.map(({ round, image }) => (
        <Tooltip key={round}>
          <TooltipTrigger asChild>
            <img
              src={image}
              alt={`Round ${round} Complete`}
              className="w-8 h-8 object-contain drop-shadow-sm hover:scale-110 transition-transform cursor-pointer"
              data-testid={`badge-compact-round-${round}`}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold text-green-600">Round {round} Complete!</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
