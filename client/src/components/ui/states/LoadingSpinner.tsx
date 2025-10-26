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
  
  // Use provided message if available, otherwise use fun random message
  const displayMessage = message || funMessage;
  
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
      <div className="relative inline-flex items-center justify-center">
        {/* Animated ocean gradient spinner */}
        <div 
          className={cn(
            "rounded-full animate-spin",
            sizeClasses[size]
          )}
          style={{
            background: 'conic-gradient(from 0deg, #06b6d4, #0ea5e9, #3b82f6, #8b5cf6, #ec4899, #f97316, #06b6d4)',
            WebkitMask: 'radial-gradient(circle, transparent 50%, black 50%)',
            mask: 'radial-gradient(circle, transparent 50%, black 50%)',
            filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.6))',
            animation: 'spin 1s linear infinite'
          }}
          aria-hidden="true"
        />
        {/* Pulsing glow effect */}
        <div 
          className={cn(
            "absolute rounded-full opacity-40 blur-md",
            sizeClasses[size]
          )}
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.8), rgba(236,72,153,0.4), transparent)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
          aria-hidden="true"
        />
      </div>
      {displayMessage && (
        <p className="mt-4 text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          {displayMessage}
        </p>
      )}
      <span className="sr-only">{displayMessage}</span>
    </div>
  );

  return content;
}