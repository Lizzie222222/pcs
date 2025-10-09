import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getCountryConfig } from "@/lib/countryConfig";
import { LoadingSpinner } from "@/components/ui/states";

export interface Step3Data {
  studentCount: number;
  ageRanges: string[];
  showOnMap: boolean;
  gdprConsent: boolean;
  acceptTerms: boolean;
}

interface Step3StudentInfoProps {
  initialData?: Partial<Step3Data>;
  country: string;
  onSubmit: (data: Step3Data) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function Step3StudentInfo({ 
  initialData, 
  country, 
  onSubmit, 
  onBack,
  isSubmitting = false 
}: Step3StudentInfoProps) {
  const { t } = useTranslation(['forms', 'common']);
  const countryConfig = getCountryConfig(country);

  const schema = z.object({
    studentCount: z.number()
      .min(1, 'Please enter at least 1 student')
      .max(10000, 'Maximum 10,000 students allowed'),
    ageRanges: z.array(z.string()).min(1, 'Please select at least one age range'),
    showOnMap: z.boolean().default(false),
    gdprConsent: z.boolean().refine(val => val === true, {
      message: t('forms:school_registration.gdpr_consent_required'),
    }),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: t('forms:school_registration.accept_terms_required'),
    }),
  });

  const form = useForm<Step3Data>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentCount: initialData?.studentCount || undefined,
      ageRanges: initialData?.ageRanges || [],
      showOnMap: initialData?.showOnMap || false,
      gdprConsent: initialData?.gdprConsent || false,
      acceptTerms: initialData?.acceptTerms || false,
    },
  });

  const handleSubmit = (data: Step3Data) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="form-step3-student-info">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-navy" data-testid="text-step3-title">
            About Your Students
          </h3>

          {/* Number of Students */}
          <FormField
            control={form.control}
            name="studentCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Students *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="e.g., 500"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-student-count"
                  />
                </FormControl>
                <FormDescription>
                  Total number of students at your school
                </FormDescription>
                <FormMessage data-testid="error-student-count" />
              </FormItem>
            )}
          />

          {/* Age Ranges/Year Groups */}
          <FormField
            control={form.control}
            name="ageRanges"
            render={() => (
              <FormItem>
                <FormLabel>Age Ranges / Year Groups *</FormLabel>
                <FormDescription>
                  Select all that apply to your school
                </FormDescription>
                <div className="space-y-2 mt-2">
                  {countryConfig.ageRangeOptions.map((option) => (
                    <FormField
                      key={option.value}
                      control={form.control}
                      name="ageRanges"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={option.value}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, option.value])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== option.value
                                        )
                                      );
                                }}
                                data-testid={`checkbox-age-range-${option.value.toLowerCase().replace(/\s+/g, '-')}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage data-testid="error-age-ranges" />
              </FormItem>
            )}
          />

          {/* Show on Map */}
          <FormField
            control={form.control}
            name="showOnMap"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-show-on-map"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t('forms:school_registration.show_on_map')}
                  </FormLabel>
                  <FormDescription>
                    {t('forms:school_registration.show_on_map_description')}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* GDPR Consent */}
          <FormField
            control={form.control}
            name="gdprConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-gdpr-consent"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t('forms:school_registration.gdpr_consent')} *
                  </FormLabel>
                  <FormMessage data-testid="error-gdpr-consent" />
                </div>
              </FormItem>
            )}
          />

          {/* Accept Terms */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-accept-terms"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    {t('forms:school_registration.accept_terms')} *
                  </FormLabel>
                  <FormMessage data-testid="error-accept-terms" />
                </div>
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
            disabled={isSubmitting}
            data-testid="button-back-step3"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            className="btn-primary flex-1"
            disabled={isSubmitting}
            data-testid="button-submit-registration"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating School...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
