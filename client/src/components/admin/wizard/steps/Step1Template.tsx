import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { TemplateTypeSelector } from "../../case-study-sections/TemplateTypeSelector";

interface Step1TemplateProps {
  form: UseFormReturn<any>;
}

export function Step1Template({ form }: Step1TemplateProps) {
  return (
    <div className="space-y-8">
      <h2 id="step-1-heading" className="text-2xl font-semibold" data-testid="text-step1-heading">
        Step 1 · Choose Template
      </h2>
      
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight" data-testid="text-template-title">
            Choose Your Template
          </h3>
          <CardDescription>
            Select the layout that best showcases your school's story. Each template is optimized for different types of content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateTypeSelector form={form} />
        </CardContent>
      </Card>
    </div>
  );
}
