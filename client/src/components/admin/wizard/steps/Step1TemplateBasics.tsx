import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateTypeSelector } from "../../case-study-sections/TemplateTypeSelector";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

interface Step1TemplateBasicsProps {
  form: UseFormReturn<any>;
  isEditing: boolean;
}

const PROGRAM_STAGES = [
  { value: "inspire", label: "Inspire", description: "Raising awareness and motivation" },
  { value: "investigate", label: "Investigate", description: "Research and data collection" },
  { value: "act", label: "Act", description: "Taking action and implementing solutions" },
];

export function Step1TemplateBasics({ form, isEditing }: Step1TemplateBasicsProps) {
  // Fetch schools for dropdown
  const { data: schools, isLoading: isLoadingSchools } = useQuery<any[]>({
    queryKey: ['/api/schools'],
  });

  return (
    <div className="space-y-8">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-step1-title">Choose Your Template</CardTitle>
          <CardDescription>
            Select the layout that best showcases your school's story. Each template is optimized for different types of content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateTypeSelector form={form} />
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Essential details about your case study
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* School Selection */}
          <FormField
            control={form.control}
            name="schoolId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School *</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={isEditing || isLoadingSchools}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-school">
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{school.name}</span>
                          {school.country && (
                            <span className="text-muted-foreground text-xs">
                              ({school.country})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {isEditing 
                    ? "School cannot be changed after creation"
                    : "Select the school this case study is about"
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., From Plastic to Progress: How We Reduced Waste by 75%" 
                    {...field} 
                    data-testid="input-title"
                    className="text-lg"
                  />
                </FormControl>
                <FormDescription>
                  A compelling title that captures the essence of your case study (max 200 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{stage.label}</span>
                          <span className="text-xs text-muted-foreground">{stage.description}</span>
                        </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
