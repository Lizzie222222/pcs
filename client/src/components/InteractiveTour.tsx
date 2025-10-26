import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface InteractiveTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="progress-tab"]',
    title: "Progress Tracker",
    description: "This tab shows your school's journey through the three stages: Inspire, Investigate, and Act. You'll see your current stage and what's needed to advance.",
    position: 'bottom'
  },
  {
    target: '[data-tour="resources-tab"]',
    title: "Resources Library",
    description: "Find helpful guides, lesson plans, and educational materials to support your plastic reduction journey.",
    position: 'bottom'
  },
  {
    target: '[data-tour="action-plan-tab"]',
    title: "Action Plan",
    description: "Create and track your plastic reduction promises. Set targets for items like bottles, cups, and straws, and watch your environmental impact grow!",
    position: 'bottom'
  },
  {
    target: '[data-tour="team-tab"]',
    title: "Team Management",
    description: "Invite teachers and staff to join your school's team. Collaborate together to achieve your plastic reduction goals.",
    position: 'bottom'
  },
  {
    target: '[data-tour="events-tab"]',
    title: "Events & Workshops",
    description: "Join upcoming workshops, webinars, and community events to learn new strategies and connect with other schools.",
    position: 'bottom'
  }
];

export function InteractiveTour({ isActive, onComplete, onSkip }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentTourStep = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setTargetElement(null);
      return;
    }

    let retryCount = 0;
    const MAX_RETRIES = 20;
    let timeoutId: NodeJS.Timeout | null = null;

    const findAndHighlightTarget = () => {
      const element = document.querySelector(currentTourStep.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Calculate tooltip position
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        let top = rect.top + scrollTop;
        let left = rect.left + scrollLeft;

        // Position based on preference
        switch (currentTourStep.position) {
          case 'bottom':
            top = rect.bottom + scrollTop + 16;
            left = rect.left + scrollLeft + (rect.width / 2);
            break;
          case 'top':
            top = rect.top + scrollTop - 16;
            left = rect.left + scrollLeft + (rect.width / 2);
            break;
          case 'left':
            top = rect.top + scrollTop + (rect.height / 2);
            left = rect.left + scrollLeft - 16;
            break;
          case 'right':
            top = rect.top + scrollTop + (rect.height / 2);
            left = rect.right + scrollLeft + 16;
            break;
        }

        setTooltipPosition({ top, left });
      } else if (retryCount < MAX_RETRIES) {
        // If target not found, try again after a short delay (limited retries)
        retryCount++;
        timeoutId = setTimeout(findAndHighlightTarget, 100);
      } else {
        console.warn(`Tour: Could not find target element ${currentTourStep.target} after ${MAX_RETRIES} attempts`);
      }
    };

    findAndHighlightTarget();

    const handleResize = () => findAndHighlightTarget();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isActive, currentStep, currentTourStep]);

  if (!isActive || !targetElement) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-40"
        style={{ pointerEvents: 'none' }}
        data-testid="overlay-tour"
      />
      
      {/* Spotlight effect on target element */}
      <div
        className="fixed z-40 pointer-events-none"
        style={{
          top: targetElement.getBoundingClientRect().top - 4,
          left: targetElement.getBoundingClientRect().left - 4,
          width: targetElement.offsetWidth + 8,
          height: targetElement.offsetHeight + 8,
          boxShadow: '0 0 0 4px rgba(0, 166, 160, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
          borderRadius: '8px',
          transition: 'all 0.3s ease'
        }}
        data-testid="spotlight-tour"
      />

      {/* Tooltip card */}
      <Card 
        className="fixed z-50 w-80 shadow-xl"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: currentTourStep.position === 'bottom' || currentTourStep.position === 'top' 
            ? 'translateX(-50%)' 
            : currentTourStep.position === 'left'
            ? 'translateX(-100%)'
            : 'none'
        }}
        data-testid="card-tour-tooltip"
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1" data-testid="text-tour-title">
                {currentTourStep.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-1" data-testid="text-tour-step">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={onSkip}
              data-testid="button-close-tour"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-sm mb-4" data-testid="text-tour-description">
            {currentTourStep.description}
          </p>

          <div className="flex justify-between items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={cn(currentStep === 0 && "invisible")}
              data-testid="button-tour-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-1">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    index === currentStep ? "bg-[#00A6A0]" : "bg-gray-300"
                  )}
                  data-testid={`indicator-tour-step-${index}`}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={handleNext}
              className="bg-[#00A6A0] hover:bg-[#00A6A0]/90"
              data-testid="button-tour-next"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
