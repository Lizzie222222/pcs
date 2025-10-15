import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, Image, Clock, TrendingUp } from "lucide-react";

interface TemplateTypeSelectorProps {
  form: UseFormReturn<any>;
}

const TEMPLATE_TYPES = [
  {
    value: "standard",
    label: "Standard",
    description: "Classic case study layout with all sections visible",
    icon: FileText,
  },
  {
    value: "visual",
    label: "Visual Story",
    description: "Image-focused layout emphasizing visual impact",
    icon: Image,
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Chronological layout highlighting project progression",
    icon: Clock,
  },
  {
    value: "metrics",
    label: "Impact Focused",
    description: "Data-driven layout showcasing quantifiable results",
    icon: TrendingUp,
  },
];

// SVG Preview Components
const StandardPreview = () => (
  <svg viewBox="0 0 200 140" className="w-full h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="180" height="25" rx="4" fill="currentColor" className="text-primary/20" />
    <rect x="10" y="45" width="85" height="85" rx="4" fill="currentColor" className="text-primary/10" />
    <rect x="105" y="45" width="85" height="40" rx="4" fill="currentColor" className="text-primary/10" />
    <rect x="105" y="90" width="85" height="40" rx="4" fill="currentColor" className="text-primary/10" />
  </svg>
);

const VisualStoryPreview = () => (
  <svg viewBox="0 0 200 140" className="w-full h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="85" height="60" rx="4" fill="currentColor" className="text-primary/20" />
    <rect x="105" y="10" width="85" height="60" rx="4" fill="currentColor" className="text-primary/15" />
    <rect x="10" y="80" width="85" height="50" rx="4" fill="currentColor" className="text-primary/15" />
    <rect x="105" y="80" width="85" height="50" rx="4" fill="currentColor" className="text-primary/10" />
  </svg>
);

const TimelinePreview = () => (
  <svg viewBox="0 0 200 140" className="w-full h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="30" y1="10" x2="30" y2="130" stroke="currentColor" strokeWidth="3" className="text-primary/30" />
    <circle cx="30" cy="25" r="6" fill="currentColor" className="text-primary" />
    <rect x="45" y="15" width="145" height="20" rx="4" fill="currentColor" className="text-primary/10" />
    <circle cx="30" cy="60" r="6" fill="currentColor" className="text-primary" />
    <rect x="45" y="50" width="145" height="20" rx="4" fill="currentColor" className="text-primary/15" />
    <circle cx="30" cy="95" r="6" fill="currentColor" className="text-primary" />
    <rect x="45" y="85" width="145" height="20" rx="4" fill="currentColor" className="text-primary/20" />
  </svg>
);

const MetricsPreview = () => (
  <svg viewBox="0 0 200 140" className="w-full h-32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="85" height="60" rx="4" fill="currentColor" className="text-primary/20" />
    <text x="52" y="50" className="text-2xl font-bold fill-current text-primary" textAnchor="middle">500</text>
    <rect x="105" y="10" width="85" height="60" rx="4" fill="currentColor" className="text-primary/15" />
    <text x="147" y="50" className="text-2xl font-bold fill-current text-primary" textAnchor="middle">85%</text>
    <rect x="10" y="80" width="180" height="50" rx="4" fill="currentColor" className="text-primary/10" />
  </svg>
);

const previewComponents = {
  standard: StandardPreview,
  visual: VisualStoryPreview,
  timeline: TimelinePreview,
  metrics: MetricsPreview,
};

export function TemplateTypeSelector({ form }: TemplateTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold" data-testid="text-template-selector-title">
          Choose Your Story Template
        </h2>
        <p className="text-muted-foreground" data-testid="text-template-selector-description">
          Select a template that best showcases your school's plastic reduction journey
        </p>
      </div>

      <FormField
        control={form.control}
        name="templateType"
        render={({ field }) => (
          <FormItem className="space-y-4">
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value || "standard"}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                data-testid="radio-group-template-type"
              >
                {TEMPLATE_TYPES.map((template) => {
                  const PreviewComponent = previewComponents[template.value as keyof typeof previewComponents];
                  const IconComponent = template.icon;
                  
                  return (
                    <Card
                      key={template.value}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        field.value === template.value
                          ? "border-primary border-2 shadow-md bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => field.onChange(template.value)}
                      data-testid={`card-template-${template.value}`}
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-center gap-3 mb-3">
                          <RadioGroupItem
                            value={template.value}
                            id={template.value}
                            data-testid={`radio-template-${template.value}`}
                            className="shrink-0"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <IconComponent className="h-5 w-5 text-primary" />
                            <Label htmlFor={template.value} className="cursor-pointer font-semibold text-base">
                              {template.label}
                            </Label>
                          </div>
                        </div>
                        
                        {/* Visual Preview */}
                        <div className="bg-muted/30 rounded-lg p-3 mb-3">
                          <PreviewComponent />
                        </div>
                        
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
