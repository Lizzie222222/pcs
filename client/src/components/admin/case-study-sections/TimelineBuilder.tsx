import { UseFormReturn, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Calendar, ChevronUp, ChevronDown } from "lucide-react";

interface TimelineBuilderProps {
  form: UseFormReturn<any>;
}

export function TimelineBuilder({ form }: TimelineBuilderProps) {
  const { t } = useTranslation('admin');
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "timelineSections",
  });

  const addSection = () => {
    append({
      title: "",
      content: "",
      imageUrl: "",
      order: fields.length,
    });
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
      updateOrders();
    }
  };

  const moveDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
      updateOrders();
    }
  };

  const updateOrders = () => {
    const currentSections = form.getValues("timelineSections");
    currentSections.forEach((section: any, index: number) => {
      form.setValue(`timelineSections.${index}.order`, index);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('case_study.project_timeline')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('case_study.create_chronological_timeline')}
          </p>
        </div>
        <Button
          type="button"
          onClick={addSection}
          variant="outline"
          size="sm"
          data-testid="button-add-timeline-section"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('case_study.add_section')}
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              {t('case_study.no_timeline_sections_yet')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {fields.map((field, index) => (
            <AccordionItem key={field.id} value={`timeline-${index}`}>
              <AccordionTrigger data-testid={`accordion-timeline-${index}`}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {form.watch(`timelineSections.${index}.title`) || t('case_study.section_number', { number: index + 1 })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      data-testid={`button-move-up-timeline-${index}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveDown(index)}
                      disabled={index === fields.length - 1}
                      data-testid={`button-move-down-timeline-${index}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`timelineSections.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('case_study.section_title_required')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('case_study.section_title_placeholder')}
                            {...field}
                            data-testid={`input-timeline-title-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`timelineSections.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('case_study.section_content')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('case_study.section_content_placeholder')}
                            className="min-h-[80px]"
                            {...field}
                            data-testid={`textarea-timeline-content-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`timelineSections.${index}.imageUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('case_study.section_image_url')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('case_study.section_image_placeholder')}
                            {...field}
                            value={field.value || ""}
                            data-testid={`input-timeline-image-${index}`}
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
                    onClick={() => {
                      remove(index);
                      updateOrders();
                    }}
                    data-testid={`button-remove-timeline-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Section
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
