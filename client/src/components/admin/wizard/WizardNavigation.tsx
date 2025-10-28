import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, Eye } from "lucide-react";
import { ButtonSpinner } from "@/components/ui/ButtonSpinner";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSaving: boolean;
  canProceed: boolean;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSaveDraft,
  onPublish,
  isFirstStep,
  isLastStep,
  isSaving,
  canProceed,
}: WizardNavigationProps) {
  return (
    <div className="sticky bottom-0 bg-background border-t py-4 mt-8">
      <div className="flex items-center justify-between">
        {/* Left: Previous Button */}
        <div>
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={onPrevious}
              disabled={isSaving}
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        {/* Center: Save Draft Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving}
            data-testid="button-save-draft"
          >
            {isSaving ? (
              <ButtonSpinner className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
        </div>

        {/* Right: Next/Publish Button */}
        <div>
          {isLastStep ? (
            <Button
              type="button"
              onClick={onPublish}
              disabled={isSaving || !canProceed}
              data-testid="button-publish"
            >
              {isSaving ? (
                <ButtonSpinner className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Publish
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onNext}
              disabled={!canProceed || isSaving}
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-3 text-center text-sm text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
