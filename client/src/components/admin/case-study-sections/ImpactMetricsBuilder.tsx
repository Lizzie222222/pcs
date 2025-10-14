import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, BarChart3 } from "lucide-react";

interface ImpactMetricsBuilderProps {
  form: UseFormReturn<any>;
}

export function ImpactMetricsBuilder({ form }: ImpactMetricsBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "impactMetrics",
  });

  const addMetric = () => {
    append({
      label: "",
      value: "",
      unit: "",
      icon: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Impact Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Add quantifiable metrics to showcase the project's impact
          </p>
        </div>
        <Button
          type="button"
          onClick={addMetric}
          variant="outline"
          size="sm"
          data-testid="button-add-metric"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Metric
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No impact metrics yet. Click "Add Metric" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {fields.map((field, index) => (
            <AccordionItem key={field.id} value={`metric-${index}`}>
              <AccordionTrigger data-testid={`accordion-metric-${index}`}>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>
                    {form.watch(`impactMetrics.${index}.label`) || `Metric ${index + 1}`}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name={`impactMetrics.${index}.label`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Metric Label *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Plastic Items Reduced"
                            {...field}
                            data-testid={`input-metric-label-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`impactMetrics.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 500 or 85%"
                            {...field}
                            data-testid={`input-metric-value-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`impactMetrics.${index}.unit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., items/week, kg, %"
                            {...field}
                            value={field.value || ""}
                            data-testid={`input-metric-unit-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`impactMetrics.${index}.icon`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon Name (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Recycle, Leaf, TrendingDown"
                            {...field}
                            value={field.value || ""}
                            data-testid={`input-metric-icon-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    data-testid={`button-remove-metric-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Metric
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
