import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  variant?: "default" | "card";
  className?: string;
}

export function EmptyState({ 
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className
}: EmptyStateProps) {
  const content = (
    <div 
      className={cn(
        "text-center py-12",
        className
      )}
      data-testid="empty-state"
    >
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <Button 
              onClick={action.onClick}
              variant={action.variant || "default"}
              className="btn-animate"
              data-testid="button-primary-action"
            >
              {action.label}
            </Button>
          )}
          
          {secondaryAction && (
            <Button 
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || "outline"}
              className="btn-animate"
              data-testid="button-secondary-action"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
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