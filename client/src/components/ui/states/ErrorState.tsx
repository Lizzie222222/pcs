import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | unknown;
  onRetry?: () => void;
  onGoHome?: () => void;
  showRetry?: boolean;
  showHome?: boolean;
  variant?: "default" | "card" | "inline";
  className?: string;
}

export function ErrorState({ 
  title,
  description,
  error,
  onRetry,
  onGoHome,
  showRetry = true,
  showHome = false,
  variant = "default",
  className
}: ErrorStateProps) {
  const { t } = useTranslation();
  // Extract error message if available
  const errorMessage = error instanceof Error ? error.message : 
                      typeof error === 'string' ? error : null;

  const content = (
    <div 
      className={cn(
        "text-center",
        variant === "default" && "py-12",
        variant === "inline" && "py-6",
        className
      )}
      role="alert"
      aria-live="assertive"
      data-testid="error-state"
    >
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title || t('messages.something_went_wrong')}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {description || t('messages.error_occurred_loading')}
      </p>
      
      {errorMessage && (
        <details className="mb-6 text-left max-w-md mx-auto">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            {t('messages.technical_details')}
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
            {errorMessage}
          </pre>
        </details>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {showRetry && onRetry && (
          <Button 
            onClick={onRetry}
            variant="default"
            className="btn-animate"
            data-testid="button-retry"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('messages.try_again')}
          </Button>
        )}
        
        {showHome && onGoHome && (
          <Button 
            onClick={onGoHome}
            variant="outline"
            className="btn-animate"
            data-testid="button-go-home"
          >
            <Home className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('messages.go_home')}
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === "card") {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
}