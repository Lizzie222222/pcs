import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTemplateConfig } from "../templateConfigurations";
import { Info, MessageSquare, BarChart3, Calendar } from "lucide-react";
import { QuotesManager } from "../../case-study-sections/QuotesManager";
import { ImpactMetricsBuilder } from "../../case-study-sections/ImpactMetricsBuilder";
import { TimelineBuilder } from "../../case-study-sections/TimelineBuilder";

interface Step4EnhancementsProps {
  form: UseFormReturn<any>;
}

export function Step4Enhancements({ form }: Step4EnhancementsProps) {
  const templateType = form.watch("templateType") || "standard";
  const config = getTemplateConfig(templateType);

  // Determine which sections are available for this template
  const availableSections = {
    quotes: config.requiredFields.allowQuotes,
    metrics: config.requiredFields.allowMetrics,
    timeline: config.requiredFields.allowTimeline,
  };

  const availableCount = Object.values(availableSections).filter(Boolean).length;

  // If no enhancements are available for this template
  if (availableCount === 0) {
    return (
      <div className="space-y-8">
        <h2 id="step-4-heading" className="text-2xl font-semibold">Step 4 · Enhancements</h2>
        
        <Card>
          <CardHeader>
            <h3 className="text-2xl font-semibold leading-none tracking-tight" data-testid="text-step4-title">Enhancement Options</h3>
            <CardDescription>
              Additional content to strengthen your case study
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The <strong>{config.name}</strong> template focuses on core content without additional enhancements.
                You can skip this step and proceed to review.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get default active tab (first available section)
  const getDefaultTab = () => {
    if (availableSections.quotes) return "quotes";
    if (availableSections.metrics) return "metrics";
    if (availableSections.timeline) return "timeline";
    return "quotes";
  };

  const quotesCount = form.watch("studentQuotes")?.length || 0;
  const metricsCount = form.watch("impactMetrics")?.length || 0;
  const timelineSectionsCount = form.watch("timelineSections")?.length || 0;

  return (
    <div className="space-y-8">
      <h2 id="step-4-heading" className="text-2xl font-semibold">Step 4 · Enhancements</h2>
      
      <Card>
        <CardHeader>
          <h3 className="text-2xl font-semibold leading-none tracking-tight" data-testid="text-step4-title">Enhancement Options</h3>
          <CardDescription>
            Add supporting content to make your case study more compelling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template-specific guidance */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{config.name} Template:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                {config.requiredFields.requiresQuotes && (
                  <li className="text-primary font-medium">
                    • Student quotes required (minimum: {config.requiredFields.minQuotes})
                  </li>
                )}
                {config.requiredFields.requiresMetrics && (
                  <li className="text-primary font-medium">
                    • Impact metrics required (minimum: {config.requiredFields.minMetrics})
                  </li>
                )}
                {config.requiredFields.requiresTimeline && (
                  <li className="text-primary font-medium">
                    • Timeline required (minimum: {config.requiredFields.minTimelineSections} sections)
                  </li>
                )}
                {!config.requiredFields.requiresQuotes && 
                 !config.requiredFields.requiresMetrics && 
                 !config.requiredFields.requiresTimeline && (
                  <li>• All enhancements are optional for this template</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Enhancement tabs */}
          <Tabs defaultValue={getDefaultTab()}>
            <TabsList className={`grid w-full grid-cols-${availableCount}`}>
              {availableSections.quotes && (
                <TabsTrigger value="quotes" data-testid="tab-quotes">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Quotes ({quotesCount})
                  {config.requiredFields.requiresQuotes && 
                   quotesCount < (config.requiredFields.minQuotes || 0) && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </TabsTrigger>
              )}
              
              {availableSections.metrics && (
                <TabsTrigger value="metrics" data-testid="tab-metrics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Metrics ({metricsCount})
                  {config.requiredFields.requiresMetrics && 
                   metricsCount < (config.requiredFields.minMetrics || 0) && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </TabsTrigger>
              )}
              
              {availableSections.timeline && (
                <TabsTrigger value="timeline" data-testid="tab-timeline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline ({timelineSectionsCount})
                  {config.requiredFields.requiresTimeline && 
                   timelineSectionsCount < (config.requiredFields.minTimelineSections || 0) && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            {availableSections.quotes && (
              <TabsContent value="quotes" className="mt-6">
                <QuotesManager form={form} />
              </TabsContent>
            )}

            {availableSections.metrics && (
              <TabsContent value="metrics" className="mt-6">
                <ImpactMetricsBuilder form={form} />
              </TabsContent>
            )}

            {availableSections.timeline && (
              <TabsContent value="timeline" className="mt-6">
                <TimelineBuilder form={form} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
