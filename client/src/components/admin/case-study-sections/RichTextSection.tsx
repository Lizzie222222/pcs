import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn, FormProvider } from "react-hook-form";
import { RichTextEditor } from "../RichTextEditor";

interface RichTextSectionProps {
  form: UseFormReturn<any>;
}

export function RichTextSection({ form }: RichTextSectionProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title *</FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter case study title" 
                {...field} 
                data-testid="input-case-study-title"
              />
            </FormControl>
            <FormDescription>
              A compelling title that captures the essence of your case study
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormProvider {...form}>
        <RichTextEditor
          name="description"
          label="Description"
          placeholder="Provide a detailed description of the case study"
          description="A comprehensive overview of the project and its goals"
        />
      </FormProvider>

      <FormField
        control={form.control}
        name="impact"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Impact Summary</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the impact and outcomes achieved"
                className="min-h-[100px]"
                {...field}
                value={field.value || ""}
                data-testid="textarea-case-study-impact"
              />
            </FormControl>
            <FormDescription>
              Highlight the key achievements and positive changes
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
