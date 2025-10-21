import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Image, Clock, TrendingUp, Eye } from "lucide-react";

interface TemplateTypeSelectorProps {
  form: UseFormReturn<any>;
}

const TEMPLATE_TYPES = [
  {
    value: "standard",
    label: "Standard",
    description: "Classic case study layout with all sections visible",
    icon: FileText,
    exampleFeatures: [
      "Hero image with title overlay",
      "Full description and impact sections",
      "Image galleries and student quotes",
      "Before/After comparisons"
    ],
    bestFor: "Comprehensive stories with diverse content types"
  },
  {
    value: "visual",
    label: "Visual Story",
    description: "Image-focused layout emphasizing visual impact",
    icon: Image,
    exampleFeatures: [
      "Large, prominent photo galleries",
      "Visual-first content flow",
      "Image carousels and grids",
      "Minimal text, maximum imagery"
    ],
    bestFor: "Stories with stunning photos and visual transformation"
  },
  {
    value: "timeline",
    label: "Timeline",
    description: "Chronological layout highlighting project progression",
    icon: Clock,
    exampleFeatures: [
      "Vertical timeline with milestones",
      "Chronological story progression",
      "Date-stamped achievements",
      "Journey visualization"
    ],
    bestFor: "Long-term projects showing evolution over time"
  },
  {
    value: "metrics",
    label: "Impact Focused",
    description: "Data-driven layout showcasing quantifiable results",
    icon: TrendingUp,
    exampleFeatures: [
      "Large impact metric displays",
      "Animated counters and statistics",
      "Data visualization focus",
      "Quantifiable achievements highlighted"
    ],
    bestFor: "Stories with impressive measurable results and data"
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
                    <Tooltip key={template.value} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Card
                          className={`cursor-pointer transition-all hover:shadow-lg relative ${
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
                              <Eye className="h-4 w-4 text-muted-foreground" />
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
                      </TooltipTrigger>
                      <TooltipContent 
                        side="bottom" 
                        className="max-w-96 p-4" 
                        data-testid={`hover-preview-${template.value}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-base">{template.label} Template</h3>
                          </div>
                          
                          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                            <PreviewComponent />
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">This template includes:</p>
                            <ul className="space-y-1 text-sm">
                              {template.exampleFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Best for:</span> {template.bestFor}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
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
