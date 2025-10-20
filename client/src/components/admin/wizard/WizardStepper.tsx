import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

export function WizardStepper({ steps, currentStep, completedSteps }: WizardStepperProps) {
  return (
    <div className="w-full py-6" data-testid="wizard-stepper">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1" data-testid={`step-${step.id}`}>
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div className="relative">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isCompleted && "bg-primary border-primary text-primary-foreground",
                      isCurrent && !isCompleted && "border-primary text-primary bg-background",
                      !isCurrent && !isCompleted && "border-muted-foreground/30 text-muted-foreground bg-background"
                    )}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" data-testid={`step-completed-${step.id}`} />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      (isCurrent || isCompleted) && "text-foreground",
                      !isCurrent && !isCompleted && "text-muted-foreground"
                    )}
                    data-testid={`step-label-${step.id}`}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-2 -mt-12">
                  <div
                    className={cn(
                      "h-full transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    data-testid={`step-connector-${step.id}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
