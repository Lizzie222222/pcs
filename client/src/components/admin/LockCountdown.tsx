import { useState, useEffect } from 'react';
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockCountdownProps {
  expiresAt: Date;
  className?: string;
}

export function LockCountdown({ expiresAt, className }: LockCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    // Update remaining seconds immediately when expiresAt changes
    setRemainingSeconds(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));

    // Set up interval to update every second
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      // Clear interval if expired
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    // Cleanup on unmount or when expiresAt changes
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Format time display
  const formatTime = (seconds: number): string => {
    if (seconds === 0) {
      return 'Lock expired';
    }

    if (seconds <= 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSecs} second${remainingSecs !== 1 ? 's' : ''} remaining`;
  };

  // Calculate progress percentage (0-100)
  const progressPercentage = (remainingSeconds / 300) * 100;

  // Determine color based on remaining time
  const getProgressColor = (): string => {
    if (remainingSeconds >= 180) {
      // >= 60% (180 seconds or more) - Green
      return 'bg-green-500';
    } else if (remainingSeconds >= 60) {
      // 20-59% (60-179 seconds) - Orange
      return 'bg-orange-500';
    } else {
      // < 20% (less than 60 seconds) - Red
      return 'bg-red-500';
    }
  };

  // Determine text color to match progress bar
  const getTextColor = (): string => {
    if (remainingSeconds === 0) {
      return 'text-red-600';
    } else if (remainingSeconds >= 180) {
      return 'text-green-700';
    } else if (remainingSeconds >= 60) {
      return 'text-orange-700';
    } else {
      return 'text-red-700';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 opacity-70" />
        <span 
          className={cn('text-sm font-medium transition-colors duration-300', getTextColor())}
          data-testid="lock-countdown-text"
        >
          {formatTime(remainingSeconds)}
        </span>
      </div>
      <ProgressPrimitive.Root
        className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
        data-testid="lock-countdown-progress"
        value={progressPercentage}
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full w-full flex-1 transition-all duration-300', getProgressColor())}
          style={{ transform: `translateX(-${100 - progressPercentage}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}
