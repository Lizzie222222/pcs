import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Sparkles } from "lucide-react";

interface TemplateStatusSectionProps {
  form: UseFormReturn<any>;
}

const PROGRAM_STAGES = [
  { value: "inspire", label: "Inspire" },
  { value: "investigate", label: "Investigate" },
  { value: "act", label: "Act" },
];

export function TemplateStatusSection({ form }: TemplateStatusSectionProps) {
  const status = form.watch("status");
  const featured = form.watch("featured");

  return (
    <div className="space-y-6">
      {/* Program Stage */}
      <FormField
        control={form.control}
        name="stage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Program Stage *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-stage">
                  <SelectValue placeholder="Select program stage" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {PROGRAM_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Which stage of the Plastic Clever Schools program does this case study belong to?
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status */}
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Publication Status *</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    <span>Draft</span>
                  </div>
                </SelectItem>
                <SelectItem value="published">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span>Published</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              {status === "draft"
                ? "This case study is only visible to admins"
                : "This case study will be publicly visible"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Featured Toggle */}
      <FormField
        control={form.control}
        name="featured"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <FormLabel className="text-base">Featured Case Study</FormLabel>
              </div>
              <FormDescription>
                Featured case studies appear prominently on the inspiration page
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value || false}
                onCheckedChange={field.onChange}
                data-testid="switch-featured"
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Priority (only shown if featured) */}
      {featured && (
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Priority</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString() || "0"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Normal (0)</SelectItem>
                  <SelectItem value="1">High (1)</SelectItem>
                  <SelectItem value="2">Higher (2)</SelectItem>
                  <SelectItem value="3">Highest (3)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Higher priority case studies appear first in featured sections
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* SEO Fields */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SEO & Metadata</h3>
        
        <FormField
          control={form.control}
          name="metaDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta Description</FormLabel>
              <FormControl>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Brief description for search engines (150-160 characters)"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-meta-description"
                />
              </FormControl>
              <FormDescription>
                This appears in search engine results
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="metaKeywords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta Keywords</FormLabel>
              <FormControl>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Comma-separated keywords"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-meta-keywords"
                />
              </FormControl>
              <FormDescription>
                Keywords related to this case study (comma-separated)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
