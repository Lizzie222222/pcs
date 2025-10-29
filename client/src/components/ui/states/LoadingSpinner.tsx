import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  message, 
  className,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const { t } = useTranslation();
  
  // Use provided message or simple default
  const displayMessage = message || t('status.loading');
  
  const content = (
    <div 
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullScreen ? "min-h-screen" : "py-8",
        className
      )}
      role="status"
      aria-live="polite"
      data-testid="loading-spinner"
    >
      <Loader2 
        className={cn(
          "animate-spin text-pcs_blue",
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      {displayMessage && (
        <p className="text-sm font-medium text-gray-600">
          {displayMessage}
        </p>
      )}
      <span className="sr-only">{displayMessage}</span>
    </div>
  );

  return content;
}
