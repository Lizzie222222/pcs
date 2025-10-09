import { Check } from 'lucide-react';

interface RegistrationStepperProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ number: number; title: string }>;
}

export default function RegistrationStepper({ currentStep, totalSteps, steps }: RegistrationStepperProps) {
  return (
    <div className="w-full mb-8" data-testid="registration-stepper">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300
                  ${currentStep > step.number 
                    ? 'bg-teal text-white' 
                    : currentStep === step.number
                    ? 'bg-ocean-blue text-white'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
                data-testid={`step-indicator-${step.number}`}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <p 
                className={`
                  mt-2 text-xs font-medium text-center
                  ${currentStep >= step.number ? 'text-navy' : 'text-gray-400'}
                `}
                data-testid={`step-label-${step.number}`}
              >
                {step.title}
              </p>
            </div>
            
            {index < steps.length - 1 && (
              <div 
                className={`
                  h-1 flex-1 mx-2 transition-all duration-300
                  ${currentStep > step.number ? 'bg-teal' : 'bg-gray-200'}
                `}
                data-testid={`step-connector-${step.number}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
