import { Eye } from "lucide-react";

interface ViewingIndicatorProps {
  viewers: Array<{ userId: string; name: string }>;
  currentUserId?: string;
}

export function ViewingIndicator({ viewers, currentUserId }: ViewingIndicatorProps) {
  // Filter out current user
  const otherViewers = viewers.filter(v => v.userId !== currentUserId);
  
  if (otherViewers.length === 0) return null;
  
  return (
    <div 
      className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2" 
      data-testid="viewing-indicator"
    >
      <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-blue-700 dark:text-blue-300">
        {otherViewers.length === 1 
          ? `${otherViewers[0].name} is viewing`
          : `${otherViewers.length} admins are viewing`
        }
      </span>
    </div>
  );
}
