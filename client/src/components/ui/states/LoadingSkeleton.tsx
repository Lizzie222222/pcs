import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "table" | "custom";
  count?: number;
  className?: string;
  children?: React.ReactNode;
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-muted rounded",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function LoadingSkeleton({ 
  variant = "card", 
  count = 3,
  className,
  children 
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (children) {
    return (
      <div 
        className={className}
        role="status"
        aria-live="polite"
        aria-label="Loading content"
        data-testid="loading-skeleton"
      >
        {children}
        <span className="sr-only">Loading content...</span>
      </div>
    );
  }

  const renderSkeleton = () => {
    switch (variant) {
      case "card":
        return items.map((i) => (
          <Card key={i} className="animate-pulse">
            <SkeletonPulse className="h-48 rounded-t-lg" />
            <CardContent className="p-6 space-y-3">
              <SkeletonPulse className="h-4 w-3/4" />
              <SkeletonPulse className="h-4 w-1/2" />
              <SkeletonPulse className="h-16 w-full" />
            </CardContent>
          </Card>
        ));

      case "list":
        return items.map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <SkeletonPulse className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <SkeletonPulse className="h-4 w-3/4" />
              <SkeletonPulse className="h-3 w-1/2" />
            </div>
          </div>
        ));

      case "table":
        return (
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i} className="flex space-x-4 p-4">
                <SkeletonPulse className="h-4 w-1/4" />
                <SkeletonPulse className="h-4 w-1/3" />
                <SkeletonPulse className="h-4 w-1/4" />
                <SkeletonPulse className="h-4 w-1/6" />
              </div>
            ))}
          </div>
        );

      default:
        return items.map((i) => (
          <SkeletonPulse key={i} className="h-20 w-full mb-4" />
        ));
    }
  };

  return (
    <div 
      className={cn("space-y-4", className)}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      data-testid="loading-skeleton"
    >
      {renderSkeleton()}
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export { SkeletonPulse };