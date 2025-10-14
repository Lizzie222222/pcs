import { useState } from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Quote } from "lucide-react";

interface QuotesManagerProps {
  form: UseFormReturn<any>;
}

export function QuotesManager({ form }: QuotesManagerProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "studentQuotes",
  });

  const addQuote = () => {
    append({
      name: "",
      role: "",
      quote: "",
      photoUrl: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Student Quotes</h3>
          <p className="text-sm text-muted-foreground">
            Add testimonials and quotes from students involved in the project
          </p>
        </div>
        <Button
          type="button"
          onClick={addQuote}
          variant="outline"
          size="sm"
          data-testid="button-add-quote"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Quote
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Quote className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No student quotes yet. Click "Add Quote" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {fields.map((field, index) => (
            <AccordionItem key={field.id} value={`quote-${index}`}>
              <AccordionTrigger data-testid={`accordion-quote-${index}`}>
                <div className="flex items-center gap-2">
                  <Quote className="h-4 w-4" />
                  <span>
                    {form.watch(`studentQuotes.${index}.name`) || `Quote ${index + 1}`}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name={`studentQuotes.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter student name"
                            {...field}
                            data-testid={`input-quote-name-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`studentQuotes.${index}.role`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role/Grade</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Year 5 Student, Eco-Champion"
                            {...field}
                            value={field.value || ""}
                            data-testid={`input-quote-role-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`studentQuotes.${index}.quote`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quote *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the student's quote"
                            className="min-h-[80px]"
                            {...field}
                            data-testid={`textarea-quote-text-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`studentQuotes.${index}.photoUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            {...field}
                            value={field.value || ""}
                            data-testid={`input-quote-photo-${index}`}
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
                    data-testid={`button-remove-quote-${index}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Quote
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
