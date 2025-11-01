import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RegistrationStepper from './RegistrationStepper';
import Step1SchoolInfo, { type Step1Data } from './registration/Step1SchoolInfo';
import Step2TeacherInfo, { type Step2Data } from './registration/Step2TeacherInfo';
import Step3StudentInfo, { type Step3Data } from './registration/Step3StudentInfo';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface MultiStepSchoolRegistrationProps {
  onClose: () => void;
}

type RegistrationData = Step1Data & Step2Data & Step3Data;

export default function MultiStepSchoolRegistration({ onClose }: MultiStepSchoolRegistrationProps) {
  const { t, i18n } = useTranslation(['forms', 'common']);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);

  const steps = [
    { number: 1, title: t('forms:registration_steps.step_school') },
    { number: 2, title: t('forms:registration_steps.step_teacher') },
    { number: 3, title: t('forms:registration_steps.step_student') },
  ];

  const handleStep1Next = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2Next = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep3Back = () => {
    setCurrentStep(2);
  };

  const handleFinalSubmit = async (data: Step3Data) => {
    if (!step1Data || !step2Data) {
      toast({
        title: "Error",
        description: "Missing registration data. Please start over.",
        variant: "destructive"
      });
      return;
    }

    setStep3Data(data);
    setIsSubmitting(true);

    try {
      const registrationData: RegistrationData & { language?: string } = {
        ...step1Data,
        ...step2Data,
        ...data,
        language: i18n.language, // Include current UI language for welcome email
      };

      const response = await apiRequest("POST", "/api/schools/register-multi-step", registrationData);
      
      toast({
        title: t('forms:school_registration.success_title'),
        description: t('forms:school_registration.success_message'),
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/schools'] });

      setLocation('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: t('forms:school_registration.error_title'),
        description: error.message || t('forms:school_registration.error_message'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full" data-testid="multi-step-registration">
      <RegistrationStepper 
        currentStep={currentStep} 
        totalSteps={3}
        steps={steps}
      />

      {currentStep === 1 && (
        <Step1SchoolInfo
          initialData={step1Data || undefined}
          onNext={handleStep1Next}
          onCancel={onClose}
        />
      )}

      {currentStep === 2 && (
        <Step2TeacherInfo
          initialData={step2Data || undefined}
          onNext={handleStep2Next}
          onBack={handleStep2Back}
        />
      )}

      {currentStep === 3 && step1Data && (
        <Step3StudentInfo
          initialData={step3Data || undefined}
          country={step1Data.country}
          onSubmit={handleFinalSubmit}
          onBack={handleStep3Back}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
