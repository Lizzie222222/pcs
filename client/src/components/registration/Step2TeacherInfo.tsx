import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REFERRAL_SOURCE_OPTIONS } from "@/lib/countryConfig";
import { useAuth } from "@/hooks/useAuth";

export interface Step2Data {
  firstName: string;
  lastName: string;
  email: string;
  teacherRole?: string;
  referralSource?: string;
}

interface Step2TeacherInfoProps {
  initialData?: Partial<Step2Data>;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
}

export default function Step2TeacherInfo({ initialData, onNext, onBack }: Step2TeacherInfoProps) {
  const { t } = useTranslation(['forms', 'common']);
  const { user } = useAuth();

  const schema = z.object({
    firstName: z.string().min(1, t('forms:validation.first_name_required')),
    lastName: z.string().min(1, t('forms:validation.last_name_required')),
    email: z.string().email(t('forms:validation.email_invalid')),
    teacherRole: z.string().optional(),
    referralSource: z.string().optional(),
  });

  const form = useForm<Step2Data>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: initialData?.firstName || user?.firstName || '',
      lastName: initialData?.lastName || user?.lastName || '',
      email: initialData?.email || user?.email || '',
      teacherRole: initialData?.teacherRole || '',
      referralSource: initialData?.referralSource || '',
    },
  });

  const handleSubmit = (data: Step2Data) => {
    onNext(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="form-step2-teacher-info">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-navy" data-testid="text-step2-title">
            About You (Lead Teacher)
          </h3>

          {/* First Name */}
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your first name"
                    {...field}
                    data-testid="input-teacher-first-name"
                  />
                </FormControl>
                <FormMessage data-testid="error-teacher-first-name" />
              </FormItem>
            )}
          />

          {/* Last Name */}
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your last name"
                    {...field}
                    data-testid="input-teacher-last-name"
                  />
                </FormControl>
                <FormMessage data-testid="error-teacher-last-name" />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="your.email@school.edu"
                    {...field}
                    data-testid="input-teacher-email"
                  />
                </FormControl>
                <FormDescription>
                  Personal or professional email address
                </FormDescription>
                <FormMessage data-testid="error-teacher-email" />
              </FormItem>
            )}
          />

          {/* Teacher Role (Optional) */}
          <FormField
            control={form.control}
            name="teacherRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Role at School (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Head of Science, Class Teacher"
                    {...field}
                    data-testid="input-teacher-role"
                  />
                </FormControl>
                <FormMessage data-testid="error-teacher-role" />
              </FormItem>
            )}
          />

          {/* How did you hear about us (Optional) */}
          <FormField
            control={form.control}
            name="referralSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How did you hear about Plastic Clever Schools? (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-referral-source">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {REFERRAL_SOURCE_OPTIONS.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        data-testid={`option-referral-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage data-testid="error-referral-source" />
              </FormItem>
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            data-testid="button-back-step2"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            className="btn-primary flex-1"
            data-testid="button-next-step2"
          >
            Next: Student Info
          </Button>
        </div>
      </form>
    </Form>
  );
}
