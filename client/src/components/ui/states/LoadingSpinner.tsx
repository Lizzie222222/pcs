import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8", 
  lg: "h-12 w-12",
  xl: "h-16 w-16"
};

export function LoadingSpinner({ 
  size = "md", 
  message = "Loading...", 
  className,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const content = (
    <div 
      className={cn(
        "flex flex-col items-center justify-center",
        fullScreen ? "min-h-screen" : "py-8",
        className
      )}
      role="status"
      aria-live="polite"
      data-testid="loading-spinner"
    >
      <Loader2 
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {message && (
        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );

  return content;
}