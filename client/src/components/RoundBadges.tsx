import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  const [selectedBadge, setSelectedBadge] = useState<{ round: number; image: string; isEarned: boolean } | null>(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-24 h-24 sm:w-32 sm:h-32',
  };

  const badgesToShow = showAll ? badges : badges.filter(b => b.round <= roundsCompleted);

  if (roundsCompleted === 0 && !showAll) {
    return null;
  }

  return (
    <>
      <div className="flex items-center flex-wrap" data-testid="round-badges-container">
        {badgesToShow.map(({ round, image }, index) => {
          const isEarned = round <= roundsCompleted;
          
          return (
            <Tooltip key={round}>
              <TooltipTrigger asChild>
                <div 
                  className={`relative ${sizeClasses[size]} transition-all duration-300 ${index > 0 ? '-ml-4 sm:-ml-6' : ''} ${
                    isEarned 
                      ? 'cursor-pointer hover:scale-110 hover:z-10' 
                      : 'cursor-pointer hover:scale-105'
                  }`}
                  onClick={() => setSelectedBadge({ round, image, isEarned })}
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
                    <p className="text-xs text-gray-500">Click to view</p>
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

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-md p-6 bg-white rounded-xl shadow-2xl">
          {selectedBadge && (
            <div className="flex flex-col items-center">
              <img
                src={selectedBadge.image}
                alt={`Round ${selectedBadge.round} Badge`}
                className={`w-64 h-64 sm:w-80 sm:h-80 object-contain ${
                  selectedBadge.isEarned ? '' : 'opacity-40 grayscale'
                }`}
              />
              <div className="mt-4 text-center">
                {selectedBadge.isEarned ? (
                  <>
                    <p className="font-bold text-xl text-green-600">Round {selectedBadge.round} Complete!</p>
                    <p className="text-sm text-gray-600 mt-1">You've earned this badge</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-xl text-gray-600">Round {selectedBadge.round} Locked</p>
                    <p className="text-sm text-gray-500 mt-1">Complete Round {selectedBadge.round} to unlock this badge</p>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
