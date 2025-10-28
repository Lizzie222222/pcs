import { UseFormReturn, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation('admin');
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "impactMetrics",
  });

  const addMetric = () => {
    append({
      label: "",
      value: "",
      unit: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('case_study.impact_metrics')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('case_study.add_quantifiable_metrics')}
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
          {t('case_study.add_metric')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              {t('case_study.no_impact_metrics_yet')}
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
                    {form.watch(`impactMetrics.${index}.label`) || t('case_study.metric_number', { number: index + 1 })}
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
                        <FormLabel>{t('case_study.metric_label_required')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('case_study.metric_label_placeholder')}
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
                        <FormLabel>{t('case_study.metric_value_required')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('case_study.metric_value_placeholder')}
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
                        <FormLabel>{t('case_study.metric_unit')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('case_study.metric_unit_placeholder')}
                            {...field}
                            value={field.value || ""}
                            data-testid={`input-metric-unit-${index}`}
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
