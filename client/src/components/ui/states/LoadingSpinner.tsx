import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

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

function getRandomFunMessage(t: any): string {
  try {
    const messages = t('status.fun_loading_messages', { returnObjects: true }) as string[] | string;
    
    if (Array.isArray(messages) && messages.length > 0) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
    return t('status.loading');
  } catch (error) {
    return t('status.loading');
  }
}

export function LoadingSpinner({ 
  size = "md", 
  message, 
  className,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const { t, i18n } = useTranslation();
  
  // Initialize with a random fun message immediately
  const [funMessage, setFunMessage] = useState<string>(() => getRandomFunMessage(t));
  
  // Update when language changes
  useEffect(() => {
    setFunMessage(getRandomFunMessage(t));
  }, [t, i18n.language]);
  
  // Always use fun messages - ignore the message prop (old custom messages were boring)
  const displayMessage = funMessage;
  
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
      <div className="relative inline-block">
        <div 
          className={cn(
            "absolute inset-0 rounded-full blur-sm opacity-60",
            sizeClasses[size]
          )}
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.8) 0%, rgba(14,165,233,0.6) 50%, rgba(244,114,182,0.4) 100%)',
          }}
          aria-hidden="true"
        />
        <Loader2 
          className={cn(
            "animate-spin relative z-10",
            sizeClasses[size]
          )}
          style={{
            color: '#06b6d4',
            filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.5))'
          }}
          aria-hidden="true"
        />
      </div>
      {displayMessage && (
        <p className="mt-2 text-sm text-muted-foreground">
          {displayMessage}
        </p>
      )}
      <span className="sr-only">{displayMessage}</span>
    </div>
  );

  return content;
}