import { Check, AlertCircle, AlertTriangle, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

interface SidebarWizardNavProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  stepValidation: Record<number, StepValidation>;
  onStepChange: (stepId: number) => void;
}

function StepItem({
  step,
  isCurrent,
  isCompleted,
  validation,
  onStepChange,
}: {
  step: Step;
  isCurrent: boolean;
  isCompleted: boolean;
  validation: StepValidation;
  onStepChange: (stepId: number) => void;
}) {
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <button
      onClick={() => onStepChange(step.id)}
      className={cn(
        "w-full text-left px-4 py-3 rounded-lg transition-all group",
        "hover:bg-accent/50",
        isCurrent && "bg-primary/10 border-l-4 border-primary",
        !isCurrent && "border-l-4 border-transparent"
      )}
      data-testid={`sidebar-step-${step.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Step Number/Status Indicator */}
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-sm font-semibold",
              isCompleted && validation.valid && "bg-green-500 border-green-500 text-white",
              isCompleted && hasWarnings && !hasErrors && "bg-yellow-500 border-yellow-500 text-white",
              isCompleted && hasErrors && "bg-destructive border-destructive text-destructive-foreground",
              isCurrent && !isCompleted && "border-primary text-primary bg-background",
              !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground bg-background"
            )}
            data-testid={`step-indicator-${step.id}`}
          >
            {isCompleted && validation.valid && !hasWarnings && !hasErrors ? (
              <Check className="h-4 w-4" data-testid={`step-completed-${step.id}`} />
            ) : isCompleted && hasWarnings && !hasErrors ? (
              <AlertTriangle className="h-4 w-4" data-testid={`step-warning-${step.id}`} />
            ) : isCompleted && hasErrors ? (
              <AlertCircle className="h-4 w-4" data-testid={`step-error-${step.id}`} />
            ) : (
              <span>{step.id}</span>
            )}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium text-sm mb-0.5 transition-colors",
              isCurrent && "text-foreground",
              !isCurrent && isCompleted && "text-foreground/80",
              !isCurrent && !isCompleted && "text-muted-foreground"
            )}
            data-testid={`step-label-${step.id}`}
          >
            {step.label}
          </p>
          {step.description && (
            <p className="text-xs text-muted-foreground">
              {step.description}
            </p>
          )}

          {/* Validation Badges */}
          <div className="flex flex-wrap gap-1 mt-2">
            {hasErrors && (
              <Badge variant="destructive" className="text-xs h-5">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validation.errors.length} {validation.errors.length === 1 ? 'error' : 'errors'}
              </Badge>
            )}
            {hasWarnings && (
              <Badge variant="outline" className="text-xs h-5 border-yellow-500 text-yellow-600 dark:text-yellow-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {validation.warnings.length} {validation.warnings.length === 1 ? 'warning' : 'warnings'}
              </Badge>
            )}
            {isCompleted && validation.valid && !hasWarnings && !hasErrors && (
              <Badge variant="outline" className="text-xs h-5 border-green-500 text-green-600 dark:text-green-500">
                <Check className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function SidebarContent({
  steps,
  currentStep,
  completedSteps,
  stepValidation,
  onStepChange,
}: Omit<SidebarWizardNavProps, 'onStepChange'> & { onStepChange: (stepId: number) => void }) {
  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const isCurrent = currentStep === step.id;
        const isCompleted = completedSteps.includes(step.id);
        const validation = stepValidation[step.id] || { valid: true, warnings: [], errors: [] };

        return (
          <StepItem
            key={step.id}
            step={step}
            isCurrent={isCurrent}
            isCompleted={isCompleted}
            validation={validation}
            onStepChange={onStepChange}
          />
        );
      })}
    </div>
  );
}

export function SidebarWizardNav({
  steps,
  currentStep,
  completedSteps,
  stepValidation,
  onStepChange,
}: SidebarWizardNavProps) {
  const isMobile = useIsMobile();

  // Desktop: Fixed sidebar
  if (!isMobile) {
    return (
      <aside
        className="w-[280px] flex-shrink-0 bg-muted/30 border-r border-border sticky top-0 h-screen overflow-y-auto"
        data-testid="sidebar-wizard-nav"
      >
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Steps
          </h2>
          <SidebarContent
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            stepValidation={stepValidation}
            onStepChange={onStepChange}
          />
        </div>
      </aside>
    );
  }

  // Mobile: Sheet with trigger button
  return (
    <div className="mb-4" data-testid="mobile-wizard-nav">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            data-testid="button-open-steps-sheet"
          >
            <span className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Step {currentStep} of {steps.length}
            </span>
            <Badge variant="secondary">
              {completedSteps.length} / {steps.length} complete
            </Badge>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Navigation Steps</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SidebarContent
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              stepValidation={stepValidation}
              onStepChange={onStepChange}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
